// The Luminary's code-production executor (STP-0002 P19, N24, N25). The Luminary writes code; this
// executor holds the fence and the record, and the Architect holds the merge:
//
//   assign task -> Luminary reply with a luminary-change block -> fence check -> own working branch
//   -> checks -> plain summary + diff -> Architect accepts (merge) or declines (branch kept, unmerged)
//
// The only authorities are the Architect's accept and the append-only ledger. The fence, the checks
// and the summary are evidence for that decision, never authority of their own. The fence: writes go
// only to a fresh `luminary/<id>` branch in its own worktree, only to files the task allows, never to
// settings, keys, Git internals or dependencies. The checks are type checks only: they read the code
// and do not run it, so nothing the Luminary wrote is executed on the Architect's computer.
//
// Off unless LUMINARY_EXECUTOR=on, and its routes answer only on the loopback interface.

import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, isAbsolute } from 'node:path';
import type { ChangeBlock } from '../src/luminary/blocks.js';

export const MAX_ALLOWED_FILES = 8;
const CHECK_TIMEOUT_MS = 180_000;
const OUTPUT_TAIL_CHARS = 4_000;
/** The most diff the Architect is shown whole. A larger change cannot be accepted, because it cannot be reviewed whole. */
export const MAX_REVIEW_DIFF_CHARS = 1_000_000;
const LUMINARY_AUTHOR = ['-c', 'user.name=Vibe Luminary', '-c', 'user.email=luminary@vibe-architect.local'];

/** Paths the fence never lets the Luminary write, whatever the task allows. */
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /(^|\/)\.env(\.|$)/i, reason: 'settings files hold keys' },
  { pattern: /(^|\/)\.git(\/|$)/, reason: 'Git internals' },
  { pattern: /(^|\/)\.luminary(\/|$)/, reason: 'the Luminary\'s own ledger and worktrees' },
  { pattern: /(^|\/)\.aegis(\/|$)/, reason: 'the append-only governance records' },
  { pattern: /(^|\/)totems(\/|$)/i, reason: 'the append-only Totems' },
  { pattern: /(^|\/)node_modules(\/|$)/, reason: 'installed dependencies' },
  { pattern: /(^|\/)package(-lock)?\.json$/, reason: 'dependencies are the Architect\'s decision' },
  { pattern: /\.(pem|key|p12|pfx|crt)$/i, reason: 'key and certificate files' },
];

/** Normalize a task path, or say why the fence refuses it. */
export function checkFencePath(raw: string): { ok: true; path: string } | { ok: false; reason: string } {
  const trimmed = raw.trim().replace(/\\/g, '/');
  if (!trimmed) return { ok: false, reason: 'an empty path' };
  if (trimmed.startsWith('/') || /^[A-Za-z]:/.test(trimmed)) return { ok: false, reason: `${raw} is not inside the project` };
  const path = posix.normalize(trimmed);
  if (path === '.' || path.startsWith('../') || path === '..') return { ok: false, reason: `${raw} is not inside the project` };
  for (const { pattern, reason } of FORBIDDEN) {
    if (pattern.test(path)) return { ok: false, reason: `${path} is outside the fence (${reason})` };
  }
  return { ok: true, path };
}

