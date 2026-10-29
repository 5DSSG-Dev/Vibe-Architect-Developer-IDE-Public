import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BASETEN_MODEL, DEFAULT_META_LIVE_MAX_OUTPUT_TOKENS, SpendLedger, parseLiveSourceEnv, SpendCapError, costUsd, createMetaAskModel, parseMetaLiveEnv, parseMetaModelEnv } from './luminary-meta.js';

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
  await assert.rejects(ask('hi'), /spending ceiling would be passed/);
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

test('live settings need the key and the Architect\'s ceiling, lift the call cap and allow 8,000 output tokens', () => {
  assert.throws(() => parseMetaLiveEnv({}), /LUMINARY_META_API_KEY/);
  assert.throws(() => parseMetaLiveEnv({ LUMINARY_META_API_KEY: 'k' }), /LUMINARY_META_CEILING_USD/);
  assert.throws(() => parseMetaLiveEnv({ LUMINARY_META_API_KEY: 'k', LUMINARY_META_CEILING_USD: '0' }), /CEILING/);
  const live = parseMetaLiveEnv({ LUMINARY_META_API_KEY: 'k', LUMINARY_META_CEILING_USD: '50', LUMINARY_META_LEDGER_PATH: ledgerPath() });
  assert.equal(live.ledger.capUsd, 50);
  assert.equal(live.ledger.maxCalls, Number.POSITIVE_INFINITY);
  assert.equal(live.maxOutputTokens, DEFAULT_META_LIVE_MAX_OUTPUT_TOKENS);
});

test('the ceiling counts earlier calls in the same ledger, reports a running total, and stops once reached', async () => {
  const path = ledgerPath();
  // Two earlier smoke-test calls, as on the Architect's PC.
  writeFileSync(path, JSON.stringify({ entries: [
    { at: 't', model: 'muse-spark-1.3', reservedUsd: 0.02, actualUsd: 0.0096, inputTokens: 2606, outputTokens: 1485, status: 'settled' },
    { at: 't', model: 'muse-spark-1.3', reservedUsd: 0.02, actualUsd: 0.013, inputTokens: 1, outputTokens: 2286, status: 'settled' },
  ] }));
  const ledger = new SpendLedger(path, 0.05, Number.POSITIVE_INFINITY);
  assert.deepEqual(ledger.summary(), { spentUsd: 0.0226, ceilingUsd: 0.05, calls: 2 });
  const meta = fakeMeta(() => ok('x', { prompt_tokens: 1_000, completion_tokens: 4_000 }));
  const ask = createMetaAskModel({ apiKey: 'k', ledger, maxOutputTokens: 4_000, fetch: meta.fetch });
  await ask('three'); // $0.01825 actual, so $0.04085 spent; the next worst case (about $0.017) would pass $0.05
  assert.equal(ledger.summary().calls, 3);
  await assert.rejects(ask('four'), /spending ceiling would be passed/);
  assert.equal(meta.calls.length, 1, 'a call that could pass the ceiling is never sent');
  writeFileSync(path, JSON.stringify({ entries: [{ at: 't', model: 'muse-spark-1.3', reservedUsd: 0.05, actualUsd: 0.05, inputTokens: 1, outputTokens: 1, status: 'settled' }] }));
  await assert.rejects(ask('five'), /spending ceiling is reached/);
});

test('Baseten is its own source: its own key, ceiling and ledger, Muse Spark Open at Baseten\'s address', async () => {
  assert.throws(() => parseLiveSourceEnv('baseten', { LUMINARY_META_API_KEY: 'meta-key', LUMINARY_META_CEILING_USD: '50' }), /LUMINARY_BASETEN_API_KEY/);
  assert.throws(() => parseLiveSourceEnv('baseten', { LUMINARY_BASETEN_API_KEY: 'b' }), /LUMINARY_BASETEN_CEILING_USD/);
  const path = ledgerPath();
  const live = parseLiveSourceEnv('baseten', { LUMINARY_BASETEN_API_KEY: 'baseten-key', LUMINARY_BASETEN_CEILING_USD: '75', LUMINARY_BASETEN_LEDGER_PATH: path, LUMINARY_META_CEILING_USD: '50' });
  assert.equal(live.model, BASETEN_MODEL);
  assert.equal(live.baseUrl, 'https://inference.baseten.co/v1');
  assert.equal(live.ledger.capUsd, 75);
  assert.equal(live.ledger.path, path);
  assert.equal(parseLiveSourceEnv('baseten', { LUMINARY_BASETEN_API_KEY: 'b', LUMINARY_BASETEN_CEILING_USD: '1' }).ledger.path, '.luminary/baseten-spend.json');

  const baseten = fakeMeta(() => ({ body: { model: BASETEN_MODEL, choices: [{ message: { content: 'Hello from Muse Spark Open.' } }], usage: { prompt_tokens: 100, completion_tokens: 50 } } }));
  const ask = createMetaAskModel({ ...live, fetch: baseten.fetch });
  assert.deepEqual(await ask('Hi'), { modelId: BASETEN_MODEL, content: 'Hello from Muse Spark Open.' });
  assert.equal(baseten.calls[0].url, 'https://inference.baseten.co/v1/chat/completions');
  assert.equal(baseten.calls[0].body.model, 'meta-models/muse-spark-open');
  assert.equal((baseten.calls[0].init.headers as Record<string, string>).authorization, 'Bearer baseten-key');
  assert.equal(live.ledger.summary().calls, 1);
  assert.ok(Math.abs(live.ledger.summary().spentUsd - (100 * 1.25 + 50 * 4.25) / 1_000_000) < 1e-12);
});
