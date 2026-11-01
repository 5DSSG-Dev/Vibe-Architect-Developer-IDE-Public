import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { P6Results } from './p6-results.js';
import { canonical } from './log.js';

export const hash = (x: unknown) => createHash('sha256').update(canonical(x)).digest('hex');
export function resultFixture(): any {
  const body = { reply: { modelId: 'fake', content: 'Done' } };
  return { version: 1, kind: 'p6_public_result', resultId: randomUUID(), scope: 'demo', workspace: 'ws', direction: 'architect-to-luminary', route: 'ask', submissionKeyDigest: hash('key'), attemptId: randomUUID(), exchangeId: randomUUID(), ordinal: 0, registrationDigest: hash('registration'), snapshotDigest: hash('snapshot'), originalDigest: hash('original'), effectiveDigest: hash('effective'), outcome: 'completed', httpStatus: 200, body, bodyDigest: hash(body), taskOperationId: null };
}
async function setup(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'p6-result-')); const dir = join(root, 'results'), anchorDir = join(root, 'anchors');
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, dir, anchorDir };
}
test('result + checkpoint ACK is readable unchanged after reopen; exclusive writer', async t => {
  const opts = await setup(t); const store = await P6Results.open(opts); const r = resultFixture();
  await assert.rejects(P6Results.open(opts));
  const saved = await store.appendPublicResult(r); r.body.reply.content = 'mutated';
  assert.deepEqual(store.verifiedResult(r.attemptId)!.result.body, { reply: { modelId: 'fake', content: 'Done' } });
  assert.deepEqual(saved.anchor, { area: 'p6-results', seq: 1, hash: saved.anchor.hash });
  await store.close(); const reopened = await P6Results.open(opts);
  assert.deepEqual(reopened.verifiedResult(r.attemptId)!.result.body, { reply: { modelId: 'fake', content: 'Done' } }); await reopened.close();
});
test('schema/body mismatch rejected without poisoning healthy writer; duplicate attempt refused', async t => {
  const store = await P6Results.open(await setup(t)); const r = resultFixture();
  await assert.rejects(store.appendPublicResult({ ...r, bodyDigest: '0'.repeat(64) }));
  await assert.rejects(store.appendPublicResult({ ...r, extra: true }));
  await store.appendPublicResult(r); await assert.rejects(store.appendPublicResult(r));
  assert.equal(store.health().ok, true); await store.close();
});
test('checkpoint uncertain write freezes all result reads and persists unresolved on reopen', async t => {
  const opts = await setup(t);
  const store = await P6Results.open({ ...opts, checkpointWriteHook: async (phase: string) => { if (phase === 'before-write') throw new Error('disk'); } });
  const r = resultFixture(); await assert.rejects(store.appendPublicResult(r));
  assert.equal(store.health().ok, false); assert.throws(() => store.verifiedResult(r.attemptId));
  await store.close(); const reopened = await P6Results.open(opts); assert.equal(reopened.health().ok, false); await reopened.close();
});
test('corrupt result chain and missing checkpoints fail closed; no automatic repair', async t => {
  const opts = await setup(t); const store = await P6Results.open(opts); await store.appendPublicResult(resultFixture()); await store.close();
  const path = join(opts.dir, 'segment-000001.jsonl'); const bytes = await readFile(path, 'utf8'); await writeFile(path, bytes.replace('Done', 'Evil'));
  const reopened = await P6Results.open(opts); assert.equal(reopened.health().ok, false); await reopened.close();
});
test('anchor mismatch latches reads closed and overlap paths rejected', async t => {
  const opts = await setup(t); await assert.rejects(P6Results.open({ dir: opts.dir, anchorDir: join(opts.dir, 'nested') }));
  const store = await P6Results.open(opts); await store.appendPublicResult(resultFixture());
  assert.throws(() => store.checkClientAnchor({ area: 'p6-results', seq: 1, hash: '0'.repeat(64) }));
  assert.equal(store.health().ok, false); await store.close();
});
test('leftover writer lock is never removed or taken over', async t => {
  const opts = await setup(t); await mkdir(join(opts.dir, '.p6-results-writer'), { recursive: true });
  await assert.rejects(P6Results.open(opts));
  await assert.rejects(P6Results.open(opts));
});
test('invalid JSON and outcome/status variants cannot enter the result chain', async t => {
  const store = await P6Results.open(await setup(t));
  for (const patch of [{ version: 2 }, { ordinal: 3 }, { httpStatus: 201 }, { outcome: 'returned', httpStatus: 200 }, { taskOperationId: '0'.repeat(64) }, { body: { undefined: undefined } }, { body: { values: new Array(1) } }])
    await assert.rejects(store.appendPublicResult({ ...resultFixture(), ...patch }));
  assert.equal(store.health().ok, true); await store.close();
});
test('result caller/projection mutations cannot alter verified evidence', async t => {
  const store = await P6Results.open(await setup(t)); const r = resultFixture(); await store.appendPublicResult(r);
  const projection = store.verifiedResult(r.attemptId)!; projection.result.scope = 'forged'; projection.anchor.hash = '0'.repeat(64);
  assert.equal(store.verifiedResult(r.attemptId)!.result.scope, 'demo'); await store.close();
});
test('missing checkpoint tail and shared checkpoint writer fail closed', async t => {
  const opts = await setup(t); const store = await P6Results.open(opts);
  await assert.rejects(P6Results.open({ dir: join(opts.root, 'other'), anchorDir: opts.anchorDir }));
  await store.appendPublicResult(resultFixture()); await store.close();
  await writeFile(join(opts.anchorDir, 'segment-000001.jsonl'), '');
  const reopened = await P6Results.open(opts); assert.equal(reopened.health().ok, false); await reopened.close();
});
test('shutdown drains held writes, rejects new appends and retains lock until ACK', async t => {
  let entered!: () => void, release!: () => void;
  const reached = new Promise<void>(r => { entered = r; }); const held = new Promise<void>(r => { release = r; });
  const opts = await setup(t); const store = await P6Results.open({ ...opts, writeHook: async phase => { if (phase === 'before-write') { entered(); await held; } } });
  const work = store.appendPublicResult(resultFixture()); await reached;
  const closing = store.close(); await assert.rejects(store.appendPublicResult(resultFixture()));
  await assert.rejects(P6Results.open(opts)); release(); await work; await closing;
  const reopened = await P6Results.open(opts); assert.equal(reopened.health().ok, true); await reopened.close();
});