/** True when `target` resolves inside `root` (both already real paths). */
const within = (root: string, target: string) => {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

/**
 * Refuse a write whose path, or any folder on the way to it, is a symbolic link, and confirm the
 * folder it lands in really is inside the worktree. The text check in checkFencePath cannot see links.
 */
export function checkWriteTarget(worktree: string, path: string): { ok: true; target: string } | { ok: false; reason: string } {
  const parts = path.split('/');
  let current = worktree;
  for (const part of parts) {
    current = join(current, part);
    let isLink = false;
    try {
      isLink = lstatSync(current).isSymbolicLink();
    } catch {
      break; // Nothing exists from here down, so nothing below can be a link yet.
    }
    if (isLink) return { ok: false, reason: `${path} passes through a link (${relative(worktree, current).replace(/\\/g, '/')}), which could lead outside the project` };
  }
  return { ok: true, target: join(worktree, path) };
}

export interface CheckResult {
  name: string;
  ok: boolean;
  /** The tail of the check's output, for the Technical view. */
  output: string;
}

export type TaskStatus = 'proposed' | 'accepted' | 'declined';

export interface TaskRecord {
  id: string;
  goal: string;
  allowedFiles: string[];
  modelId: string;
  branch: string;
  /** The exact commit the Architect reviews; only this commit can be merged. */
  commit: string;
  summary: string;
  files: string[];
  /** The whole change, exactly as it would join the project. */
  diff: string;
  /** False only when the change is too large to show whole; such a change cannot be accepted. */
  diffComplete: boolean;
  checks: CheckResult[];
  status: TaskStatus;
}

export interface LedgerEntry {
  seq: number;
  at: string;
  event: 'proposed' | 'refused' | 'approved' | 'accepted' | 'declined' | 'merge_failed';
  taskId: string;
  detail: Record<string, unknown>;
  prev: string;
  hash: string;
}

/** A named reason the executor did not do something. Never a fabricated success. */
export class ExecutorShortfall extends Error {
  constructor(readonly code: 'fence' | 'no_change' | 'not_found' | 'not_open' | 'git_error' | 'merge_conflict' | 'ledger_invalid' | 'ledger_error' | 'review_incomplete', message: string) {
    super(message);
    this.name = 'ExecutorShortfall';
  }
}

export interface ExecutorCheck {
  name: string;
  command: string;
  args: string[];
}

/** Type checks only: they read the code and never execute it. */
export const DEFAULT_CHECKS: ExecutorCheck[] = [
  { name: 'Type check (app)', command: process.execPath, args: ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.json'] },
  { name: 'Type check (gateway)', command: process.execPath, args: ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.server.json'] },
];

export interface ExecutorOptions {
  repoRoot: string;
  checks?: ExecutorCheck[];
  now?: () => Date;
}

function run(command: string, args: string[], cwd: string, timeout = CHECK_TIMEOUT_MS): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      const output = `${stdout ?? ''}${stderr ?? ''}`;
      const code = error ? (typeof (error as { code?: unknown }).code === 'number' ? (error as { code: number }).code : 1) : 0;
      resolve({ code, output });
    });
  });
}

const tail = (text: string) => (text.length > OUTPUT_TAIL_CHARS ? `...${text.slice(-OUTPUT_TAIL_CHARS)}` : text);

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

export class LuminaryExecutor {
  readonly ledgerPath: string;
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly checks: ExecutorCheck[];
  private readonly now: () => Date;

  constructor(private readonly options: ExecutorOptions) {
    this.ledgerPath = join(options.repoRoot, '.luminary', 'ledger.jsonl');
    this.checks = options.checks ?? DEFAULT_CHECKS;
    this.now = options.now ?? (() => new Date());
  }

  /** Validate a task's allowed files against the fence. */
  static fenceTask(allowedFiles: unknown): string[] {
    if (!Array.isArray(allowedFiles) || allowedFiles.length === 0) throw new ExecutorShortfall('fence', 'A coding task needs at least one allowed file.');
    if (allowedFiles.length > MAX_ALLOWED_FILES) throw new ExecutorShortfall('fence', `A coding task may allow at most ${MAX_ALLOWED_FILES} files.`);
    const paths: string[] = [];
    for (const raw of allowedFiles) {
      if (typeof raw !== 'string') throw new ExecutorShortfall('fence', 'An allowed file is not a path.');
      const checked = checkFencePath(raw);
      if (!checked.ok) throw new ExecutorShortfall('fence', `The fence refuses ${checked.reason}.`);
      paths.push(checked.path);
    }
    return [...new Set(paths)];
  }

