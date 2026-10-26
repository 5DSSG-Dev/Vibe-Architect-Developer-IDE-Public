import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, test } from 'node:test';
import type { OperationEvent } from '../src/admin/domain/index.ts';
import { REPLAY_FIXTURE_EVENTS, REPLAY_FIXTURE_SNAPSHOT } from '../src/admin/data/replayFixture.ts';
import { createGateway } from './app.js';
import { REQUIRED_ADMIN_ROLE, type GatewayConfig } from './config.js';
import type { EntraAuth } from './entra-auth.js';
import { OperationsProviderStateError } from './operations-router.js';
import { ReplayOperationsProvider } from './replay-operations-provider.js';
import { InMemorySessionStore, type AdminSession, type AuthenticatedPrincipal } from './session-store.js';

const servers: Server[] = [];
afterEach(() => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))));

const config: GatewayConfig = {
  nodeEnv: 'test', port: 0, origin: 'http://127.0.0.1', sessionTtlMs: 60_000, cookieSecure: false, trustProxy: false,
  entra: { tenantId: 'tenant', clientId: 'client', clientSecret: 'test-only', redirectUri: 'http://127.0.0.1/auth/entra/callback' },
};

class FakeEntra implements EntraAuth {
  configured = true;
  constructor(private readonly roles = [REQUIRED_ADMIN_ROLE]) {}
  async createAuthorizationUrl(session: AdminSession): Promise<string> {
    session.pendingAuthorization = { state: 'state', nonce: 'nonce', codeVerifier: 'verifier', returnTo: '/admin/operations', createdAt: Date.now() };
    return 'https://login.example/authorize';
  }
  async completeAuthorization(): Promise<AuthenticatedPrincipal> {
    return { subject: 'operator', tenantId: 'tenant', roles: this.roles, csrfToken: 'csrf' };
  }
}

async function listen(provider: ReplayOperationsProvider, entra: EntraAuth = new FakeEntra()): Promise<string> {
  const app = await createGateway({ config, sessions: new InMemorySessionStore(), entra, operationsProvider: provider });
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function authenticate(base: string): Promise<string> {
  const login = await fetch(`${base}/auth/entra/login`, { redirect: 'manual' });
  const cookie = login.headers.get('set-cookie')!.split(';', 1)[0];
  const callback = await fetch(`${base}/auth/entra/callback?code=code&state=state`, { headers: { cookie }, redirect: 'manual' });
  assert.equal(callback.status, 303);
  return callback.headers.get('set-cookie')!.split(';', 1)[0];
}

function parseOperationEvents(body: string): Array<{ id: string; event: OperationEvent }> {
  return body.split('\n\n').flatMap((block) => {
    if (!block.includes('event: operation')) return [];
    const id = block.match(/^id: (.+)$/m)?.[1];
    const data = block.match(/^data: (.+)$/m)?.[1];
    assert.ok(id);
    assert.ok(data);
    return [{ id, event: JSON.parse(data) as OperationEvent }];
  });
}

function collectFieldNames(value: unknown, fields = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((entry) => collectFieldNames(entry, fields));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => {
    fields.add(key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase());
    collectFieldNames(entry, fields);
  });
  return fields;
}

