import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { createServer as createHttpServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createGateway, sessionCookieName } from './app.js';
import { REQUIRED_ADMIN_ROLE, type GatewayConfig } from './config.js';
import type { EntraAuth } from './entra-auth.js';
import {
  InMemorySessionStore,
  SessionCapacityError,
  type AdminSession,
  type AuthenticatedPrincipal,
} from './session-store.js';
import { InMemoryEvidenceStore, canonicalJson, sha256Hex, type EvidenceStore } from './evidence-store.js';

const servers: Server[] = [];
afterEach(() => Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))));

const config: GatewayConfig = {
  nodeEnv: 'test', port: 0, origin: 'http://127.0.0.1', sessionTtlMs: 60_000, cookieSecure: false, trustProxy: false,
  entra: { tenantId: 'tenant', clientId: 'client', clientSecret: 'test-only', redirectUri: 'http://127.0.0.1/auth/entra/callback' },
};

class FakeEntra implements EntraAuth {
  configured = true;
  constructor(private readonly roles = [REQUIRED_ADMIN_ROLE]) {}
  async createAuthorizationUrl(session: AdminSession) {
    session.pendingAuthorization = { state: 'state', nonce: 'nonce', codeVerifier: 'verifier', returnTo: '/admin/operations', createdAt: Date.now() };
    return 'https://login.example/authorize';
  }
  async completeAuthorization(_session: AdminSession): Promise<AuthenticatedPrincipal> {
    return { subject: 'operator', tenantId: 'tenant', roles: this.roles, csrfToken: 'csrf' };
  }
}

async function listen(entra: EntraAuth = new FakeEntra()) {
  const app = await createGateway({ config, sessions: new InMemorySessionStore(), entra });
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return `http://127.0.0.1:${port}`;
}

async function authenticate(base: string) {
  const login = await fetch(`${base}/auth/entra/login`, { redirect: 'manual' });
  assert.equal(login.status, 302);
  const setCookie = login.headers.get('set-cookie')!;
  const preAuthCookie = setCookie.split(';', 1)[0];
  const callback = await fetch(`${base}/auth/entra/callback?code=code&state=state`, { headers: { cookie: preAuthCookie }, redirect: 'manual' });
  const authenticatedSetCookie = callback.headers.get('set-cookie')!;
  const cookie = authenticatedSetCookie.split(';', 1)[0];
  return { cookie, preAuthCookie, setCookie: authenticatedSetCookie, callback };
}

function durableEvidenceStore(): EvidenceStore {
  return {
    durable: true,
    async append() { return 'appended'; },
    async get() { return undefined; },
    async readStream() { return []; },
    async replay() { return { records: [], nextCursor: null }; },
  };
}

function validRelationContract() {
  const body = {
    contractId: 'ctr-api-test', timestamp: '2026-08-14T12:00:00.000Z',
    sourceItemId: 'orb-api', sourceItemName: 'API Orb', targetSocketId: 'socket-api', targetSocketName: 'API Socket',
    handshakeCompletedStep: 9, handshakeStatus: 'SUCCESS',
    negativeSpaceInvariants: {
      never_serializes_witness: true, never_persists_prompts: true, no_verdict_over_inner_life: true,
      no_unilateral_disconnection: true, no_capability_without_contract: true,
    },
    capabilitiesExchanged: ['observe'], negotiatedProtocolVersion: '4D-VIBE-v1.0',
    allocatedMemoryMB: 64, allocatedThreads: 1,
  };
  return { ...body, checksum: `sha256:${sha256Hex(canonicalJson(body))}` };
}

test('admin API fails closed without a session', async () => {
  const base = await listen();
  assert.equal((await fetch(`${base}/api/admin/session`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/operations/snapshot`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/evidence/replay`)).status, 401);
});

test('production gateway refuses an in-memory session store even when injected directly', async () => {
  await assert.rejects(
    () => createGateway({
      config: { ...config, nodeEnv: 'production', origin: 'https://architect.example.com', cookieSecure: true, trustProxy: 1, redisUrl: 'rediss://redis.example.com' },
      sessions: new InMemorySessionStore(),
      entra: new FakeEntra(),
    }),
    /shared SessionStore/,
  );
});

