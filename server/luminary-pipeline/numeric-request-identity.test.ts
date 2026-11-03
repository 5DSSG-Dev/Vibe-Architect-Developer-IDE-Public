import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { numericDeliveryId } from './numeric-delivery-reconciliation.js';
import { RedisNumericRequestIdentities } from './numeric-request-identity.js';

const hash = createHash('sha256').update('exact request body').digest('hex');
const other = createHash('sha256').update('changed request body').digest('hex');

function fakeRedis() {
  const values = new Map<string, string>();
  const client = { eval: async (_script: string, options: { keys: string[]; arguments: string[] }) => {
    const existing = values.get(options.keys[0]);
    if (existing) {
      const record = JSON.parse(existing) as Record<string, unknown>;
      if (record.scope !== options.arguments[0] || record.purpose !== options.arguments[1] ||
          record.clientKey !== options.arguments[2] || record.inputHash !== options.arguments[3]) return [-1];
      return [0, record.requestId];
    }
    values.set(options.keys[0], options.arguments[4]);
    return [1, options.arguments[5]];
  } };
  return { values, client };
}

test('parallel and sequential retries recover one server-issued identity', async () => {
  const { values, client } = fakeRedis();
  const ids = new RedisNumericRequestIdentities(client);
  const [first, second] = await Promise.all([
    ids.issue('architect:1', 'client:1', 'task-proposal', hash),
    ids.issue('architect:1', 'client:1', 'task-proposal', hash),
  ]);
  assert.deepEqual([first.status, second.status].sort(), ['existing', 'issued']);
  assert.equal(first.requestId, second.requestId);
  assert.equal(values.size, 1);
  assert.equal((await ids.issue('architect:1', 'client:1', 'task-proposal', hash)).requestId, first.requestId);
  assert.equal(numericDeliveryId(first.requestId!, 'task-proposal'), numericDeliveryId(second.requestId!, 'task-proposal'));
  assert.equal(Object.isFrozen(first), true);
});

test('changed payload conflicts; principal and purpose are isolated', async () => {
  const { values, client } = fakeRedis();
  const ids = new RedisNumericRequestIdentities(client);
  const initial = await ids.issue('architect:1', 'client:1', 'ask-reply', hash);
  assert.equal(initial.status, 'issued');
  assert.equal((await ids.issue('architect:1', 'client:1', 'ask-reply', other)).status, 'conflict');
  const otherPrincipal = await ids.issue('architect:2', 'client:1', 'ask-reply', hash);
  const otherPurpose = await ids.issue('architect:1', 'client:1', 'task-proposal', hash);
  assert.equal(otherPrincipal.status, 'issued');
  assert.equal(otherPurpose.status, 'issued');
  assert.equal(values.size, 3);
  assert.notEqual(initial.requestId, otherPrincipal.requestId);
});

test('invalid inputs and malformed Redis acknowledgments never create an identity result', async () => {
  const { client } = fakeRedis();
  const ids = new RedisNumericRequestIdentities(client);
  assert.equal((await ids.issue('bad scope', 'client:1', 'ask-reply', hash)).status, 'invalid');
  assert.equal((await ids.issue('architect:1', 'client:1', 'ask-reply', 'bad')).status, 'invalid');
  const malformed = new RedisNumericRequestIdentities({ eval: async () => [0, 'request:forged'] });
  assert.equal((await malformed.issue('architect:1', 'client:1', 'ask-reply', hash)).status, 'uncertain');
  const corruptRecord = new RedisNumericRequestIdentities({ eval: async () => [-2] });
  assert.equal((await corruptRecord.issue('architect:1', 'client:1', 'ask-reply', hash)).status, 'uncertain');
  const throws = new RedisNumericRequestIdentities({ eval: async () => { throw new Error('lost response'); } });
  assert.equal((await throws.issue('architect:1', 'client:1', 'ask-reply', hash)).status, 'uncertain');
});
