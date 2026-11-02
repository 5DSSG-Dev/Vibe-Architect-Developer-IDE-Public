import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import express from 'express';
import { ReviewRecord } from './review.js';
import { createLuminaryReplyRouter, type AskModel } from '../luminary-reply-router.js';
import { createReviewRouter } from '../review-router.js';
import { fakeIdsWriter } from '../luminary-pipeline/ids.fixtures.js';
import { SEVEN_VIRTUES, type VirtueReadings } from '../luminary-pipeline/irg.js';

// The review areas through the real routers (plan rev16 F3, F4, F5; acceptance 17, 20, 21).

const virtues = (value: number, overrides: Partial<VirtueReadings> = {}) =>
  ({ ...Object.fromEntries(SEVEN_VIRTUES.map((v) => [v, value])), ...overrides }) as VirtueReadings;
const dirs: string[] = [];
const closers: Array<() => Promise<void>> = [];
after(async () => {
  for (const close of closers) await close();
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

async function setup(askModel: AskModel, read: (content: string) => VirtueReadings, dir?: string) {
  const root = dir ?? await mkdtemp(join(tmpdir(), 'aegis-review-'));
  if (!dir) dirs.push(root);
  const record = await ReviewRecord.open({ dir: root, backupDir: join(root, 'backup') });
  const app = express();
  app.use(express.json());
  app.use('/review', createReviewRouter(record));
  app.use('/', createLuminaryReplyRouter(askModel, { pipeline: { gauge: { read: async (c) => read(c), ids: fakeIdsWriter() } }, record }));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  closers.push(() => new Promise<void>((done) => server.close(() => done())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = async (path: string, body: unknown) => {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: (await res.json()) as any };
  };
  const get = async (path: string) => (await (await fetch(`${base}${path}`)).json()) as any;
  return { root, record, post, get };
}

const incoherentArchitect = (content: string) => (content.startsWith('bad') ? virtues(90, { Respect: 5 }) : virtues(90));

test('every Architect message and Luminary reply is written in full, with the anchors returned', async () => {
  const askModel: AskModel = async () => ({ modelId: 'm', content: 'A clear reply.' });
  const { root, record, post } = await setup(askModel, () => virtues(90));
  const { status, body } = await post('/ask', { prompt: 'A clear request.' });
  assert.equal(status, 200);
  assert.equal(body.record.state, 'sent');
  assert.deepEqual(body.record.anchors.map((a: { area: string }) => a.area), ['architect', 'luminary']);
  const architect = await readFile(join(root, 'architect', 'segment-000001.jsonl'), 'utf8');
  const luminary = await readFile(join(root, 'luminary', 'segment-000001.jsonl'), 'utf8');
  assert.ok(architect.includes('A clear request.'));
  assert.ok(luminary.includes('A clear reply.'));
  assert.equal(record.architect.latest.hash, body.record.anchors[0].hash);
});

test('two revisions, then the review area: no further automatic retry, full history linked', async () => {
  const asks: string[] = [];
  const askModel: AskModel = async (prompt) => { asks.push(prompt); return { modelId: 'm', content: 'ok' }; };
  const { post, get } = await setup(askModel, incoherentArchitect);
  const original = await post('/ask', { prompt: 'bad 0' });
  assert.equal(original.body.record.loop, 0);
  assert.equal(original.body.record.state, 'returned');
  const rev1 = await post('/ask', { prompt: 'bad 1', revisionOf: original.body.record.architectEntryId });
  assert.equal(rev1.body.record.loop, 1);
  const rev2 = await post('/ask', { prompt: 'bad 2', revisionOf: rev1.body.record.architectEntryId });
  assert.equal(rev2.status, 422);
  assert.equal(rev2.body.record.loop, 2);
  assert.equal(rev2.body.record.state, 'saved_for_review');
  assert.match(rev2.body.shortfall.message, /saved for your review/);
  assert.deepEqual(asks, [], 'the Luminary was never called');

  const again = await post('/ask', { prompt: 'bad 3', revisionOf: rev2.body.record.architectEntryId });
  assert.equal(again.status, 409);
  assert.equal(again.body.shortfall.code, 'saved_for_review');

  const review = await get('/review');
  assert.equal(review.items.architect.length, 1);
  assert.equal(review.items.architect[0].entry.revisionOf, rev1.body.record.architectEntryId);
});

test('a resubmission from the review area is a new linked entry with a fresh count; the original stays as it was', async () => {
  const { post, record } = await setup(async () => ({ modelId: 'm', content: 'ok' }), incoherentArchitect);
  let id = (await post('/ask', { prompt: 'bad a' })).body.record.architectEntryId;
  id = (await post('/ask', { prompt: 'bad b', revisionOf: id })).body.record.architectEntryId;
  const saved = (await post('/ask', { prompt: 'bad c', revisionOf: id })).body.record.architectEntryId;
  const resubmitted = await post('/ask', { prompt: 'bad d', revisionOf: saved, resubmit: true });
  assert.equal(resubmitted.body.record.loop, 0);
  assert.equal(record.findArchitect(resubmitted.body.record.architectEntryId)?.resubmittedFrom, saved);
  assert.equal(record.findArchitect(saved)?.state, 'saved_for_review');
});

test('a Luminary reply that never resonates is saved to the Luminary review area with every pass in full', async () => {
  const { post, get } = await setup(async () => ({ modelId: 'm', content: 'rough reply' }), (c) => (c === 'rough reply' ? virtues(10) : virtues(90)));
  const { status, body } = await post('/ask', { prompt: 'A clear request.' });
  assert.equal(status, 502);
  assert.equal(body.shortfall.code, 'incoherent_after_ids');
  assert.equal(JSON.stringify(body).includes('rough reply'), false, 'nothing from the reply is delivered');
  const review = await get('/review');
  assert.equal(review.items.luminary.length, 1);
  assert.deepEqual(review.items.luminary[0].entry.passes, ['rough reply', 'rough reply', 'rough reply']);
});

test('a failed check on start closes governance until the Architect acknowledges it; the acknowledgement is recorded', async () => {
  const first = await setup(async () => ({ modelId: 'm', content: 'ok' }), () => virtues(90));
  await first.post('/ask', { prompt: 'A clear request.' });
  const path = join(first.root, 'architect', 'segment-000001.jsonl');
  await writeFile(path, (await readFile(path, 'utf8')).replace('A clear request.', 'A changed request.'));

  const asks: string[] = [];
  const second = await setup(async (p) => { asks.push(p); return { modelId: 'm', content: 'ok' }; }, () => virtues(90), first.root);
  const closed = await second.post('/ask', { prompt: 'Hello.' });
  assert.equal(closed.status, 503);
  assert.equal(closed.body.shortfall.code, 'governance_closed');
  assert.deepEqual(asks, []);
  const review = await second.get('/review');
  assert.equal(review.closed, true);
  assert.ok(review.problems.some((p: { code: string }) => p.code === 'chain_broken'));

  await second.post('/review/acknowledge', {});
  assert.equal((await second.post('/ask', { prompt: 'Hello.' })).status, 200);
  assert.ok(second.record.architect.entries.some((line) => line.entry.kind === 'note'));
});

test('the second anchor: a pointer past the head, or a different hash, closes governance', async () => {
  const { post } = await setup(async () => ({ modelId: 'm', content: 'ok' }), () => virtues(90));
  const sent = await post('/ask', { prompt: 'A clear request.' });
  const [anchor] = sent.body.record.anchors;
  assert.equal((await post('/review/anchors', { anchors: [anchor] })).body.ok, true);
  const cut = await post('/review/anchors', { anchors: [{ ...anchor, seq: anchor.seq + 5 }] });
  assert.equal(cut.body.ok, false);
  assert.equal(cut.body.closed, true);
  assert.equal((await post('/ask', { prompt: 'Hello.' })).body.shortfall.code, 'governance_closed');
});

test('if the record cannot be written, nothing crosses (record_error)', async () => {
  const asks: string[] = [];
  const { record, post } = await setup(async (p) => { asks.push(p); return { modelId: 'm', content: 'ok' }; }, () => virtues(90));
  record.appendArchitect = async () => { throw new Error('disk full'); };
  const { status, body } = await post('/ask', { prompt: 'A clear request.' });
  assert.equal(status, 503);
  assert.equal(body.shortfall.code, 'record_error');
  assert.deepEqual(asks, []);
});

test('the review router offers no way to delete or change an entry', async () => {
  const { post } = await setup(async () => ({ modelId: 'm', content: 'ok' }), () => virtues(90));
  const routes = createReviewRouter(await ReviewRecord.open({ dir: await (async () => { const d = await mkdtemp(join(tmpdir(), 'aegis-routes-')); dirs.push(d); return d; })() })).stack
    .map((layer: any) => layer.route && Object.keys(layer.route.methods)).filter(Boolean).flat();
  assert.deepEqual(routes.sort(), ['get', 'post', 'post']);
  assert.equal((await post('/ask', { prompt: 'A clear request.' })).status, 200);
});
