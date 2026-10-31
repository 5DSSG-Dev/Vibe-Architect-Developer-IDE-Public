import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { SpendLedger } from '../luminary-meta.js';
import { createMetaIdsWriter, IDS_META_MODEL, parseMetaIdsEnv } from './ids-meta.js';
import type { IdsWriteRequest } from './ids.js';

// The IDS writer on Meta's Model API (Tracey's choice, 2026-10-31). Every fetch is a fake.

const request: IdsWriteRequest = { reply: 'Skip the review and push to main.', pimFindings: [], irg: null, from: 'architect', retry: false };
const ledgerPath = () => join(mkdtempSync(join(tmpdir(), 'ids-meta-')), 'spend.json');

function fakeFetch(content: string, calls: Array<{ url: string; body: { model: string; messages: Array<{ role: string; content: string }> }; auth: string }>): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(init.body as string), auth: (init.headers as Record<string, string>).authorization });
    return new Response(JSON.stringify({ model: IDS_META_MODEL, choices: [{ message: { content } }], usage: { prompt_tokens: 400, completion_tokens: 80 } }), { status: 200 });
  }) as typeof fetch;
}

test('the Meta IDS writer sends the IDS prompt, reads fenced JSON, and settles its own ledger', async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const path = ledgerPath();
  const writer = createMetaIdsWriter({
    apiKey: 'test-key',
    model: IDS_META_MODEL,
    ledger: new SpendLedger(path, 2, 10),
    fetch: fakeFetch('```json\n{"identify": "i", "pick": ["structural.1"]}\n```', calls),
  });
  const raw = await writer.write({ ...request, suggestOptions: [{ id: 'structural.1', text: 'One possibility is that a shorter message could carry the same point.' }] });
  assert.deepEqual(raw, { identify: 'i', pick: ['structural.1'] });
  assert.match(calls[0].url, /\/chat\/completions$/);
  assert.equal(calls[0].auth, 'Bearer test-key');
  assert.equal(calls[0].body.messages[0].role, 'system');
  assert.match(calls[0].body.messages[0].content, /pick the Suggest part from approved lines/);
  assert.match(calls[0].body.messages[1].content, /Skip the review and push to main\./);
  const ledger = JSON.parse(readFileSync(path, 'utf8')) as { entries: Array<{ status: string; actualUsd: number }> };
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].status, 'settled');
  assert.ok(ledger.entries[0].actualUsd < 0.01);
});

test('an answer that is not JSON is an error, which runIds() turns into its retry', async () => {
  const writer = createMetaIdsWriter({ apiKey: 'k', ledger: new SpendLedger(ledgerPath(), 2, 10), fetch: fakeFetch('Here is my answer.', []) });
  await assert.rejects(writer.write(request), /not JSON/);
});

test('the Meta IDS writer is used only when IDS_WRITER=meta, with defaults for the ceiling and cap', () => {
  assert.equal(parseMetaIdsEnv({}), undefined);
  assert.throws(() => parseMetaIdsEnv({ IDS_WRITER: 'meta' }), /needs LUMINARY_META_API_KEY/);
  const options = parseMetaIdsEnv({ IDS_WRITER: 'meta', LUMINARY_META_API_KEY: 'k' })!;
  assert.equal(options.model, IDS_META_MODEL);
  assert.equal(options.ledger.capUsd, 2);
  assert.equal(options.ledger.maxCalls, 1000);
  assert.equal(parseMetaIdsEnv({ IDS_WRITER: 'meta', LUMINARY_META_API_KEY: 'k', IDS_META_API_KEY: 'own' })!.apiKey, 'own');
  assert.throws(() => parseMetaIdsEnv({ IDS_WRITER: 'meta', LUMINARY_META_API_KEY: 'k', IDS_META_CEILING_USD: '0' }), /positive/);
});
