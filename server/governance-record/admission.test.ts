import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, appendFile, readFile, mkdir, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AdmissionStore, submissionDigest } from './admission.js';
import { AdmissionError, type Submission } from './admission-types.js';
import { AppendOnlyLog } from './log.js';

const initial = (submissionKey = 'one'): Submission => ({ scope: 'workspace/a', direction: 'architect-to-luminary', submissionKey, content: 'original' });
const code = (expected: string) => (e: unknown) => e instanceof AdmissionError && e.code === expected;
async function fixture(t: { after: (fn: () => Promise<void>) => void }, options: Parameters<typeof AdmissionStore.open>[1] = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'aegis-admission-'));
  const store = await AdmissionStore.open(dir, options);
  t.after(async () => { await store.close(); await rm(dir, { recursive: true, force: true }); });
  return { dir, store };
}
async function first(store: AdmissionStore) {
  const r = await store.registerSubmission(initial());
  const s = await store.admitSubmission('workspace/a', 'architect-to-luminary', 'one');
  return { r, s };
}
function replacement(r: { exchangeId: string; attemptId: string }, key: string): Submission {
  return { ...initial(key), content: key, exchangeId: r.exchangeId, expectedHead: r.attemptId, revisesAttemptId: r.attemptId };
}

test('initial + two replacements, passing last candidate, reopening cannot refund allowance', async t => {
  const { store, dir } = await fixture(t); let { r } = await first(store);
  for (let ordinal = 1; ordinal <= 2; ordinal++) {
    await store.closeProcessing(r.attemptId, { kind: 'returned', receipt: `receipt/${ordinal}` });
    const next = replacement(r, `replacement${ordinal}`);
    r = await store.registerSubmission(next);
    assert.equal((await store.admitSubmission(next.scope, next.direction, next.submissionKey)).ordinal, ordinal);
  }
  await store.closeProcessing(r.attemptId, { kind: 'completed' });
  await assert.rejects(store.registerSubmission(replacement(r, 'third')), code('exhausted'));
  await store.close();
  const reopened = await AdmissionStore.open(dir);
  try {
    assert.equal((await reopened.getExchange(r.exchangeId)).admitted, 3);
    await assert.rejects(reopened.registerSubmission(replacement(r, 'resubmit')), code('exhausted'));
  } finally { await reopened.close(); }
});

test('simultaneous identical submissions allocate one exchange and one admission', async t => {
  const { store } = await fixture(t);
  const rs = await Promise.all(Array.from({ length: 10 }, () => store.registerSubmission(initial())));
  assert.equal(new Set(rs.map(r => r.exchangeId)).size, 1);
  const ss = await Promise.all(rs.map(() => store.admitSubmission('workspace/a', 'architect-to-luminary', 'one')));
  assert.equal(new Set(ss.map(s => s.registration.attemptId)).size, 1);
  assert.equal(ss.filter(s => s.admission === 'new').length, 1);
  assert.equal(ss.filter(s => s.admission === 'existing').length, 9);
  assert.equal((await store.getExchange(rs[0].exchangeId)).admitted, 1);
});

test('sibling submissions cannot both reserve the current head; old parent is stale', async t => {
  const { store } = await fixture(t); const { r } = await first(store);
  await store.closeProcessing(r.attemptId, { kind: 'returned', receipt: 'received' });
  const outcomes = await Promise.allSettled(['a', 'b'].map(k => store.registerSubmission(replacement(r, k))));
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  const winner = outcomes.find(x => x.status === 'fulfilled')! as PromiseFulfilledResult<Awaited<ReturnType<typeof store.registerSubmission>>>;
  await store.admitSubmission('workspace/a', 'architect-to-luminary', winner.value.request.submissionKey);
  await store.closeProcessing(winner.value.attemptId, { kind: 'returned', receipt: 'received2' });
  await assert.rejects(store.registerSubmission(replacement(r, 'old-parent')), code('stale-head'));
});

test('payload is exact, immutable, and conflicting keys never overwrite original', async t => {
  const { store } = await fixture(t); const request = initial();
  const pending = store.registerSubmission(request); request.content = 'mutated';
  const r = await pending; assert.equal(r.request.content, 'original');
  r.request.content = 'mutated return';
  assert.equal((await store.lookupSubmission('workspace/a', request.direction, 'one')).registration.request.content, 'original');
  await assert.rejects(store.registerSubmission({ ...initial(), content: 'original ' }), code('conflict'));
  assert.notEqual(submissionDigest(initial()), submissionDigest({ ...initial(), content: 'original ' }));
  await assert.rejects(store.registerSubmission({ ...initial('bad'), extra: true } as Submission), code('invalid'));
});

