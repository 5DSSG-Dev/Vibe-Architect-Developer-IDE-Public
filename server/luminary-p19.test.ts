import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGateway } from './app.js';
import type { GatewayConfig } from './config.js';
import type { EntraAuth } from './entra-auth.js';
import { InMemorySessionStore } from './session-store.js';
import { DEMO_KEY_HEADER } from './luminary-access.js';
import { REHEARSAL_MODEL_ID, rehearsalAskModel } from './luminary-rehearsal.js';
import { LuminaryExecutor } from './luminary-executor.js';
import type { Gauge } from './luminary-pipeline/pipeline.js';
import { composePrompt, parseReply } from '../src/luminary/blocks.js';

const coherentGauge: Gauge = {
  read: async () => ({ Honesty: 90, Respect: 90, Attention: 90, Affection: 90, Loyalty: 90, Trust: 90, Communication: 90 }),
};
const KEY = 'demo-key';
const servers: Server[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))));
  dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

const config: GatewayConfig = {
  nodeEnv: 'test', port: 0, origin: 'http://127.0.0.1', sessionTtlMs: 60_000, cookieSecure: false, trustProxy: false,
  luminaryDemoKey: KEY,
  entra: { tenantId: 't', clientId: 'c', clientSecret: 'test-only', redirectUri: 'http://127.0.0.1/auth/entra/callback' },
};
const entra = { configured: false } as unknown as EntraAuth;

async function listen(extra: { gauge?: Gauge; executor?: LuminaryExecutor; rehearsal?: boolean } = {}) {
  const app = await createGateway({
    config, sessions: new InMemorySessionStore(), entra,
    askModel: extra.rehearsal === false ? undefined : rehearsalAskModel,
    replySource: extra.rehearsal === false ? undefined : 'rehearsal',
    gauge: extra.gauge, executor: extra.executor,
  });
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const post = (url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', [DEMO_KEY_HEADER]: KEY }, body: JSON.stringify(body) });

function gitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'luminary-p19-'));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, '.gitignore'), '/.luminary/\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'start');
  return dir;
}

test('status names the rehearsal source, the gauge state and coding tasks off', async () => {
  const base = await listen();
  const res = await fetch(`${base}/api/luminary/status`, { headers: { [DEMO_KEY_HEADER]: KEY } });
  assert.deepEqual(await res.json(), { replySource: 'rehearsal', gauge: 'not_configured', codingTasks: 'off' });
  const none = await listen({ rehearsal: false });
  assert.equal((await (await fetch(`${none}/api/luminary/status`, { headers: { [DEMO_KEY_HEADER]: KEY } })).json()).replySource, 'not_configured');
});

test('status still needs the demo key', async () => {
  const base = await listen();
  assert.equal((await fetch(`${base}/api/luminary/status`)).status, 401);
});

test('without a gauge, a rehearsal reply is withheld as gauge_error; the gauge is never faked', async () => {
  const base = await listen();
  const res = await post(`${base}/api/luminary/ask`, { prompt: composePrompt({ mode: 'DESIGN', level: 'plain', context: [], message: 'What is this?' }) });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).shortfall.code, 'gauge_error');
});

test('with a gauge, a rehearsal reply is delivered, labelled, and says it is a rehearsal', async () => {
  const base = await listen({ gauge: coherentGauge });
  const res = await post(`${base}/api/luminary/ask`, { prompt: composePrompt({ mode: 'DESIGN', level: 'plain', context: [], message: 'Please draft a note' }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.reply.modelId, REHEARSAL_MODEL_ID);
  assert.match(body.reply.content, /^Rehearsal reply from the stand-in, not a model\./);
  assert.ok(parseReply(body.reply.content).some((part) => part.kind === 'offering'));
});

test('the rehearsal outage is an honest upstream Shortfall', async () => {
  const base = await listen({ gauge: coherentGauge });
  const res = await post(`${base}/api/luminary/ask`, { prompt: 'Architect: show an outage' });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).shortfall.code, 'upstream_error');
});

test('a coding task goes through the gauge, lands on the Luminary branch, and joins only on accept', async () => {
  const dir = gitRepo();
  const executor = new LuminaryExecutor({ repoRoot: dir, checks: [{ name: 'Type check (fake)', command: process.execPath, args: ['-e', ''] }] });
  const base = await listen({ gauge: coherentGauge, executor });
  const res = await post(`${base}/api/luminary/tasks`, { goal: 'Write a short note', allowedFiles: ['docs/note.md'], level: 'plain' });
  assert.equal(res.status, 201);
  const { task, reply } = await res.json();
  assert.equal(reply.modelId, REHEARSAL_MODEL_ID);
  assert.deepEqual(task.files, ['docs/note.md']);
  assert.equal(task.checks[0].ok, true);
  assert.equal(existsSync(join(dir, 'docs/note.md')), false);
  const accepted = await post(`${base}/api/luminary/tasks/${task.id}/accept`, {});
  assert.equal((await accepted.json()).task.status, 'accepted');
  assert.equal(existsSync(join(dir, 'docs/note.md')), true);
  const ledger = await (await fetch(`${base}/api/luminary/tasks/ledger`, { headers: { [DEMO_KEY_HEADER]: KEY } })).json();
  assert.equal(ledger.valid, true);
  assert.deepEqual(ledger.entries.map((entry: { event: string }) => entry.event), ['proposed', 'accepted']);
});

test('a coding task naming a fenced file is refused before any model call', async () => {
  const dir = gitRepo();
  const base = await listen({ gauge: coherentGauge, executor: new LuminaryExecutor({ repoRoot: dir }) });
  const res = await post(`${base}/api/luminary/tasks`, { goal: 'Change settings', allowedFiles: ['.env'] });
  assert.equal(res.status, 422);
  assert.equal((await res.json()).shortfall.code, 'fence');
});
