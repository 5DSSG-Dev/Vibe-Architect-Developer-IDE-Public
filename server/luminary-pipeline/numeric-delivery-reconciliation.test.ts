import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { RedisAtomicDeliveryClaims } from './numeric-delivery-claim.js';
import { numericDeliveryId, reconcileNumericDelivery, RedisNumericClaimEvidenceReader, type ClaimEvidence, type ReceiverEvidence } from './numeric-delivery-reconciliation.js';

const hash = createHash('sha256').update('candidate').digest('hex');
const id = numericDeliveryId('request:one', 'task-proposal')!;

test('server request identity is stable and separated by purpose', () => {
  assert.equal(id, numericDeliveryId('request:one', 'task-proposal'));
  assert.notEqual(id, numericDeliveryId('request:one', 'ask-reply'));
  assert.notEqual(id, numericDeliveryId('request:two', 'task-proposal'));
  assert.equal(numericDeliveryId('bad id', 'ask-reply'), null);
  assert.equal(id.includes('request:one'), false);
});

test('claim evidence controls whether receiver evidence is consulted', async () => {
  for (const [claim, expected] of [
    ['absent', 'claim_record_absent'], ['conflicting', 'identity_conflict'], ['unknown', 'claim_unknown'],
    ['malformed', 'claim_unknown'],
  ] as const) {
    let receiverCalls = 0;
    const result = await reconcileNumericDelivery(id, hash, {
      readClaim: async () => claim as ClaimEvidence,
      readReceiver: async () => { receiverCalls += 1; return 'delivered'; },
    });
    assert.equal(result.status, expected);
    assert.equal(receiverCalls, 0);
    assert.equal(Object.isFrozen(result), true);
  }
});

test('claim record absence is unresolved even if a claim previously existed', async () => {
  let receiverCalls = 0;
  const readers = {
    readClaim: async () => 'absent' as const,
    readReceiver: async () => { receiverCalls += 1; return 'delivered' as const; },
  };
  const result = await reconcileNumericDelivery(id, hash, readers);
  assert.equal(result.status, 'claim_record_absent');
  assert.equal(receiverCalls, 0);
});

test('matching claim distinguishes receipt, absence, malformed evidence, and lookup error', async () => {
  for (const [receiver, expected] of [
    ['delivered', 'delivered'], ['absent', 'claimed_without_receipt'],
    ['unknown', 'receiver_unknown'], ['malformed', 'receiver_unknown'],
  ] as const) {
    const result = await reconcileNumericDelivery(id, hash, {
      readClaim: async () => 'matching',
      readReceiver: async () => receiver as ReceiverEvidence,
    });
    assert.equal(result.status, expected);
  }
  const failure = await reconcileNumericDelivery(id, hash, {
    readClaim: async () => 'matching', readReceiver: async () => { throw new Error('unavailable'); },
  });
  assert.equal(failure.status, 'receiver_unknown');
});

test('invalid identity and failed claim read cannot turn into delivery', async () => {
  let calls = 0;
  const readers = {
    readClaim: async () => { calls += 1; throw new Error('unavailable'); },
    readReceiver: async () => { calls += 1; return 'delivered' as const; },
  };
  assert.equal((await reconcileNumericDelivery('bad id', hash, readers)).status, 'invalid_identity');
  assert.equal(calls, 0);
  assert.equal((await reconcileNumericDelivery(id, hash, readers)).status, 'claim_unknown');
  assert.equal(calls, 1);
});

test('Redis claim inspection matches only the writer payload for the requested identity', async () => {
  let raw: unknown = JSON.stringify({ version: 1, deliveryId: id, candidateHash: hash });
  const reader = new RedisNumericClaimEvidenceReader({ get: async (key) => {
    assert.equal(key.includes(id), false);
    return raw;
  } });
  assert.equal(await reader.readClaim(id, hash), 'matching');
  assert.equal(await reader.readClaim(id, createHash('sha256').update('other').digest('hex')), 'conflicting');
  raw = null;
  assert.equal(await reader.readClaim(id, hash), 'absent');
  for (const bad of [undefined, '{broken', '{}', JSON.stringify({ version: 1, deliveryId: 'other', candidateHash: hash }),
    JSON.stringify({ version: 1, deliveryId: id, candidateHash: hash, extra: true })]) {
    raw = bad;
    assert.equal(await reader.readClaim(id, hash), 'unknown');
  }
});

test('reader decodes the exact current writer key and record under a shared namespace', async () => {
  const records = new Map<string, string>();
  const client = {
    eval: async (_script: string, options: { keys: string[]; arguments: string[] }) => {
      const key = options.keys[0];
      const value = options.arguments[0];
      const prior = records.get(key);
      if (prior !== undefined) return prior === value ? 0 : -1;
      records.set(key, value);
      return 1;
    },
    get: async (key: string) => records.get(key) ?? null,
  };
  const writer = new RedisAtomicDeliveryClaims(client, 'review:shared:');
  const reader = new RedisNumericClaimEvidenceReader(client, 'review:shared:');
  const otherHash = createHash('sha256').update('other').digest('hex');
  assert.equal(await reader.readClaim(id, hash), 'absent');
  assert.equal(await writer.claimOnce(id, hash), 'claimed');
  assert.equal(await reader.readClaim(id, hash), 'matching');
  assert.equal(await writer.claimOnce(id, hash), 'duplicate');
  assert.equal(await writer.claimOnce(id, otherHash), 'conflict');
  assert.equal(await reader.readClaim(id, otherHash), 'conflicting');
  assert.equal(records.size, 1);
  records.clear(); // Model eviction: absence cannot assert that a claim never occurred.
  assert.equal((await reconcileNumericDelivery(id, hash, {
    readClaim: (deliveryId, candidateHash) => reader.readClaim(deliveryId, candidateHash),
    readReceiver: async () => 'delivered',
  })).status, 'claim_record_absent');
});
