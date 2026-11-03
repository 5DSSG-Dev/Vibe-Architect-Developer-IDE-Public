/** Opt-in isolated Redis session provenance probe; never uses a shared production DB. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import { createClient } from 'redis';
import { RedisSessionStore } from '../session-store.js';
import type { AuthenticatedNumericDeliveryInputs } from './numeric-authenticated-delivery.js';
import { createNumericSessionRouter } from './numeric-session-router.js';

test('two Redis session clients resolve and revoke the same numeric HTTP authority',
  { skip: !process.env.NUMERIC_TEST_REDIS_URL }, async t => {
    const url = process.env.NUMERIC_TEST_REDIS_URL!;
    const first = createClient({ url });
    const second = createClient({ url });
    await Promise.all([first.connect(), second.connect()]);
    const prefix = `test:numeric-session:${randomUUID()}:`;
    const writer = new RedisSessionStore(first, prefix);
    const reader = new RedisSessionStore(second, prefix);
    const session = await writer.create(60_000);
    session.principal = { subject: 'architect', tenantId: 'tenant', roles: ['service.operations.read'], csrfToken: 'csrf' };
    await writer.set(session);
    const calls = { identity: 0, model: 0 };
    const inputs: AuthenticatedNumericDeliveryInputs = {
      identities: { issue: async () => { calls.identity++; return { status: 'conflict', requestId: null }; } },
      model: () => { calls.model++; throw new Error('must not run'); },
      integrationForRequest: () => { throw new Error('must not run'); },
      reform: () => { throw new Error('must not run'); },
      claims: { claimOnce: async () => { throw new Error('must not run'); } },
      receiver: () => { throw new Error('must not run'); },
    };
    const app = express();
    app.use(express.json());
    app.use('/numeric', createNumericSessionRouter('http://127.0.0.1:3000', 'aegis_admin_session', reader, inputs));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    t.after(async () => {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await writer.delete(session.id);
      await Promise.all([writer.close(), reader.close()]);
    });
    const send = () => fetch(`http://127.0.0.1:${address.port}/numeric/ask`, {
      method: 'POST', headers: {
        'content-type': 'application/json', origin: 'http://127.0.0.1:3000',
        'x-csrf-token': 'csrf', 'idempotency-key': '4e304dfe-96ef-47ed-8d44-2edc9e84a89c',
        cookie: `aegis_admin_session=${session.id}`,
      }, body: JSON.stringify({ prompt: 'Build app' }),
    });
    assert.equal((await send()).status, 409);
    assert.deepEqual(calls, { identity: 1, model: 0 });
    await writer.delete(session.id);
    assert.equal((await send()).status, 401);
    assert.deepEqual(calls, { identity: 1, model: 0 });
  });