test('production gateway refuses absent or in-memory evidence storage', async () => {
  const sharedSessions = new InMemorySessionStore() as InMemorySessionStore & { shared: true };
  Object.defineProperty(sharedSessions, 'shared', { value: true });
  const productionConfig = { ...config, nodeEnv: 'production' as const, origin: 'https://architect.example.com', cookieSecure: true, trustProxy: 1 as const, redisUrl: 'rediss://redis.example.com' };
  await assert.rejects(
    () => createGateway({ config: productionConfig, sessions: sharedSessions, entra: new FakeEntra() }),
    /durable Redis EvidenceStore/,
  );
  await assert.rejects(
    () => createGateway({ config: productionConfig, sessions: sharedSessions, entra: new FakeEntra(), evidenceStore: new InMemoryEvidenceStore() }),
    /durable Redis EvidenceStore/,
  );
});

test('login establishes an opaque HttpOnly session and authorized callback', async () => {
  const base = await listen();
  const { cookie, preAuthCookie, setCookie, callback } = await authenticate(base);
  assert.match(cookie, new RegExp(`^${sessionCookieName(config)}=`));
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.doesNotMatch(setCookie, /operator/);
  assert.equal(callback.status, 303);
  assert.notEqual(cookie, preAuthCookie);
  assert.equal((await fetch(`${base}/api/admin/session`, { headers: { cookie: preAuthCookie } })).status, 401);
  const session = await fetch(`${base}/api/admin/session`, { headers: { cookie } });
  assert.equal(session.status, 200);
  assert.deepEqual((await session.json() as { roles: string[] }).roles, [REQUIRED_ADMIN_ROLE]);
});

test('protected evidence API enforces mutation authority and supports append, read, and replay', async () => {
  const base = await listen();
  const { cookie } = await authenticate(base);
  const contract = validRelationContract();
  const endpoint = `${base}/api/admin/evidence/relation-contracts`;

  assert.equal((await fetch(endpoint, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(contract) })).status, 403);
  const headers = { cookie, 'content-type': 'application/json', origin: config.origin, 'x-csrf-token': 'csrf' };
  assert.equal((await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(contract) })).status, 201);
  assert.equal((await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(contract) })).status, 200);

  const read = await fetch(`${base}/api/admin/evidence/relation-contracts/ctr-api-test`, { headers: { cookie } });
  assert.equal(read.status, 200);
  assert.equal((await read.json() as { records: unknown[] }).records.length, 1);
  const replay = await fetch(`${base}/api/admin/evidence/replay`, { headers: { cookie } });
  assert.equal(replay.status, 200);
  assert.equal((await replay.json() as { records: unknown[] }).records.length, 1);
});

test('missing app role is rejected on every protected API', async () => {
  const base = await listen(new FakeEntra([]));
  const { cookie, callback } = await authenticate(base);
  assert.equal(callback.status, 303);
  assert.equal((await fetch(`${base}/api/admin/session`, { headers: { cookie } })).status, 403);
  assert.equal((await fetch(`${base}/api/admin/operations/stream`, { headers: { cookie } })).status, 403);
  assert.equal((await fetch(`${base}/api/admin/evidence/replay`, { headers: { cookie } })).status, 403);
});

test('configured but unconnected operations provider reports unavailable', async () => {
  const base = await listen();
  const { cookie } = await authenticate(base);
  const response = await fetch(`${base}/api/admin/operations/snapshot`, { headers: { cookie } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'operations_source_unavailable' });
});

test('unknown application paths are not rewritten to the SPA', async () => {
  const base = await listen();
  assert.equal((await fetch(`${base}/not-an-application-route`)).status, 404);
});

