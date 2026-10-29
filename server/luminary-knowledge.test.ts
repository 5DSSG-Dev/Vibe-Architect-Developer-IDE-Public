import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { createMetaAskModel, SpendLedger } from './luminary-meta.js';
import { loadLuminaryKnowledge, systemPromptWithKnowledge } from './luminary-knowledge.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('the Knowledge Pack is the pack, then the CORE Element Catalog, and its hash names that exact text', () => {
  const knowledge = loadLuminaryKnowledge();
  assert.equal(knowledge.version, 'v0.1');
  assert.match(knowledge.text, /^# Luminary Knowledge Pack: the IDE's Elements/);
  assert.ok(knowledge.text.indexOf('## Part 2: the Elements in the Apothecary today') < knowledge.text.indexOf('# CORE Element Catalog v1.0'));
  assert.match(knowledge.text, /HTTP API Gateway/, 'the generated Apothecary section is filled in');
  assert.match(knowledge.text, /Modules, Circuits and Arrays/, 'what is still open is named');
  assert.equal(knowledge.sha256, createHash('sha256').update(knowledge.text).digest('hex'));
  assert.equal(knowledge.bytes, Buffer.byteLength(knowledge.text));
});

test('the files are read as given, so a changed pack changes the hash', () => {
  const read = (body: string) => (url: URL) => (url.pathname.endsWith('CORE_ELEMENT_CATALOG.md') ? 'catalog' : body);
  const a = loadLuminaryKnowledge(new URL('file:///repo/'), read('pack one'));
  const b = loadLuminaryKnowledge(new URL('file:///repo/'), read('pack two'));
  assert.notEqual(a.sha256, b.sha256);
  assert.match(a.text, /^pack one\n\n---\n\nThe CORE Element Catalog follows/);
});

test('every question carries the Instructions and then the Knowledge Pack as its system message', async () => {
  const knowledge = loadLuminaryKnowledge();
  const systemPrompt = systemPromptWithKnowledge('INSTRUCTIONS', knowledge);
  const bodies: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  const fetchFake = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ model: 'm', choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });
  }) as unknown as typeof fetch;
  const ledger = new SpendLedger(join(mkdtempSync(join(tmpdir(), 'knowledge-')), 'spend.json'), 5, 5);
  const ask = createMetaAskModel({ apiKey: 'k', ledger, systemPrompt, fetch: fetchFake });
  await ask('one');
  await ask('two');
  for (const body of bodies) {
    assert.equal(body.messages[0].role, 'system');
    assert.ok(body.messages[0].content.startsWith('INSTRUCTIONS\n\n---\n\n# Reference: the IDE\'s Elements (Knowledge Pack v0.1)'));
    assert.ok(body.messages[0].content.endsWith(knowledge.text));
  }
});
