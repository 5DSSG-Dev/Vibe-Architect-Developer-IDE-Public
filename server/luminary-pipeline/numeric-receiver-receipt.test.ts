import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { numericDeliveryId, reconcileNumericDelivery } from './numeric-delivery-reconciliation.js';
import { RedisReceiverAcceptanceReceipts } from './numeric-receiver-receipt.js';

const id = numericDeliveryId('request:receipt', 'task-proposal')!;
const hash = createHash('sha256').update('accepted candidate').digest('hex');
const other = createHash('sha256').update('other candidate').digest('hex');

function fakeStore() {
  const records = new Map<string, string>();
  const client = {
    eval: async (_script: string, options: { keys: string[]; arguments: string[] }) => {
      const prior = records.get(options.keys[0]);
      if (prior !== undefined) return prior === options.arguments[0] ? 0 : -1;
      records.set(options.keys[0], options.arguments[0]);
      return 1;
    },
    get: async (key: string) => records.get(key) ?? null,
  };
  return { records, client };
}

test('receiver acceptance receipt binds exact identity and is single-record under concurrency', async () => {
  const { records, client } = fakeStore();
  const receipts = new RedisReceiverAcceptanceReceipts(client);
  assert.equal(await receipts.readReceiver(id, hash), 'absent');
  const outcomes = await Promise.all([receipts.recordAccepted(id, hash), receipts.recordAccepted(id, hash)]);
  assert.deepEqual(outcomes.sort(), ['duplicate', 'recorded']);
  assert.equal(records.size, 1);
  assert.equal(await receipts.readReceiver(id, hash), 'delivered');
  assert.equal(await receipts.readReceiver(id, other), 'unknown');
  assert.equal(await receipts.recordAccepted(id, other), 'conflict');
  assert.equal(await receipts.recordAccepted('bad id', hash), 'conflict');
});

test('malformed, mismatched, and unavailable receipt records never prove delivery', async () => {
  let value: unknown = null;
  const receipts = new RedisReceiverAcceptanceReceipts({
    eval: async () => 1,
    get: async () => value,
  });
  for (const bad of [undefined, '{bad', '{}',
    JSON.stringify({ version: 1, event: 'receiver_accepted', deliveryId: 'wrong', candidateHash: hash }),
    JSON.stringify({ version: 1, event: 'completed', deliveryId: id, candidateHash: hash }),
    JSON.stringify({ version: 1, event: 'receiver_accepted', deliveryId: id, candidateHash: hash, extra: true })]) {
    value = bad;
    assert.equal(await receipts.readReceiver(id, hash), 'unknown');
  }
  value = null;
  assert.equal(await receipts.readReceiver(id, hash), 'absent');
  assert.equal(await receipts.readReceiver('bad id', hash), 'unknown');
});

test('reconciliation accepts only matching claim plus receiver-owned acceptance receipt', async () => {
  const { client } = fakeStore();
  const receipts = new RedisReceiverAcceptanceReceipts(client);
  const readers = { readClaim: async () => 'matching' as const,
    readReceiver: (deliveryId: string, candidateHash: string) => receipts.readReceiver(deliveryId, candidateHash) };
  assert.equal((await reconcileNumericDelivery(id, hash, readers)).status, 'claimed_without_receipt');
  assert.equal(await receipts.recordAccepted(id, hash), 'recorded');
  assert.equal((await reconcileNumericDelivery(id, hash, readers)).status, 'delivered');
  assert.equal((await reconcileNumericDelivery(id, other, readers)).status, 'receiver_unknown');
});

test('unexpected Redis acknowledgments and errors remain uncertain', async () => {
  let result: unknown = null;
  const receipts = new RedisReceiverAcceptanceReceipts({
    eval: async () => { if (result instanceof Error) throw result; return result; },
    get: async () => { throw new Error('unavailable'); },
  });
  for (const value of [null, '1', new Error('network')]) {
    result = value;
    assert.equal(await receipts.recordAccepted(id, hash), 'uncertain');
  }
  assert.equal(await receipts.readReceiver(id, hash), 'unknown');
});
