import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ExecutorShortfall, LuminaryExecutor, MAX_REVIEW_DIFF_CHARS, checkFencePath, type ExecutorCheck } from './luminary-executor.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' });

function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'luminary-exec-'));
  dirs.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'README.md'), 'start\n');
  writeFileSync(join(dir, '.gitignore'), '/.luminary/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'start');
  return dir;
}

// A check that passes without running anything the Luminary wrote.
const passing: ExecutorCheck[] = [{ name: 'Type check (fake)', command: process.execPath, args: ['-e', 'process.exit(0)'] }];
const failing: ExecutorCheck[] = [{ name: 'Type check (fake)', command: process.execPath, args: ['-e', 'console.log("TS2322: nope"); process.exit(2)'] }];

const change = (path: string, content = 'hello\n') => ({ summary: 'Add a note', files: [{ path, content }] });

test('the fence refuses settings, keys, Git internals, records, dependencies and paths outside the project', () => {
  for (const path of ['.env', 'config/.env.local', '.git/config', '.aegis/stp/x.md', 'totems/T.md', 'node_modules/a.js', 'package.json', 'certs/a.pem', '../outside.ts', '/etc/passwd', 'C:/x.ts', 'a/../../b.ts']) {
    assert.equal(checkFencePath(path).ok, false, path);
  }
  assert.deepEqual(checkFencePath('src\\luminary\\x.ts'), { ok: true, path: 'src/luminary/x.ts' });
});

test('a proposed change lands only on the Luminary\'s branch, with checks and a diff; main is untouched', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  const task = await executor.propose({ goal: 'Add a note', allowedFiles: ['docs/note.md'], modelId: 'rehearsal-stand-in', change: change('docs/note.md') });
  assert.equal(task.status, 'proposed');
  assert.match(task.branch, /^luminary\/[0-9a-f]{8}$/);
  assert.deepEqual(task.checks.map(({ name, ok }) => ({ name, ok })), [{ name: 'Type check (fake)', ok: true }]);
  assert.match(task.diff, /\+hello/);
  assert.equal(existsSync(join(dir, 'docs/note.md')), false, 'nothing joins the project before accept');
  assert.equal(git(dir, 'branch', '--show-current').trim(), 'main');
});

test('accept merges the branch; the ledger records proposed then accepted and its chain holds', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  const task = await executor.propose({ goal: 'Add a note', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('docs/note.md') });
  await executor.accept(task.id);
  assert.equal(readFileSync(join(dir, 'docs/note.md'), 'utf8'), 'hello\n');
  const ledger = executor.readLedger();
  assert.equal(ledger.valid, true);
  assert.deepEqual(ledger.entries.map((entry) => entry.event), ['proposed', 'approved', 'accepted']);
  assert.equal(ledger.entries[1].detail.commit, task.commit, 'the approval names the exact commit reviewed');
  await assert.rejects(executor.accept(task.id), (error: unknown) => error instanceof ExecutorShortfall && error.code === 'not_open');
});

test('decline leaves the project unchanged and keeps the branch unmerged for the record', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: failing });
  const task = await executor.propose({ goal: 'Add a note', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('docs/note.md') });
  assert.equal(task.checks[0].ok, false);
  assert.match(task.checks[0].output, /TS2322/);
  await executor.decline(task.id);
  assert.equal(existsSync(join(dir, 'docs/note.md')), false);
  assert.match(git(dir, 'branch', '--list', task.branch), /luminary\//);
  assert.deepEqual(executor.readLedger().entries.map((entry) => entry.event), ['proposed', 'declined']);
});

test('a change outside the allowed files is refused and recorded, and no branch is made', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  await assert.rejects(
    executor.propose({ goal: 'x', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('src/other.ts') }),
    (error: unknown) => error instanceof ExecutorShortfall && error.code === 'fence',
  );
  assert.equal(git(dir, 'branch', '--list', 'luminary/*').trim(), '');
  assert.deepEqual(executor.readLedger().entries.map((entry) => entry.event), ['refused']);
});

test('a task cannot allow a fenced path', () => {
  assert.throws(() => LuminaryExecutor.fenceTask(['.env']), (error: unknown) => error instanceof ExecutorShortfall && error.code === 'fence');
  assert.throws(() => LuminaryExecutor.fenceTask([]), ExecutorShortfall);
});

