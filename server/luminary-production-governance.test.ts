import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import type { ViteDevServer } from 'vite';
import { createGateway } from './app.js';
import { InMemorySessionStore } from './session-store.js';
import type { GatewayConfig } from './config.js';
import type { LuminaryExecutor } from './luminary-executor.js';
import type { GovernanceRuntime } from './luminary-bidirectional.js';
import { examine, type Gate } from './luminary-pipeline/marker-route.js';

const config: GatewayConfig = { nodeEnv: 'test', port: 0, origin: 'http://127.0.0.1:3000', sessionTtlMs: 60_000,
  cookieSecure: false, trustProxy: false, luminaryDemoKey: 'test-key' };
const entra = { configured: false, createAuthorizationUrl: async () => { throw new Error('not configured'); }, completeAuthorization: async () => { throw new Error('not configured'); } };

test('real gateway ask and task routes refuse missing two-way governance before writer or executor', async () => {
  let calls = 0;
  const app = await createGateway({ config, sessions: new InMemorySessionStore(), entra,
    vite: { middlewares: express.Router() } as unknown as ViteDevServer,
    askModel: async () => { calls++; return { modelId: 'm', content: 'reply' }; },
    executor: { propose: async () => { calls++; throw new Error('must not run'); } } as unknown as LuminaryExecutor });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address(); assert(address && typeof address !== 'string');
    for (const path of ['ask', 'tasks']) {
      const response: Response = await fetch(`http://127.0.0.1:${address.port}/api/luminary/${path}`, { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-luminary-demo-key': 'test-key' },
        body: JSON.stringify(path === 'ask' ? { prompt: 'Hello' } : { goal: 'Explain task', allowedFiles: ['src/example.ts'] }) });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).shortfall.code, 'governance_unavailable');
    }
    assert.equal(calls, 0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

for (const direction of ['inbound', 'outbound'] as const) for (const stopped of ['pim', 'irg', 'ptag'] as const) {
  test(`gateway ask/tasks: ${direction} ${stopped} hold has zero receiver/executor effects`, async () => {
    let writerCalls = 0; let effects = 0;
    const stages: string[] = [];
    const runtime: GovernanceRuntime = { createSession: () => ({
      invokeWriter: async (writer, prompt) => writer(prompt),
      evaluate: async (candidate, current) => {
        const check = (gate: Gate) => () => { stages.push(`${current}:${gate}`); return direction === current && gate === stopped
          ? { result: 0, finding: { kind: 'unsure', reason: 'private sentinel' } } : { result: 1 }; };
        return examine(candidate, { pim: check('pim'), irg: check('irg'), ptag: check('ptag') });
      },
    }) };
    const app = await createGateway({ config, sessions: new InMemorySessionStore(), entra, governanceRuntime: runtime,
      vite: { middlewares: express.Router() } as unknown as ViteDevServer,
      askModel: async () => { writerCalls++; return { modelId: 'm', content: 'withheld output' }; },
      executor: { propose: async () => { effects++; throw new Error('must not run'); } } as unknown as LuminaryExecutor });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const address = server.address(); assert(address && typeof address !== 'string');
      for (const path of ['ask', 'tasks']) {
        const response: Response = await fetch(`http://127.0.0.1:${address.port}/api/luminary/${path}`, { method: 'POST',
          headers: { 'content-type': 'application/json', 'x-luminary-demo-key': 'test-key' },
          body: JSON.stringify(path === 'ask' ? { prompt: 'Hello' } : { goal: 'Explain task', allowedFiles: ['src/example.ts'] }) });
        assert.equal(response.status, 422);
        const body = await response.text();
        assert(!body.includes('withheld output')); assert(!body.includes('private sentinel'));
      }
      assert.equal(writerCalls, direction === 'inbound' ? 0 : 2);
      assert.equal(effects, 0);
      assert.equal(stages.at(-1), `${direction}:${stopped}`);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
}
