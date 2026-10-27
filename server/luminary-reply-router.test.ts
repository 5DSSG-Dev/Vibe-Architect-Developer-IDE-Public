import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { createLuminaryReplyRouter, type AskModel, type LuminaryReplyRouterOptions } from './luminary-reply-router.js';

// A real Express app over the router, mounted at /api/luminary (the path is the test
// harness's choice, not a decision the router makes). The ask source is a fake: these
// tests exercise the governance boundary, never a network or a provider.
function harness(askModel: AskModel, options?: LuminaryReplyRouterOptions) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/luminary', createLuminaryReplyRouter(askModel, options));
  const server: Server = createServer(app);
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/api/luminary/ask`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

async function postAsk(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

const openServers: Array<() => Promise<void>> = [];
after(async () => { for (const close of openServers) await close(); });

async function serve(askModel: AskModel, options?: LuminaryReplyRouterOptions) {
  const h = await harness(askModel, options);
  openServers.push(h.close);
  return h.url;
}

test('a governed reply is returned as 200 { reply } with its model id and exact content', async () => {
  const url = await serve(async () => ({ modelId: 'meta/muse-spark-open', content: 'Hello, Architect.' }));
  const { status, body } = await postAsk(url, { prompt: 'Hi' });
  assert.equal(status, 200);
  assert.deepEqual(body, { reply: { modelId: 'meta/muse-spark-open', content: 'Hello, Architect.' } });
});

test('the injected prompt is the exact trimmed string from the request', async () => {
  let seen: string | undefined;
  const url = await serve(async (prompt) => { seen = prompt; return { modelId: 'm', content: 'ok' }; });
  await postAsk(url, { prompt: '  design an Orb  ' });
  assert.equal(seen, 'design an Orb');
});

test('a missing or empty prompt is a 400 malformed_request and the model is never called', async () => {
  let called = false;
  const url = await serve(async () => { called = true; return { modelId: 'm', content: 'ok' }; });
  // Top-level JSON primitives are rejected by express.json strict mode before the router;
  // these reach the handler and exercise its own malformed_request guard.
  for (const body of [{}, { prompt: '' }, { prompt: '   ' }, { prompt: 42 }, []]) {
    const { status, body: payload } = await postAsk(url, body);
    assert.equal(status, 400, JSON.stringify(body));
    assert.equal(payload.error, 'malformed_request');
  }
  assert.equal(called, false);
});

test('each governance Shortfall becomes a 502 luminary_shortfall carrying the named code', async () => {
  const cases: Array<[unknown, string]> = [
    ['not an object', 'malformed_reply'],
    [{ content: 'has no model id' }, 'missing_model_id'],
    [{ modelId: 'm', content: 42 }, 'malformed_reply'],
    [{ modelId: 'm', content: '   ' }, 'empty_reply'],
  ];
  for (const [candidate, code] of cases) {
    const url = await serve(async () => candidate);
    const { status, body } = await postAsk(url, { prompt: 'Hi' });
    assert.equal(status, 502, code);
    assert.equal(body.error, 'luminary_shortfall');
    assert.equal(body.shortfall.code, code);
  }
});

test('an oversized reply is governed to a 502 oversized_reply, not delivered', async () => {
  const url = await serve(async () => ({ modelId: 'm', content: 'x'.repeat(11) }), { governance: { maxContentBytes: 10 } });
  const { status, body } = await postAsk(url, { prompt: 'Hi' });
  assert.equal(status, 502);
  assert.equal(body.shortfall.code, 'oversized_reply');
});

test('an upstream throw is a named upstream_error Shortfall, never a 500 or fallback prose', async () => {
  const url = await serve(async () => { throw new Error('provider timed out'); });
  const { status, body } = await postAsk(url, { prompt: 'Hi' });
  assert.equal(status, 502);
  assert.equal(body.error, 'luminary_shortfall');
  assert.equal(body.shortfall.code, 'upstream_error');
  assert.equal(body.shortfall.modelId, null);
  assert.equal(body.reply, undefined);
});

// With the P17 pipeline enabled (STP-0002 P17). The gauge is a fake; no model is reached.
const allVirtues = (value: number) =>
  ({ Honesty: value, Respect: value, Attention: value, Affection: value, Loyalty: value, Trust: value, Communication: value });

test('with the pipeline, an incoherent reply is re-formed by the same reply source with the IDS observation in its prompt', async () => {
  const prompts: string[] = [];
  const askModel: AskModel = async (prompt) => {
    prompts.push(prompt);
    return { modelId: 'm', content: prompts.length === 1 ? 'rough' : 'clear' };
  };
  const gauge = { read: async (content: string) => allVirtues(content === 'clear' ? 90 : 40) };
  const url = await serve(askModel, { pipeline: { gauge } });
  const { status, body } = await postAsk(url, { prompt: 'Design an Orb' });
  assert.equal(status, 200);
  assert.deepEqual(body.reply, { modelId: 'm', content: 'clear' });
  assert.equal(prompts[0], 'Design an Orb');
  assert.match(prompts[1], /^Your previous reply did not resonate/);
  assert.ok(prompts[1].includes('Original prompt:\nDesign an Orb'));
  assert.equal(body.lineage.at(-1).stage, 'prism');
});

test('with the pipeline, a reply that never resonates is a 502 incoherent_after_ids Shortfall with lineage and no reply', async () => {
  const askModel: AskModel = async () => ({ modelId: 'm', content: 'rough' });
  const url = await serve(askModel, { pipeline: { gauge: { read: async () => allVirtues(20) } } });
  const { status, body } = await postAsk(url, { prompt: 'Hi' });
  assert.equal(status, 502);
  assert.equal(body.error, 'luminary_shortfall');
  assert.equal(body.shortfall.code, 'incoherent_after_ids');
  assert.equal(body.reply, undefined);
  assert.ok(Array.isArray(body.lineage));
});