test('no concurrent processing; a post-admission shortfall retains consumption and stays closed', async t => {
  const { store } = await fixture(t); const { r } = await first(store);
  await assert.rejects(store.registerSubmission(replacement(r, 'too-early')), code('processing-required'));
  await store.closeProcessing(r.attemptId, { kind: 'shortfall' });
  assert.equal((await store.getExchange(r.exchangeId)).admitted, 1);
  await assert.rejects(store.registerSubmission(replacement(r, 'after-error')), code('processing-required'));
  await assert.rejects(store.closeProcessing(r.attemptId, { kind: 'returned', receipt: 'fake-reset' }), code('conflict'));
});

test('directions and trusted scopes have independent key spaces and cannot cross-link', async t => {
  const { store } = await fixture(t); const { r } = await first(store);
  const other = await store.registerSubmission({ ...initial(), direction: 'luminary-to-architect' });
  assert.notEqual(other.exchangeId, r.exchangeId);
  assert.equal((await store.admitSubmission('workspace/a', 'luminary-to-architect', 'one')).ordinal, 0);
  const third = await store.registerSubmission({ ...initial(), scope: 'workspace/b' });
  assert.notEqual(third.exchangeId, r.exchangeId);
  await store.closeProcessing(r.attemptId, { kind: 'returned', receipt: 'r' });
  await assert.rejects(store.registerSubmission({ ...replacement(r, 'cross'), scope: 'workspace/b' }), code('conflict'));
});

test('second writer is refused; a leftover crash lock is never stolen', async t => {
  const { dir, store } = await fixture(t);
  await assert.rejects(AdmissionStore.open(dir), { code: 'EEXIST' });
  await store.close();
  await mkdir(join(dir, '.admission-writer'));
  await assert.rejects(AdmissionStore.open(dir), { code: 'EEXIST' });
});

