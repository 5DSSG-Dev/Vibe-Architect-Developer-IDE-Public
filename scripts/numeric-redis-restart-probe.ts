/** Two-phase isolated Redis AOF restart probe. Run before, restart Redis, then run after. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { RedisSessionStore } from '../server/session-store.js';
import { RedisAtomicDeliveryClaims } from '../server/luminary-pipeline/numeric-delivery-claim.js';
import { numericDeliveryId } from '../server/luminary-pipeline/numeric-delivery-reconciliation.js';
import { RedisReceiverAcceptanceReceipts } from '../server/luminary-pipeline/numeric-receiver-receipt.js';
import { RedisNumericRequestIdentities } from '../server/luminary-pipeline/numeric-request-identity.js';

type ProbeState = {
  prefix: string; sessionId: string; requestId: string; deliveryId: string;
  scope: string; clientKey: string; inputHash: string; candidateHash: string;
};

const url = process.env.NUMERIC_TEST_REDIS_URL;
const phase = process.env.NUMERIC_RESTART_PHASE;
if (!url || !['before', 'after'].includes(phase ?? '')) throw new Error('probe_environment_invalid');
const client = createClient({ url });
await client.connect();
try {
  if (phase === 'before') {
    const prefix = `test:numeric-restart:${randomUUID()}:`;
    const sessions = new RedisSessionStore(client, `${prefix}session:`);
    const identities = new RedisNumericRequestIdentities(client, `${prefix}identity:`);
    const claims = new RedisAtomicDeliveryClaims(client, `${prefix}claim:`);
    const receipts = new RedisReceiverAcceptanceReceipts(client, `${prefix}receipt:`);
    const session = await sessions.create(300_000);
    session.principal = { subject: 'probe', tenantId: 'probe', roles: ['service.operations.read'], csrfToken: 'probe' };
    await sessions.set(session);
    const scope = 'principal:restart-probe';
    const clientKey = `retry:${randomUUID()}`;
    const inputHash = createHash('sha256').update('Build app').digest('hex');
    const candidateHash = createHash('sha256').update('Please review the file.').digest('hex');
    const issued = await identities.issue(scope, clientKey, 'ask-reply', inputHash);
    assert.equal(issued.status, 'issued');
    if (issued.status !== 'issued') throw new Error('identity_not_issued');
    const deliveryId = numericDeliveryId(issued.requestId, 'ask-reply');
    assert(deliveryId);
    assert.equal(await claims.claimOnce(deliveryId, candidateHash), 'claimed');
    assert.equal(await receipts.recordAccepted(deliveryId, candidateHash), 'recorded');
    const state: ProbeState = { prefix, sessionId: session.id, requestId: issued.requestId,
      deliveryId, scope, clientKey, inputHash, candidateHash };
    process.stdout.write(`${JSON.stringify(state)}\n`);
  } else {
    const state = JSON.parse(process.env.NUMERIC_RESTART_STATE ?? '') as ProbeState;
    assert.match(state.prefix, /^test:numeric-restart:[0-9a-f-]{36}:$/);
    const sessions = new RedisSessionStore(client, `${state.prefix}session:`);
    const identities = new RedisNumericRequestIdentities(client, `${state.prefix}identity:`);
    const claims = new RedisAtomicDeliveryClaims(client, `${state.prefix}claim:`);
    const receipts = new RedisReceiverAcceptanceReceipts(client, `${state.prefix}receipt:`);
    assert.equal((await sessions.get(state.sessionId))?.principal?.subject, 'probe');
    assert.deepEqual(await identities.issue(state.scope, state.clientKey, 'ask-reply', state.inputHash),
      { status: 'existing', requestId: state.requestId });
    assert.equal(await claims.claimOnce(state.deliveryId, state.candidateHash), 'duplicate');
    assert.equal(await receipts.readReceiver(state.deliveryId, state.candidateHash), 'delivered');
    const keys = await client.keys(`${state.prefix}*`);
    assert.equal(keys.length, 4);
    await client.del(keys);
    process.stdout.write('RESTART_PROBE_PASS session identity claim receipt\n');
  }
} finally {
  await client.quit();
}
