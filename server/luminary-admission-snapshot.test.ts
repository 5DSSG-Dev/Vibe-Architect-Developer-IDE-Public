import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { prepareSubmission } from './luminary-admission-snapshot.js';

const realm = { scope: 'demo', workspace: 'workspace', maxEffectiveBytes: 32000 };
const envelope = () => ({ version: 1, kind: 'new', key: randomUUID() });
test('ask preserves exact whitespace, Unicode and canonical snapshot binding', () => {
  const input = { prompt: '  café 😀\r\n', submission: envelope() };
  const p = prepareSubmission(realm, 'ask', input);
  assert.equal(p.snapshot.original, input.prompt);
  assert.equal(p.snapshot.effectivePrompt, input.prompt);
  assert.equal(p.originalDigest, createHash('sha256').update(input.prompt).digest('hex'));
  assert.equal(p.submission.content, p.canonicalSnapshot);
  assert.deepEqual(JSON.parse(p.canonicalSnapshot), p.snapshot);
});
test('tasks apply pinned defaults, preserve goal and truncate labels by code point', () => {
  const p = prepareSubmission(realm, 'tasks', { goal: '  Keep spaces\n', allowedFiles: [' src\\demo.ts '], submission: envelope() });
  assert.equal(p.snapshot.effectivePrompt, '[Mode: CODE] [Explanation: Plain]\n[Task] Allowed files: src/demo.ts\nArchitect:   Keep spaces\n');
  assert.equal(p.effectiveDigest, '82cc2a7e630f4a9a6865a21c7cf3b967b5af06346f7953a9e6c2ccfbdc0f6c1b');
  const q = prepareSubmission(realm, 'tasks', { goal: 'Goal', allowedFiles: ['src/demo.ts'], context: [{ label: '😀'.repeat(81), text: 'note' }], level: 'technical', submission: envelope() });
  assert.equal(Array.from(q.snapshot.context[0].label).length, 80);
  assert.equal(q.effectiveDigest, '18c208f582778e209ae8e65910a30b814daa4d82f0e6ddeba996249883fb5ff3');
});
for (const [name, change] of [
  ['legacy resubmit', (b: any) => { b.resubmit = true; }],
  ['unknown envelope field', (b: any) => { b.submission.extra = 1; }],
  ['malformed key', (b: any) => { b.submission.key = 'not-a-uuid'; }],
  ['unpaired surrogate', (b: any) => { b.prompt = '\ud800'; }],
  ['blank', (b: any) => { b.prompt = ' \n'; }],
  ['original size', (b: any) => { b.prompt = 'x'.repeat(24001); }],
  ['incomplete triple', (b: any) => { b.submission.kind = 'replacement'; b.submission.exchangeId = randomUUID(); }],
] as const) test(`snapshot rejects ${name} before registration`, () => {
  const body = { prompt: 'Hello', submission: envelope() }; change(body);
  assert.throws(() => prepareSubmission(realm, 'ask', body));
});
test('task snapshot rejects normalized duplicates, invalid enum, nested extras and sparse arrays', () => {
  const base = { goal: 'Goal', allowedFiles: ['src/a.ts'], submission: envelope() };
  for (const patch of [{ allowedFiles: ['src/./a.ts', 'src/a.ts'] }, { level: 'expert' }, { context: [{ label: 'a', text: 'b', extra: true }] }, { context: new Array(1) }])
    assert.throws(() => prepareSubmission(realm, 'tasks', { ...base, ...patch }));
});
test('replacement requires equal lineage heads and effective gate ceiling', () => {
  const id = randomUUID();
  const p = prepareSubmission(realm, 'ask', { prompt: 'Hello', submission: { ...envelope(), kind: 'replacement', exchangeId: randomUUID(), revisesAttemptId: id, expectedHead: id } });
  assert.equal(p.submission.expectedHead, id);
  assert.throws(() => prepareSubmission({ ...realm, maxEffectiveBytes: 1 }, 'ask', { prompt: 'Hello', submission: envelope() }));
});