test('restart with registration only requires reconciliation, not speculative admission', async t => {
  const { dir, store } = await fixture(t); const r = await store.registerSubmission(initial());
  await store.close(); const next = await AdmissionStore.open(dir);
  try {
    await assert.rejects(next.admitSubmission('workspace/a', 'architect-to-luminary', 'one'), code('processing-required'));
    assert.equal((await next.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one'))?.state, 'not-admitted');
    assert.equal((await next.getExchange(r.exchangeId)).admitted, 0);
  } finally { await next.close(); }
});

test('restart after admission retains busy state and same attempt, without replay', async t => {
  const { dir, store } = await fixture(t); const { r } = await first(store);
  await store.close(); const next = await AdmissionStore.open(dir);
  try {
    const s = await next.admitSubmission('workspace/a', 'architect-to-luminary', 'one');
    assert.equal(s.registration.attemptId, r.attemptId);
    assert.equal((await next.getExchange(r.exchangeId)).canReplace, false);
  } finally { await next.close(); }
});

for (const phase of ['after-write', 'after-sync'] as const) {
  test(`uncertain admission ${phase} closes all writes until same-key reconciliation`, async t => {
    let fail = false;
    const { store } = await fixture(t, { writeHook: (p, path) => {
      if (fail && p === phase && path.includes('segment-')) { fail = false; throw new Error('lost acknowledgment'); }
    } });
    const r = await store.registerSubmission(initial()); fail = true;
    await assert.rejects(store.admitSubmission('workspace/a', 'architect-to-luminary', 'one'), code('persistence-unresolved'));
    await assert.rejects(store.registerSubmission(initial('another')), code('persistence-unresolved'));
    const s = await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one');
    assert.equal(s?.ordinal, 0); assert.equal(s?.registration.attemptId, r.attemptId);
    assert.equal((await store.getExchange(r.exchangeId)).admitted, 1);
  });
}

test('uncertain registration also freezes and resolves without consumption', async t => {
  let fail = true;
  const { store } = await fixture(t, { writeHook: (phase, path) => {
    if (fail && phase === 'after-sync' && path.includes('segment-')) { fail = false; throw new Error('registration receipt lost'); }
  } });
  await assert.rejects(store.registerSubmission(initial()), code('persistence-unresolved'));
  const s = await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one');
  assert.equal(s?.state, 'not-admitted');
  assert.equal((await store.getExchange(s!.registration.exchangeId)).admitted, 0);
});

test('failure before admission write preserves count and records non-admission', async t => {
  let fail = false;
  const { store } = await fixture(t, { writeHook: (phase, path) => {
    if (fail && phase === 'before-write' && path.includes('segment-')) { fail = false; throw new Error('write denied'); }
  } });
  const r = await store.registerSubmission(initial()); fail = true;
  await assert.rejects(store.admitSubmission('workspace/a', 'architect-to-luminary', 'one'), code('persistence-unresolved'));
  assert.equal((await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one'))?.state, 'not-admitted');
  assert.equal((await store.getExchange(r.exchangeId)).admitted, 0);
});

test('partial line is preserved, reconciliation bounded, and no speculative writes follow', async t => {
  let fail = false;
  const { store, dir } = await fixture(t, { writeHook: async (phase, path) => {
    if (fail && phase === 'before-write' && path.includes('segment-')) {
      fail = false; await appendFile(path, '{partial'); throw new Error('partial write');
    }
  } });
  await store.registerSubmission(initial()); fail = true;
  await assert.rejects(store.admitSubmission('workspace/a', 'architect-to-luminary', 'one'));
  const file = join(dir, 'segment-000001.jsonl'); const before = await readFile(file);
  for (let i = 0; i < 3; i++) await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one'), code('persistence-unresolved'));
  assert.deepEqual(await readFile(file), before);
  await assert.rejects(store.registerSubmission(initial('new')), code('persistence-unresolved'));
});

test('legacy log is refused unchanged; storage service never rewrites it', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'aegis-legacy-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const log = await AppendOnlyLog.open(dir); await log.append({ kind: 'architect_message', loop: 0 });
  const before = await readFile(join(dir, 'segment-000001.jsonl'));
  await assert.rejects(AdmissionStore.open(dir));
  assert.deepEqual(await readFile(join(dir, 'segment-000001.jsonl')), before);
});


test('reconciliation deadline does not release writer queue or allow speculative writes', async t => {
  let delay = false;
  let release!: () => void;
  const heldWrite = new Promise<void>(resolve => { release = resolve; });
  const { store } = await fixture(t, { reconciliationTimeoutMs: 2000, writeHook: async (phase, path) => {
    if (delay && phase === 'after-sync' && path.includes('segment-')) {
      delay = false; await heldWrite;
    }
  } });
  await first(store); await store.registerSubmission(initial('other')); delay = true;
  await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one'), code('persistence-unresolved'));
  release();
  await assert.rejects(store.registerSubmission(initial('after-timeout')), code('persistence-unresolved'));
  await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'absent'), code('persistence-unresolved'));
  await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'other'), code('persistence-unresolved'));
  const other = await store.registerSubmission(initial('other')).catch(() => null);
  assert.equal(other, null, 'the frozen store cannot create a new unrelated key');
  assert.equal((await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one'))?.ordinal, 0);
});

test('actual process restart: crashed writer lock requires explicit recovery and admission survives', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'aegis-process-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const moduleUrl = new URL('./admission.ts', import.meta.url).href;
  const script = `import { AdmissionStore } from ${JSON.stringify(moduleUrl)};
    const s = await AdmissionStore.open(process.argv[1]);
    await s.registerSubmission({scope:'workspace/a',direction:'architect-to-luminary',submissionKey:'one',content:'original'});
    await s.admitSubmission('workspace/a','architect-to-luminary','one');
    process.exit(0);`;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, dir], { encoding: 'utf8', timeout: 15000 });
  assert.equal(child.status, 0, child.stderr);
  await assert.rejects(AdmissionStore.open(dir), { code: 'EEXIST' });
  // Test operator has observed child exit; no automatic production lock takeover.
  await rmdir(join(dir, '.admission-writer'));
  const reopened = await AdmissionStore.open(dir);
  try {
    const entry = await reopened.lookupSubmission('workspace/a', 'architect-to-luminary', 'one');
    assert.equal(entry.ordinal, 0);
    assert.equal((await reopened.getExchange(entry.registration.exchangeId)).canReplace, false);
    const second = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
      `import { AdmissionStore } from ${JSON.stringify(moduleUrl)}; await AdmissionStore.open(process.argv[1]);`, dir],
      { encoding: 'utf8', timeout: 15000 });
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /EEXIST/);
  } finally { await reopened.close(); }
});

