import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RedisSessionStore, type RedisSessionClient } from './session-store.js';

class FakeRedisClient implements RedisSessionClient {
  isOpen = true;
  readonly values = new Map<string, string>();
  on(): unknown { return this; }
  async connect(): Promise<void> {}
  async get(key: string): Promise<string | null> { return this.values.get(key) ?? null; }
  async set(key: string, value: string): Promise<void> { this.values.set(key, value); }
  async del(key: string): Promise<number> { return this.values.delete(key) ? 1 : 0; }
  async close(): Promise<void> { this.isOpen = false; }
}

test('Redis session store persists opaque sessions and invalidates the pre-authentication ID on rotation', async () => {
  const client = new FakeRedisClient();
  const store = new RedisSessionStore(client, 'test:');
  const preAuthentication = await store.create(60_000);
  assert.ok(await store.get(preAuthentication.id));
  const authenticated = await store.rotate(preAuthentication.id, 60_000);
  assert.notEqual(authenticated.id, preAuthentication.id);
  assert.equal(await store.get(preAuthentication.id), undefined);
  assert.ok(await store.get(authenticated.id));
  await store.close();
  assert.equal(client.isOpen, false);
});

test('Redis session store drops malformed shared state instead of authenticating it', async () => {
  const client = new FakeRedisClient();
  const store = new RedisSessionStore(client, 'test:');
  client.values.set('test:attacker-controlled', '{invalid-json');
  assert.equal(await store.get('attacker-controlled'), undefined);
  assert.equal(client.values.has('test:attacker-controlled'), false);
});