test('security headers constrain framing, content types, referrers, and browser capabilities', async () => {
  const base = await listen();
  const response = await fetch(`${base}/`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.match(response.headers.get('content-security-policy') ?? '', /https:\/\/fonts\.googleapis\.com/);
  assert.match(response.headers.get('permissions-policy') ?? '', /camera=\(\)/);
});

test('Draco decoding uses byte-identical self-hosted assets from the installed Three.js package', async () => {
  const loaderSource = await readFile(resolve(process.cwd(), 'src/utils/gltfLoaderService.ts'), 'utf8');
  assert.match(loaderSource, /DRACO_DECODER_PATH = ['"]\/draco\/gltf\/['"]/);
  assert.doesNotMatch(loaderSource, /setDecoderPath\(\s*['"]https?:\/\//);

  for (const fileName of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
    const [servedAsset, installedAsset] = await Promise.all([
      readFile(resolve(process.cwd(), 'public/draco/gltf', fileName)),
      readFile(resolve(process.cwd(), 'node_modules/three/examples/jsm/libs/draco/gltf', fileName)),
    ]);
    assert.deepEqual(servedAsset, installedAsset, `${fileName} must match the installed Three.js decoder`);
  }
});

test('development CSP permits Vite React Refresh and Meshopt WASM while transformed HTML remains bootable', async () => {
  const hmrServer = createHttpServer();
  await new Promise<void>(resolve => hmrServer.listen(0, '127.0.0.1', resolve));
  const vite = await createViteServer({
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: { server: hmrServer } },
    appType: 'custom',
  });
  try {
    const app = await createGateway({ config: { ...config, nodeEnv: 'development' }, sessions: new InMemorySessionStore(), entra: new FakeEntra(), vite });
    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/`);
    const html = await response.text();
    const csp = response.headers.get('content-security-policy') ?? '';
    assert.equal(response.status, 200);
    assert.match(html, /\/@react-refresh/);
    assert.match(html, /src="\/src\/main\.tsx"/);
    assert.match(csp, /script-src[^;]*'unsafe-inline'/);
    assert.match(csp, /script-src[^;]*'wasm-unsafe-eval'/);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-eval'/);
    assert.match(csp, /worker-src[^;]*blob:/);
    assert.doesNotMatch(csp, /connect-src[^;]*blob:/);
  } finally {
    await vite.close();
    if (hmrServer.listening) await new Promise<void>(resolve => hmrServer.close(() => resolve()));
  }
});

test('production CSP forbids inline scripts but permits only the required Meshopt WASM compilation', async () => {
  const sharedSessions = new InMemorySessionStore() as InMemorySessionStore & { shared: true };
  Object.defineProperty(sharedSessions, 'shared', { value: true });
  const app = await createGateway({
    config: { ...config, nodeEnv: 'production', origin: 'https://architect.example.com', cookieSecure: true, trustProxy: 1, redisUrl: 'rediss://redis.example.com' },
    sessions: sharedSessions,
    entra: new FakeEntra(),
    evidenceStore: durableEvidenceStore(),
  });
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`);
  const csp = response.headers.get('content-security-policy') ?? '';
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-eval'/);
  assert.match(csp, /script-src[^;]*'wasm-unsafe-eval'/);
  assert.match(csp, /worker-src[^;]*blob:/);
  assert.doesNotMatch(csp, /connect-src[^;]*blob:/);
});

test('trusted proxy configuration makes login limiting use the forwarded client address', async () => {
  const proxyConfig = { ...config, trustProxy: 1 as const };
  const app = await createGateway({ config: proxyConfig, sessions: new InMemorySessionStore(), entra: new FakeEntra() });
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal((await fetch(`${base}/auth/entra/login`, { headers: { 'x-forwarded-for': '198.51.100.10' }, redirect: 'manual' })).status, 302);
  }
  assert.equal((await fetch(`${base}/auth/entra/login`, { headers: { 'x-forwarded-for': '198.51.100.10' }, redirect: 'manual' })).status, 429);
  assert.equal((await fetch(`${base}/auth/entra/login`, { headers: { 'x-forwarded-for': '198.51.100.11' }, redirect: 'manual' })).status, 302);
});

test('missing Entra configuration is explicitly unavailable and remains fail closed', async () => {
  const unconfigured: EntraAuth = {
    configured: false,
    async createAuthorizationUrl() { throw new Error('not configured'); },
    async completeAuthorization() { throw new Error('not configured'); },
  };
  const base = await listen(unconfigured);
  assert.equal((await fetch(`${base}/auth/entra/login`, { redirect: 'manual' })).status, 503);
  assert.equal((await fetch(`${base}/api/admin/session`)).status, 503);
  assert.equal((await fetch(`${base}/api/admin/operations/snapshot`)).status, 401);
});

test('Entra login initiation is rate limited before allocating unbounded sessions', async () => {
  const base = await listen();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal((await fetch(`${base}/auth/entra/login`, { redirect: 'manual' })).status, 302);
  }
  const limited = await fetch(`${base}/auth/entra/login`, { redirect: 'manual' });
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: 'login_rate_limited' });
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
});

test('in-memory sessions sweep expiry and fail closed at the configured capacity', async () => {
  let now = 1_000;
  const store = new InMemorySessionStore(2, () => now);
  const first = await store.create(100);
  await store.create(1_000);
  assert.equal(store.activeSessionCount, 2);
  await assert.rejects(() => store.create(1_000), SessionCapacityError);
  now = first.expiresAt;
  assert.equal(store.activeSessionCount, 1);
  await store.create(1_000);
  assert.equal(store.activeSessionCount, 2);
});