test('a tampered ledger reads as invalid', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  await executor.propose({ goal: 'x', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('docs/note.md') });
  writeFileSync(executor.ledgerPath, readFileSync(executor.ledgerPath, 'utf8').replace('"proposed"', '"accepted"'));
  assert.equal(executor.readLedger().valid, false);
});

test('a write through a linked folder is refused, nothing lands outside, and the branch is discarded', async () => {
  const dir = repo();
  const outside = mkdtempSync(join(tmpdir(), 'luminary-outside-'));
  dirs.push(outside);
  symlinkSync(outside, join(dir, 'linked'), 'dir');
  git(dir, 'add', 'linked');
  git(dir, 'commit', '-q', '-m', 'a committed link');
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  await assert.rejects(
    executor.propose({ goal: 'x', allowedFiles: ['linked/escape.txt'], modelId: 'm', change: change('linked/escape.txt') }),
    (error: unknown) => error instanceof ExecutorShortfall && error.code === 'fence' && /link/.test(error.message),
  );
  assert.equal(existsSync(join(outside, 'escape.txt')), false, 'nothing was written outside the project');
  assert.equal(git(dir, 'branch', '--list', 'luminary/*').trim(), '');
  assert.deepEqual(executor.readLedger().entries.map((entry) => entry.event), ['refused']);
});

test('a link as the file itself is refused too', async () => {
  const dir = repo();
  const outside = mkdtempSync(join(tmpdir(), 'luminary-outside-'));
  dirs.push(outside);
  writeFileSync(join(outside, 'target.txt'), 'untouched\n');
  mkdirSync(join(dir, 'docs'));
  symlinkSync(join(outside, 'target.txt'), join(dir, 'docs', 'note.md'));
  git(dir, 'add', 'docs');
  git(dir, 'commit', '-q', '-m', 'a committed file link');
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  await assert.rejects(executor.propose({ goal: 'x', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('docs/note.md') }), ExecutorShortfall);
  assert.equal(readFileSync(join(outside, 'target.txt'), 'utf8'), 'untouched\n');
});

test('a broken ledger stops accept before anything is merged', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  const task = await executor.propose({ goal: 'x', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('docs/note.md') });
  writeFileSync(executor.ledgerPath, readFileSync(executor.ledgerPath, 'utf8').replace('"proposed"', '"accepted"'));
  await assert.rejects(executor.accept(task.id), (error: unknown) => error instanceof ExecutorShortfall && error.code === 'ledger_invalid');
  assert.equal(existsSync(join(dir, 'docs/note.md')), false, 'no merge without a durable approval record');
  assert.equal(task.status, 'proposed');
});

test('an unreadable ledger reads as invalid and blocks new proposals', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  mkdirSync(join(dir, '.luminary'), { recursive: true });
  writeFileSync(executor.ledgerPath, '{not json\n');
  assert.equal(executor.readLedger().valid, false);
  await assert.rejects(
    executor.propose({ goal: 'x', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('docs/note.md') }),
    (error: unknown) => error instanceof ExecutorShortfall && error.code === 'ledger_invalid',
  );
});

test('the whole diff is kept for review, and a change too large to show whole cannot be accepted', async () => {
  const dir = repo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: passing });
  const content = Array.from({ length: 2_000 }, (_, i) => `line ${i}`).join('\n');
  const task = await executor.propose({ goal: 'x', allowedFiles: ['docs/note.md'], modelId: 'm', change: change('docs/note.md', content) });
  assert.equal(task.diffComplete, true);
  assert.match(task.diff, /\+line 0\n/, 'the start of the change is shown');
  assert.match(task.diff, /\+line 1999/, 'and the end');

  const huge = 'x'.repeat(MAX_REVIEW_DIFF_CHARS + 10);
  const big = await executor.propose({ goal: 'y', allowedFiles: ['docs/big.md'], modelId: 'm', change: change('docs/big.md', huge) });
  assert.equal(big.diffComplete, false);
  await assert.rejects(executor.accept(big.id), (error: unknown) => error instanceof ExecutorShortfall && error.code === 'review_incomplete');
  assert.equal(existsSync(join(dir, 'docs/big.md')), false);
});
