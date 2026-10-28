import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SpendLedger, SpendCapError, costUsd, createMetaAskModel, parseMetaModelEnv } from './luminary-meta.js';

// Every test uses a fake fetch. Meta's API is never reached.

const ledgerPath = () => join(mkdtempSync(join(tmpdir(), 'luminary-meta-')), 'spend.json');

function fakeMeta(reply: (call: number) => { status?: number; body: unknown }) {
  const calls: Array<{ url: string; init: RequestInit; body: any }> = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    const { status, body } = reply(calls.length);
    return new Response(JSON.stringify(body), { status: status ?? 200 });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

const ok = (content: string, usage = { prompt_tokens: 1_000, completion_tokens: 200 }) => ({
  body: { model: 'muse-spark-1.3', choices: [{ message: { content } }], usage },
});

test('a call sends one chat completion with the key as a bearer token and returns an untrusted candidate', async () => {
  const meta = fakeMeta(() => ok('Hello, Architect.'));
  const ask = createMetaAskModel({
    apiKey: 'test-key', systemPrompt: 'You are the Luminary.', ledger: new SpendLedger(ledgerPath(), 0.25, 2), fetch: meta.fetch,
  });
  assert.deepEqual(await ask('Hi'), { modelId: 'muse-spark-1.3', content: 'Hello, Architect.' });
  assert.equal(meta.calls.length, 1);
  assert.equal(meta.calls[0].url, 'https://api.meta.ai/v1/chat/completions');
  assert.equal((meta.calls[0].init.headers as Record<string, string>).authorization, 'Bearer test-key');
  assert.deepEqual(meta.calls[0].body.messages, [
    { role: 'system', content: 'You are the Luminary.' },
    { role: 'user', content: 'Hi' },
  ]);
  assert.equal(meta.calls[0].body.model, 'muse-spark-1.3');
  assert.equal(meta.calls[0].body.max_tokens, 2_000);
});

test('the call cap refuses the next call before any request is made', async () => {
  const meta = fakeMeta(() => ok('x'));
  const ask = createMetaAskModel({ apiKey: 'k', ledger: new SpendLedger(ledgerPath(), 0.25, 2), fetch: meta.fetch });
  await ask('one');
  await ask('two');
  await assert.rejects(ask('three'), SpendCapError);
  assert.equal(meta.calls.length, 2);
});

test('the spend cap refuses a call whose worst case would exceed it, before any request is made', async () => {
  const meta = fakeMeta(() => ok('x'));
  // 2,000 output tokens alone are $0.0085 at the output rate, above a $0.005 cap.
  const ask = createMetaAskModel({ apiKey: 'k', ledger: new SpendLedger(ledgerPath(), 0.005, 10), fetch: meta.fetch });
  await assert.rejects(ask('hi'), /spend cap would be exceeded/);
  assert.equal(meta.calls.length, 0);
});

test('reported usage settles the charge; without usage the worst case stays charged', async () => {
  const path = ledgerPath();
  const ledger = new SpendLedger(path, 0.25, 5);
  const withUsage = createMetaAskModel({ apiKey: 'k', ledger, fetch: fakeMeta(() => ok('x')).fetch });
  await withUsage('hi');
  assert.equal(ledger.read().spentUsd, costUsd('muse-spark-1.3', 1_000, 200));

  const noUsage = createMetaAskModel({
    apiKey: 'k', ledger, fetch: fakeMeta(() => ({ body: { choices: [{ message: { content: 'x' } }] } })).fetch,
  });
  await noUsage('hi');
  const state = ledger.read();
  assert.equal(state.entries[1].actualUsd, null);
  assert.ok(state.entries[1].reservedUsd >= costUsd('muse-spark-1.3', 0, 2_000));
  assert.ok(!readFileSync(path, 'utf8').includes('"k"'), 'the key is never written to the ledger');
});

test('an HTTP error or a network failure keeps the worst-case charge and becomes a thrown error', async () => {
  const ledger = new SpendLedger(ledgerPath(), 0.25, 5);
  const http = createMetaAskModel({ apiKey: 'k', ledger, fetch: fakeMeta(() => ({ status: 401, body: { error: 'bad key' } })).fetch });
  await assert.rejects(http('hi'), /HTTP 401/);
  const down = createMetaAskModel({
    apiKey: 'k', ledger, fetch: (async () => { throw new Error('offline'); }) as unknown as typeof fetch,
  });
  await assert.rejects(down('hi'), /unreachable: offline/);
  const state = ledger.read();
  assert.deepEqual(state.entries.map((e) => e.status), ['failed', 'failed']);
  assert.equal(state.calls, 2);
  assert.ok(state.spentUsd > 0);
});

test('the caps hold across restarts because they are counted from the ledger on disk', async () => {
  const path = ledgerPath();
  const meta = fakeMeta(() => ok('x'));
  await createMetaAskModel({ apiKey: 'k', ledger: new SpendLedger(path, 0.25, 1), fetch: meta.fetch })('one');
  const restarted = createMetaAskModel({ apiKey: 'k', ledger: new SpendLedger(path, 0.25, 1), fetch: meta.fetch });
  await assert.rejects(restarted('two'), /call cap reached/);
  assert.equal(meta.calls.length, 1);
});

test('an unreadable ledger refuses every call', async () => {
  const path = ledgerPath();
  writeFileSync(path, 'not json');
  const meta = fakeMeta(() => ok('x'));
  await assert.rejects(createMetaAskModel({ apiKey: 'k', ledger: new SpendLedger(path, 0.25, 2), fetch: meta.fetch })('hi'), SpendCapError);
  assert.equal(meta.calls.length, 0);
});

test('an unpriced model is refused at build time, including the contributor variant', () => {
  const ledger = new SpendLedger(ledgerPath(), 0.25, 2);
  assert.throws(() => createMetaAskModel({ apiKey: 'k', model: 'muse-spark-1.3-contributor', ledger }), SpendCapError);
});

test('env: no key means no Meta model; defaults are a $0.25 cap and 2 calls', () => {
  assert.equal(parseMetaModelEnv({}), undefined);
  const parsed = parseMetaModelEnv({ LUMINARY_META_API_KEY: ' secret ' })!;
  assert.equal(parsed.apiKey, 'secret');
  assert.equal(parsed.model, 'muse-spark-1.3');
  assert.equal(parsed.ledger.capUsd, 0.25);
  assert.equal(parsed.ledger.maxCalls, 2);
  assert.throws(() => parseMetaModelEnv({ LUMINARY_META_API_KEY: 'k', LUMINARY_META_MAX_CALLS: '0' }), /LUMINARY_META_MAX_CALLS/);
});