  get(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  /** The ledger, read back and chain-checked. */
  readLedger(): { entries: LedgerEntry[]; valid: boolean } {
    if (!existsSync(this.ledgerPath)) return { entries: [], valid: true };
    let entries: LedgerEntry[];
    try {
      entries = readFileSync(this.ledgerPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as LedgerEntry);
    } catch {
      return { entries: [], valid: false };
    }
    let prev = '';
    let valid = true;
    for (const entry of entries) {
      const { hash, ...rest } = entry;
      if (entry.prev !== prev || sha256(JSON.stringify(rest)) !== hash) valid = false;
      prev = hash;
    }
    return { entries, valid };
  }

  /** Append to the ledger. A broken chain is never extended: the executor stops until it is looked at. */
  private record(event: LedgerEntry['event'], taskId: string, detail: Record<string, unknown>): void {
    const { entries, valid } = this.readLedger();
    if (!valid) throw new ExecutorShortfall('ledger_invalid', 'The Luminary\'s ledger did not verify, so nothing more was done or recorded. It needs looking at before any change can be proposed or accepted.');
    const last = entries.at(-1);
    const rest = { seq: (last?.seq ?? 0) + 1, at: this.now().toISOString(), event, taskId, detail, prev: last?.hash ?? '' };
    const entry: LedgerEntry = { ...rest, hash: sha256(JSON.stringify(rest)) };
    mkdirSync(dirname(this.ledgerPath), { recursive: true });
    appendFileSync(this.ledgerPath, `${JSON.stringify(entry)}\n`);
  }

  private async git(args: string[], cwd = this.options.repoRoot): Promise<string> {
    const result = await run('git', args, cwd, 60_000);
    if (result.code !== 0) throw new ExecutorShortfall('git_error', `git ${args[0]} failed: ${tail(result.output).trim()}`);
    return result.output;
  }

  /**
   * Put the Luminary's proposed change on its own new branch, run the checks, and return the
   * evidence. Nothing joins the project here.
   */
  async propose(input: { goal: string; allowedFiles: string[]; modelId: string; change: ChangeBlock | string }): Promise<TaskRecord> {
    const id = randomUUID().slice(0, 8);
    const { goal, allowedFiles, modelId, change } = input;
    if (typeof change === 'string') {
      this.record('refused', id, { goal, modelId, reason: change });
      throw new ExecutorShortfall('no_change', change);
    }
    for (const file of change.files) {
      const checked = checkFencePath(file.path);
      const reason = !checked.ok ? checked.reason : allowedFiles.includes(checked.path) ? null : `${checked.path} is not one of the task's allowed files`;
      if (reason) {
        this.record('refused', id, { goal, modelId, reason });
        throw new ExecutorShortfall('fence', `The fence refused the change: ${reason}.`);
      }
    }

    const branch = `luminary/${id}`;
    const worktree = join(this.options.repoRoot, '.luminary', 'worktrees', id);
    await this.git(['worktree', 'add', '-b', branch, worktree, 'HEAD']);
    // Every path passed the text fence above; checkWriteTarget also refuses links on the way in.
    const files = change.files.map((file) => ({ path: posix.normalize(file.path.trim().replace(/\\/g, '/')), content: file.content }));
    try {
      const realWorktree = realpathSync(worktree);
      for (const file of files) {
        const checked = checkWriteTarget(worktree, file.path);
        if (!checked.ok) throw new ExecutorShortfall('fence', `The fence refused the change: ${checked.reason}.`);
        mkdirSync(dirname(checked.target), { recursive: true });
        if (!within(realWorktree, realpathSync(dirname(checked.target)))) throw new ExecutorShortfall('fence', `The fence refused the change: ${file.path} would land outside the project.`);
        writeFileSync(checked.target, file.content);
      }
    } catch (error) {
      await this.discard(id, branch);
      if (error instanceof ExecutorShortfall && error.code === 'fence') this.record('refused', id, { goal, modelId, reason: error.message });
      throw error;
    }
    await this.git(['add', '--', ...files.map((file) => file.path)], worktree);
    await this.git([...LUMINARY_AUTHOR, 'commit', '--allow-empty', '-m', `Luminary: ${change.summary}`, '-m', `Task: ${goal}\nModel: ${modelId}\nNot merged: awaits the Architect's accept.`], worktree);
    const diff = await this.git(['diff', 'HEAD~1', 'HEAD'], worktree);

    // The worktree has no dependencies of its own; it borrows the project's, read-only in practice.
    const modules = join(this.options.repoRoot, 'node_modules');
    if (existsSync(modules) && !existsSync(join(worktree, 'node_modules'))) symlinkSync(modules, join(worktree, 'node_modules'), 'junction');
    const checks: CheckResult[] = [];
    for (const check of this.checks) {
      const result = await run(check.command, check.args, worktree);
      checks.push({ name: check.name, ok: result.code === 0, output: tail(result.output) });
    }

    const commit = (await this.git(['rev-parse', 'HEAD'], worktree)).trim();
    const task: TaskRecord = {
      id, goal, allowedFiles, modelId, branch, commit,
      summary: change.summary,
      files: files.map((file) => file.path),
      diff: diff.length > MAX_REVIEW_DIFF_CHARS ? diff.slice(0, MAX_REVIEW_DIFF_CHARS) : diff,
      diffComplete: diff.length <= MAX_REVIEW_DIFF_CHARS,
      checks,
      status: 'proposed',
    };
    this.record('proposed', id, { goal, modelId, branch, commit, diffSha256: sha256(diff), diffComplete: task.diffComplete, summary: task.summary, files: task.files, checks: checks.map(({ name, ok }) => ({ name, ok })) });
    // Only a recorded proposal can be accepted.
    this.tasks.set(id, task);
    return task;
  }

  private open(id: string): TaskRecord {
    const task = this.tasks.get(id);
    if (!task) throw new ExecutorShortfall('not_found', 'No such coding task in this session.');
    if (task.status !== 'proposed') throw new ExecutorShortfall('not_open', `This task is already ${task.status}.`);
    return task;
  }

  private async removeWorktree(id: string): Promise<void> {
    const worktree = join(this.options.repoRoot, '.luminary', 'worktrees', id);
    if (existsSync(worktree)) await this.git(['worktree', 'remove', '--force', worktree]);
  }

  /** Undo a refused proposal: its worktree and branch go, so nothing half-written is left behind. */
  private async discard(id: string, branch: string): Promise<void> {
    await this.removeWorktree(id).catch(() => undefined);
    await run('git', ['branch', '-D', branch], this.options.repoRoot, 60_000);
  }

  /**
   * The Architect's accept. The approval is written to the ledger first, so no change can join the
   * project without a durable record of who approved it; only then is the branch merged, and the
   * outcome recorded after. A broken ledger, or a change too large to have been shown whole, stops it.
   */
  async accept(id: string): Promise<TaskRecord> {
    const task = this.open(id);
    if (!task.diffComplete) throw new ExecutorShortfall('review_incomplete', 'This change is too large to show whole, so it cannot be accepted. Ask for it in smaller parts.');
    const { commit } = task;
    if ((await this.git(['rev-parse', task.branch])).trim() !== commit) throw new ExecutorShortfall('review_incomplete', 'The Luminary\'s branch changed after you reviewed it, so it was not merged.');
    this.record('approved', id, { branch: task.branch, commit, by: 'architect' });
    const merge = await run('git', [...LUMINARY_AUTHOR, 'merge', '--no-ff', '-m', `Merge ${task.branch}: accepted by the Architect`, commit], this.options.repoRoot, 60_000);
    if (merge.code !== 0) {
      await run('git', ['merge', '--abort'], this.options.repoRoot, 60_000);
      try {
        this.record('merge_failed', id, { branch: task.branch, output: tail(merge.output) });
      } catch {
        // The approval is already recorded; the missing outcome is named in the message below.
      }
      throw new ExecutorShortfall('merge_conflict', `The change could not be merged and nothing was changed: ${tail(merge.output).trim()}`);
    }
    task.status = 'accepted';
    const mergeCommit = (await this.git(['rev-parse', 'HEAD'])).trim();
    try {
      this.record('accepted', id, { branch: task.branch, commit, mergeCommit, by: 'architect' });
    } catch (error) {
      throw new ExecutorShortfall('ledger_error', `The change was merged as ${mergeCommit.slice(0, 12)} and your approval is in the ledger, but the outcome could not be recorded: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    await this.removeWorktree(id);
    return task;
  }

  /** The Architect's decline: nothing joins the project; the branch is kept unmerged for the record. */
  async decline(id: string): Promise<TaskRecord> {
    const task = this.open(id);
    this.record('declined', id, { branch: task.branch, commit: task.commit, by: 'architect' });
    task.status = 'declined';
    await this.removeWorktree(id);
    return task;
  }
}