test('last flagged replacement stays exhausted when processing close acknowledgment fails', async t => {
  let fail = false;
  const { store } = await fixture(t, { writeHook: (phase, path) => {
    if (fail && phase === 'after-sync' && path.includes('segment-')) { fail = false; throw new Error('closure receipt lost'); }
  } });
  let { r } = await first(store);
  for (const key of ['r1', 'r2']) {
    await store.closeProcessing(r.attemptId, { kind: 'returned', receipt: 'confirmed-receipt' });
    r = await store.registerSubmission(replacement(r, key));
    await store.admitSubmission('workspace/a', 'architect-to-luminary', key);
  }
  fail = true;
  await assert.rejects(store.closeProcessing(r.attemptId, { kind: 'shortfall' }), code('persistence-unresolved'));
  await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'r2');
  assert.equal((await store.getExchange(r.exchangeId)).admitted, 3);
  await assert.rejects(store.registerSubmission(replacement(r, 'third')), code('exhausted'));
});


test('confirmed non-admission of a replacement keeps exchange closed to a new key', async t => {
  let fail = false;
  const { store } = await fixture(t, { writeHook: (phase, path) => {
    if (fail && phase === 'before-write' && path.includes('segment-')) { fail = false; throw new Error('denied'); }
  } });
  const { r } = await first(store);
  await store.closeProcessing(r.attemptId, { kind: 'returned', receipt: 'received' });
  const request = replacement(r, 'r1'); await store.registerSubmission(request); fail = true;
  await assert.rejects(store.admitSubmission(request.scope, request.direction, request.submissionKey));
  assert.equal((await store.reconcileSubmission(request.scope, request.direction, request.submissionKey))?.state, 'not-admitted');
  await assert.rejects(store.registerSubmission(replacement(r, 'r1-new')), code('processing-required'));
});

test('reconciling A preserves acknowledged pending registration B', async t => {
  const { store } = await fixture(t);
  await first(store);
  await store.registerSubmission(initial('b'));
  await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one');
  assert.equal((await store.admitSubmission('workspace/a', 'architect-to-luminary', 'b')).admission, 'new');
});

test('unrelated or absent key cannot clear uncertain admission for A', async t => {
  let fail = false;
  const { store } = await fixture(t, { writeHook: (phase, path) => {
    if (fail && phase === 'after-sync' && path.includes('segment-')) { fail = false; throw new Error('lost'); }
  } });
  await first(store); await store.registerSubmission(initial('b'));
  fail = true; await assert.rejects(store.admitSubmission('workspace/a', 'architect-to-luminary', 'b'));
  await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'missing'), code('persistence-unresolved'));
  await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one'), code('persistence-unresolved'));
  assert.equal((await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'b'))?.ordinal, 0);
});


test('queued reconciliation timeout preserves the active key and never runs its reload', async t => {
  let hold = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { store, dir } = await fixture(t, { reconciliationTimeoutMs: 2000, writeHook: async (phase, path) => {
    if (hold && phase === 'after-sync' && path.includes('segment-')) {
      hold = false; await gate;
    }
  } });
  await first(store);
  await store.registerSubmission(initial('other'));
  const before = (await readFile(join(dir, 'segment-000001.jsonl'), 'utf8')).split('\n').filter(Boolean).length;
  hold = true;
  const active = store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one');
  const queued = store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'other');
  await assert.rejects(active, code('persistence-unresolved'));
  await assert.rejects(queued, code('persistence-unresolved'));
  release();
  await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'other'), code('persistence-unresolved'));
  await assert.rejects(store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'absent'), code('persistence-unresolved'));
  // Only A's resolution append is allowed; queued B never reloads or appends.
  const after = (await readFile(join(dir, 'segment-000001.jsonl'), 'utf8')).split('\n').filter(Boolean).length;
  assert.equal(after, before + 1);
  assert.equal((await store.reconcileSubmission('workspace/a', 'architect-to-luminary', 'one'))?.ordinal, 0);
});
