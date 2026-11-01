import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { P6Coordinator } from './luminary-admission-coordinator.js';
import { AdmissionStore } from './governance-record/admission.js';
import { AdmissionError } from './governance-record/admission-types.js';
import { P6Results } from './governance-record/p6-results.js';
import { prepareSubmission } from './luminary-admission-snapshot.js';
import { hash, stringHash } from './governance-record/p6-result-types.js';
const realm = { scope: 'demo', workspace: 'ws', maxEffectiveBytes: 32000 };
const request = (key = randomUUID()) => ({ prompt: 'Hello', submission: { version: 1, kind: 'new', key } });
async function setup(t: any, extra: any = {}) {
  const root = await mkdtemp(join(tmpdir(), 'p6-coord-'));
  const admission = await AdmissionStore.open(join(root, 'admission'), extra.admissionOptions);
  const results = await P6Results.open({ dir: join(root, 'results'), anchorDir: join(root, 'anchors'), ...extra.resultOptions });
  let calls = 0;
  const options = { realm, admission, results, validatePublicBody: (_o: any, _r: any, _s: any, b: any) => b?.safe === true,
    validateReturnedBody: (b: any) => b?.safe === true && b?.returned === true,
    process: async () => { calls++; return { kind: 'completed', status: 200, body: { safe: true } }; }, ...extra.coordinator };
  const c = await P6Coordinator.open(options); t.after(async () => { await c.close(); await rm(root, { recursive: true, force: true }); });
  return { c, admission, results, root, options, calls: () => calls };
}
test('concurrent duplicates run callback once; changed payload same key conflicts; saved body replays', async t => {
  const { c, calls } = await setup(t); const body = request();
  const [a, b] = await Promise.all([c.submit('ask', body), c.submit('ask', body)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(calls(), 1);
  assert.equal((await c.submit('ask', { ...body, prompt: 'Changed' })).status, 409);
  assert.equal((await c.status(body.submission.key)).body.state, 'terminal');
});
test('returned receipt permits exactly two replacements and no same-exchange reset', async t => {
  const { c } = await setup(t, { coordinator: { process: async () => ({ kind: 'validated-inbound-return', status: 422, body: { safe: true, returned: true } }) } });
  let body: any = request();
  for (let ordinal = 0; ordinal < 3; ordinal++) {
    assert.equal((await c.submit('ask', body)).status, 422);
    const s = (await c.status(body.submission.key)).body;
    assert.equal(s.ordinal, ordinal);
    body = { ...request(), submission: { version: 1, kind: 'replacement', key: randomUUID(), exchangeId: s.exchangeId, revisesAttemptId: s.attemptId, expectedHead: s.attemptId } };
  }
  assert.equal((await c.submit('ask', body)).status, 409);
});
test('result persistence uncertainty blocks both routes and status without disclosing candidate', async t => {
  const { c, calls } = await setup(t, { resultOptions: { checkpointWriteHook: async () => { throw new Error('disk'); } } });
  const body = request(); const a = await c.submit('ask', body);
  assert.equal(a.status, 503); assert.equal(JSON.stringify(a).includes('safe'), false);
  assert.equal((await c.submit('tasks', {})).status, 503);
  const s = await c.status(body.submission.key); assert.equal(s.status, 503); assert.equal(s.body.attemptId, null); assert.equal(calls(), 1);
});
test('invalid bodies and unknown typed outcomes make no returned closure', async t => {
  const { c, calls } = await setup(t, { coordinator: { process: async () => ({ kind: 'validated-inbound-return', status: 422, body: { safe: true } }) } });
  assert.equal((await c.submit('ask', { ...request(), extra: true })).status, 400); assert.equal(calls(), 0);
  const body = request(); assert.equal((await c.submit('ask', body)).status, 503);
  assert.equal((await c.status(body.submission.key)).body.state, 'unresolved');
});
test('task route stays disconnected without explicitly injected task processor; no effects', async t => {
  const { c, calls } = await setup(t);
  assert.equal((await c.submit('tasks', { goal: 'Code', allowedFiles: ['src/a.ts'], submission: request().submission })).status, 503);
  assert.equal(calls(), 0);
});
function gate() {
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const reached = new Promise<void>(resolve => { entered = resolve; });
  return { release, entered, held, reached };
}
test('task intent and checkpoint precede fake effect, duplicates never propose twice, status needs task guard', async t => {
  let proposals = 0; let state: Awaited<ReturnType<typeof setup>>;
  state = await setup(t, { coordinator: {
    process: async () => ({ kind: 'completed', status: 201, body: { safe: true }, taskCandidate: { text: 'synthetic' } }),
    task: { healthy: () => true, propose: async (_candidate: unknown, op: string) => {
      proposals++; const intent = state.results.entries().find(e => e.kind === 'p6_task_effect_intent');
      assert.equal(intent?.kind, 'p6_task_effect_intent'); assert.equal(intent && 'operationId' in intent && intent.operationId, op);
      return { kind: 'completed', status: 201, body: { safe: true, taskId: 'fake' } };
    } },
  } });
  const body = { goal: 'Code', allowedFiles: ['src/a.ts'], submission: request().submission };
  const [a, b] = await Promise.all([state.c.submit('tasks', body), state.c.submit('tasks', body)]);
  assert.equal(a.status, 201); assert.equal(b.status, 200); assert.equal(proposals, 1);
  assert.equal((await state.c.status(body.submission.key)).status, 403);
  assert.equal((await state.c.status(body.submission.key, true)).body.state, 'terminal');
});
test('unknown fake task completion freezes chat as well; no proposal replay', async t => {
  let proposals = 0;
  const { c } = await setup(t, { coordinator: {
    process: async () => ({ kind: 'completed', status: 201, body: { safe: true }, taskCandidate: {} }),
    task: { healthy: () => true, propose: async () => { proposals++; throw new Error('uncertain effect'); } },
  } });
  const task = { goal: 'Code', allowedFiles: ['src/a.ts'], submission: request().submission };
  assert.equal((await c.submit('tasks', task)).status, 503);
  assert.equal((await c.submit('tasks', task)).status, 503);
  assert.equal((await c.submit('ask', request())).status, 503); assert.equal(proposals, 1);
});
test('held admission close releases no candidate; failure latches both routes and cannot be cleared by external reconcile', async t => {
  const g = gate(); let armed = false;
  const state = await setup(t, { admissionOptions: { writeHook: async (phase: string, path: string) => {
    if (armed && phase === 'before-write' && path.includes('segment-')) { g.entered(); await g.held; throw new Error('close uncertain'); }
  } }, coordinator: { process: async () => { armed = true; return { kind: 'completed', status: 200, body: { safe: true, secretCandidate: 'never released' } }; } } });
  const body = request(); let settled = false; const work = state.c.submit('ask', body).then((x: any) => { settled = true; return x; });
  await g.reached; assert.equal(settled, false); g.release();
  const response = await work; assert.equal(response.status, 503); assert.equal(JSON.stringify(response).includes('never released'), false);
  armed = false;
  await state.admission.reconcileSubmission(realm.scope, 'architect-to-luminary', body.submission.key);
  assert.equal((await state.c.status(body.submission.key)).status, 503);
  assert.equal((await state.c.submit('tasks', {})).status, 503);
});
test('same-key concurrency captures request before mutation and status does not expose in-flight result', async t => {
  const g = gate(); let observed = '';
  const { c } = await setup(t, { coordinator: { process: async (p: any) => { observed = p.snapshot.original; g.entered(); await g.held; return { kind: 'completed', status: 200, body: { safe: true } }; } } });
  const body = request(); const work = c.submit('ask', body); body.prompt = 'mutation';
  await g.reached;
  assert.equal((await c.status(body.submission.key)).body.state, 'admitted'); assert.equal(observed, 'Hello');
  g.release(); assert.equal((await work).status, 200);
});
test('terminal restart replays saved result with zero new processing', async t => {
  const state = await setup(t); const body = request(); assert.equal((await state.c.submit('ask', body)).status, 200); await state.c.close();
  const admission = await AdmissionStore.open(join(state.root, 'admission'));
  const results = await P6Results.open({ dir: join(state.root, 'results'), anchorDir: join(state.root, 'anchors') });
  let replayCalls = 0;
  const reopened = await P6Coordinator.open({ ...state.options, admission, results, process: async () => { replayCalls++; throw new Error('must not run'); } });
  try { assert.equal((await reopened.submit('ask', body)).status, 200); assert.equal(replayCalls, 0); }
  finally { await reopened.close(); }
});
test('registration-only and admitted-incomplete restarts stay unresolved without callbacks', async t => {
  const { prepareSubmission } = await import('./luminary-admission-snapshot.js');
  for (const admit of [false, true]) {
    const state = await setup(t); const body = request();
    const p = prepareSubmission(realm, 'ask', body); await state.admission.registerSubmission(p.submission);
    if (admit) await state.admission.admitSubmission(realm.scope, 'architect-to-luminary', body.submission.key);
    await state.c.close();
    const admission = await AdmissionStore.open(join(state.root, 'admission'));
    const results = await P6Results.open({ dir: join(state.root, 'results'), anchorDir: join(state.root, 'anchors') });
    const reopened = await P6Coordinator.open({ ...state.options, admission, results });
    try { assert.equal((await reopened.status(body.submission.key)).status, 503); assert.equal((await reopened.submit('ask', body)).status, 503); assert.equal(state.calls(), 0); }
    finally { await reopened.close(); }
  }
});
test('review and enabled task-ledger health failures latch all new processing', async t => {
  for (const dependency of ['review', 'task']) {
    let healthy = true;
    const { c, calls } = await setup(t, { coordinator: {
      reviewHealthy: () => dependency !== 'review' || healthy,
      ...(dependency === 'task' ? { task: { healthy: () => healthy, propose: async () => { throw new Error('not reached'); } } } : {}),
    } });
    healthy = false; assert.equal((await c.submit('ask', request())).status, 503);
    healthy = true; assert.equal((await c.submit('ask', request())).status, 503); assert.equal(calls(), 0);
  }
});
test('an admission-shaped exception from a processor is not a pre-admission conflict', async t => {
  const { c } = await setup(t, { coordinator: { process: async () => { throw new AdmissionError('conflict'); } } });
  assert.equal((await c.submit('ask', request())).status, 503);
  assert.equal((await c.submit('ask', request())).status, 503);
});
test('graceful close drains accepted work without creating a new incomplete attempt', async t => {
  const g = gate();
  const { c } = await setup(t, { coordinator: { process: async () => { g.entered(); await g.held; return { kind: 'completed', status: 200, body: { safe: true } }; } } });
  const work = c.submit('ask', request()); await g.reached; const closing = c.close();
  assert.equal((await c.submit('ask', request())).status, 503);
  g.release(); assert.equal((await work).status, 200); await closing;
});
test('primitive canReplace cannot bypass a forged parent receipt', async t => {
  const state = await setup(t); const body = request(); const p = prepareSubmission(realm, 'ask', body);
  const reg = await state.admission.registerSubmission(p.submission);
  const admitted = await state.admission.admitSubmission(realm.scope, 'architect-to-luminary', body.submission.key);
  const returnedBody = { safe: true, returned: true };
  await state.results.appendPublicResult({ version: 1, kind: 'p6_public_result', resultId: randomUUID(), scope: realm.scope, workspace: realm.workspace, direction: 'architect-to-luminary', route: 'ask', submissionKeyDigest: stringHash(body.submission.key), attemptId: reg.attemptId, exchangeId: reg.exchangeId, ordinal: admitted.ordinal!, registrationDigest: reg.digest, snapshotDigest: p.snapshotDigest, originalDigest: p.originalDigest, effectiveDigest: p.effectiveDigest, outcome: 'returned', httpStatus: 422, body: returnedBody, bodyDigest: hash(returnedBody), taskOperationId: null });
  await state.admission.closeProcessing(reg.attemptId, { kind: 'returned', receipt: 'forged-counter-only' });
  assert.equal((await state.admission.getExchange(reg.exchangeId)).canReplace, true);
  const replacement = { prompt: 'Revision', submission: { version: 1, kind: 'replacement', key: randomUUID(), exchangeId: reg.exchangeId, revisesAttemptId: reg.attemptId, expectedHead: reg.attemptId } };
  assert.equal((await state.c.submit('ask', replacement)).status, 503); assert.equal(state.calls(), 0);
});
