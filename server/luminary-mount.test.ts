import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createGateway } from './app.js';
import { REQUIRED_ADMIN_ROLE, type GatewayConfig } from './config.js';
import type { EntraAuth } from './entra-auth.js';
import { InMemorySessionStore, type AdminSession, type AuthenticatedPrincipal } from './session-store.js';
import { DEMO_KEY_HEADER } from './luminary-access.js';
import type { AskModel } from './luminary-reply-router.js';
import type { Gauge } from './luminary-pipeline/pipeline.js';

// A fake gauge reading every virtue at 90 (no model is called).
const coherentGauge: Gauge = {
  read: async () => ({ Honesty: 90, Respect: 90, Attention: 90, Affection: 90, Loyalty: 90, Trust: 90, Communication: 90 }),
};

const servers: Server[] = [];
afterEach(() => Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r())))));

const DEMO_KEY = 'demo-key-for-reviewers';

function baseConfig(overrides: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    nodeEnv: 'test', port: 0, origin: 'http://127.0.0.1', sessionTtlMs: 60_000,
    cookieSecure: false, trustProxy: false,
    entra: { tenantId: 't', clientId: 'c', clientSecret: 'test-only', redirectUri: 'http://127.0.0.1/auth/entra/callback' },
    ...overrides,
  };
}

class FakeEntra implements EntraAuth {
  configured = true;
  async createAuthorizationUrl(session: AdminSession) {
    session.pendingAuthorization = { state: 's', nonce: 'n', codeVerifier: 'v', returnTo: '/', createdAt: Date.now() };
    return 'https://login.example/authorize';
  }
  async completeAuthorization(): Promise<AuthenticatedPrincipal> {
    return { subject: 'operator', tenantId: 't', roles: [REQUIRED_ADMIN_ROLE], csrfToken: 'csrf' };
  }
}

async function listen(overrides: Partial<GatewayConfig> = {}, askModel?: AskModel, gauge?: Gauge) {
  const app = await createGateway({ config: baseConfig(overrides), sessions: new InMemorySessionStore(), entra: new FakeEntra(), askModel, gauge });
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function ask(base: string, headers: Record<string, string>) {
  return fetch(`${base}/api/luminary/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ prompt: 'Hello, Luminary.' }),
  });
}

test('with no demo key configured, the mounted endpoint is disabled (503)', async () => {
  const base = await listen(); // luminaryDemoKey unset
  const res = await ask(base, { [DEMO_KEY_HEADER]: 'anything' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'luminary_not_configured');
});

test('a configured endpoint rejects a request with no demo key (401)', async () => {
  const base = await listen({ luminaryDemoKey: DEMO_KEY });
  assert.equal((await ask(base, {})).status, 401);
});

test('with the demo key and the default gauge and model, the Architect message is not sent: a named gauge_error Shortfall (502), zero Luminary calls, never fabricated prose', async () => {
  const base = await listen({ luminaryDemoKey: DEMO_KEY });
  const res = await ask(base, { [DEMO_KEY_HEADER]: DEMO_KEY });
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.error, 'luminary_shortfall');
  assert.equal(body.shortfall.code, 'gauge_error');
  assert.equal(body.calls.luminary_response, 0);
  assert.equal(body.reply, undefined);
});

test('with the demo key, a wired reply source and a wired gauge, a coherent reply is delivered (200) with its lineage', async () => {
  const askModel: AskModel = async () => ({ modelId: 'meta/muse-spark-open', content: 'Hello, Architect.' });
  const base = await listen({ luminaryDemoKey: DEMO_KEY }, askModel, coherentGauge);
  const res = await ask(base, { [DEMO_KEY_HEADER]: DEMO_KEY });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.reply, { modelId: 'meta/muse-spark-open', content: 'Hello, Architect.' });
  assert.deepEqual(body.lineage.map((entry: { stage: string }) => entry.stage), ['structural', 'pim', 'irg', 'rbc', 'prism']);
});

test('with a wired reply source but the default gauge, the reply is withheld as a gauge_error Shortfall (502) — never delivered ungauged', async () => {
  const askModel: AskModel = async () => ({ modelId: 'meta/muse-spark-open', content: 'Hello, Architect.' });
  const base = await listen({ luminaryDemoKey: DEMO_KEY }, askModel);
  const res = await ask(base, { [DEMO_KEY_HEADER]: DEMO_KEY });
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.shortfall.code, 'gauge_error');
  assert.equal(body.reply, undefined);
});

test('the admin routes are untouched by the Luminary mount (still 401 unauthenticated)', async () => {
  const base = await listen({ luminaryDemoKey: DEMO_KEY });
  assert.equal((await fetch(`${base}/api/admin/session`)).status, 401);
});