test('operations endpoints deny unauthenticated requests before invoking the replay provider', async () => {
  const provider = new ReplayOperationsProvider({ playbackRate: 100_000 });
  const base = await listen(provider);
  assert.equal((await fetch(`${base}/api/admin/operations/snapshot`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/operations/stream`)).status, 401);
  assert.equal(provider.activeStreamCount, 0);
});

test('authorized snapshot is replay_fixture data and contains no restricted fields', async () => {
  const provider = new ReplayOperationsProvider({ playbackRate: 100_000 });
  const base = await listen(provider);
  const cookie = await authenticate(base);
  const response = await fetch(`${base}/api/admin/operations/snapshot`, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-aegis-source-boundary'), 'replay_fixture');
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  const snapshot = await response.json();
  assert.equal(snapshot.sourceBoundary, 'replay_fixture');
  assert.equal(snapshot.pod.pod_id, REPLAY_FIXTURE_SNAPSHOT.pod.pod_id);
  const fields = collectFieldNames(snapshot);
  for (const restricted of ['prompt', 'completion', 'credential', 'password', 'secret', 'token', 'witness']) {
    assert.equal([...fields].some((field) => new RegExp(`(^|_)${restricted}(_|$)`).test(field)), false);
  }
});

test('SSE preserves IDs and sequences, emits heartbeats, and resumes after Last-Event-ID', async () => {
  const provider = new ReplayOperationsProvider({ playbackRate: 1_000, heartbeatMs: 2 });
  const base = await listen(provider);
  const cookie = await authenticate(base);
  const cursor = REPLAY_FIXTURE_EVENTS[13].eventId;
  const response = await fetch(`${base}/api/admin/operations/stream`, { headers: { cookie, 'Last-Event-ID': cursor } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-aegis-source-boundary'), 'replay_fixture');
  const body = await response.text();
  const received = parseOperationEvents(body);
  const expected = REPLAY_FIXTURE_EVENTS.slice(14);
  assert.deepEqual(received.map(({ id }) => id), expected.map(({ eventId }) => eventId));
  assert.deepEqual(received.map(({ event }) => event.sequence), expected.map(({ sequence }) => sequence));
  assert.match(body, /: heartbeat /);
  assert.match(body, /event: replay-complete/);
  assert.match(body, /"resetRequired":true/);
  assert.match(body, /"resetMode":"omit_cursor"/);
  assert.equal(provider.activeStreamCount, 0);
});

test('query cursor resumes immediately after the supplied event ID', async () => {
  const provider = new ReplayOperationsProvider({ playbackRate: 100_000 });
  const base = await listen(provider);
  const cookie = await authenticate(base);
  const cursor = REPLAY_FIXTURE_EVENTS[4].eventId;
  const response = await fetch(`${base}/api/admin/operations/stream?cursor=${encodeURIComponent(cursor)}`, { headers: { cookie } });
  const received = parseOperationEvents(await response.text());
  assert.equal(received[0].id, REPLAY_FIXTURE_EVENTS[5].eventId);
  assert.deepEqual(received.map(({ event }) => event.sequence), REPLAY_FIXTURE_EVENTS.slice(5).map(({ sequence }) => sequence));
});

test('unknown cursor fails closed and requires an explicit reset', async () => {
  const provider = new ReplayOperationsProvider();
  const base = await listen(provider);
  const cookie = await authenticate(base);
  const response = await fetch(`${base}/api/admin/operations/stream?cursor=unknown-event`, { headers: { cookie } });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'operations_cursor_not_found', resetRequired: true });
  assert.equal(provider.activeStreamCount, 0);
});

test('disconnect cancels replay timers and heartbeat resources', async () => {
  const provider = new ReplayOperationsProvider({ playbackRate: 0.01, heartbeatMs: 5 });
  const base = await listen(provider);
  const cookie = await authenticate(base);
  const response = await fetch(`${base}/api/admin/operations/stream`, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.equal(provider.activeStreamCount, 1);
  await response.body?.cancel();
  const deadline = Date.now() + 1_000;
  while (Number(provider.activeStreamCount) !== 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(provider.activeStreamCount, 0);
});

test('provider rejects contaminated or non-deterministic fixture state', () => {
  const contaminated = { ...REPLAY_FIXTURE_EVENTS[0], rawPrompt: 'must-never-be-served' } as OperationEvent;
  const unexpected = { ...REPLAY_FIXTURE_EVENTS[0], debugPayload: 'must-never-be-served' } as OperationEvent;
  assert.throws(() => new ReplayOperationsProvider({ events: [contaminated] }), OperationsProviderStateError);
  assert.throws(() => new ReplayOperationsProvider({ events: [unexpected] }), OperationsProviderStateError);
  assert.throws(
    () => new ReplayOperationsProvider({ snapshot: { ...REPLAY_FIXTURE_SNAPSHOT, debugPayload: {} } as typeof REPLAY_FIXTURE_SNAPSHOT }),
    OperationsProviderStateError,
  );
  assert.throws(
    () => new ReplayOperationsProvider({ events: [REPLAY_FIXTURE_EVENTS[1], REPLAY_FIXTURE_EVENTS[0]] }),
    OperationsProviderStateError,
  );
});
