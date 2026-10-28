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
import { appendFileSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import type { ChangeBlock } from '../src/luminary/blocks.js';

export const MAX_ALLOWED_FILES = 8;
const CHECK_TIMEOUT_MS = 180_000;
const OUTPUT_TAIL_CHARS = 4_000;
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
  summary: string;
  files: string[];
  diff: string;
  checks: CheckResult[];
  status: TaskStatus;
}

export interface LedgerEntry {
  seq: number;
  at: string;
  event: 'proposed' | 'refused' | 'accepted' | 'declined' | 'merge_failed';
  taskId: string;
  detail: Record<string, unknown>;
  prev: string;
  hash: string;
}

/** A named reason the executor did not do something. Never a fabricated success. */
export class ExecutorShortfall extends Error {
  constructor(readonly code: 'fence' | 'no_change' | 'not_found' | 'not_open' | 'git_error' | 'merge_conflict', message: string) {
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
    const entries = readFileSync(this.ledgerPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as LedgerEntry);
    let prev = '';
    let valid = true;
    for (const entry of entries) {
      const { hash, ...rest } = entry;
      if (entry.prev !== prev || sha256(JSON.stringify(rest)) !== hash) valid = false;
      prev = hash;
    }
    return { entries, valid };
  }

  private record(event: LedgerEntry['event'], taskId: string, detail: Record<string, unknown>): void {
    const { entries } = this.readLedger();
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
    // Every path passed the fence above, so normalizing again cannot leave the worktree.
    const files = change.files.map((file) => ({ path: posix.normalize(file.path.trim().replace(/\\/g, '/')), content: file.content }));
    for (const file of files) {
      const target = join(worktree, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content);
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

    const task: TaskRecord = {
      id, goal, allowedFiles, modelId, branch,
      summary: change.summary,
      files: files.map((file) => file.path),
      diff: tail(diff),
      checks,
      status: 'proposed',
    };
    this.tasks.set(id, task);
    this.record('proposed', id, { goal, modelId, branch, summary: task.summary, files: task.files, checks: checks.map(({ name, ok }) => ({ name, ok })) });
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

  /** The Architect's accept: merge the Luminary's branch into the current branch. */
  async accept(id: string): Promise<TaskRecord> {
    const task = this.open(id);
    const merge = await run('git', [...LUMINARY_AUTHOR, 'merge', '--no-ff', '-m', `Merge ${task.branch}: accepted by the Architect`, task.branch], this.options.repoRoot, 60_000);
    if (merge.code !== 0) {
      await run('git', ['merge', '--abort'], this.options.repoRoot, 60_000);
      this.record('merge_failed', id, { branch: task.branch, output: tail(merge.output) });
      throw new ExecutorShortfall('merge_conflict', `The change could not be merged and nothing was changed: ${tail(merge.output).trim()}`);
    }
    task.status = 'accepted';
    this.record('accepted', id, { branch: task.branch, by: 'architect' });
    await this.removeWorktree(id);
    return task;
  }

  /** The Architect's decline: nothing joins the project; the branch is kept unmerged for the record. */
  async decline(id: string): Promise<TaskRecord> {
    const task = this.open(id);
    task.status = 'declined';
    this.record('declined', id, { branch: task.branch, by: 'architect' });
    await this.removeWorktree(id);
    return task;
  }
}
