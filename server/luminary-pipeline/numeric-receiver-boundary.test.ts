import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { bindNumericReceiverAcceptance, ReceiverBoundaryError } from './numeric-receiver-boundary.js';
import type { ReceiptWriteOutcome } from './numeric-receiver-receipt.js';

const reply = Object.freeze({ modelId: 'model', content: 'accepted candidate' });
const id = 'delivery:test';
const hash = createHash('sha256').update(reply.content).digest('hex');
const accepted = () => ({ status: 'accepted' as const, deliveryId: id, candidateHash: hash });

test('receipt is written only after exact receiver acceptance', async () => {
  const order: string[] = [];
  const bound = bindNumericReceiverAcceptance({ accept: async () => {
    order.push('accept:start');
    await Promise.resolve();
    order.push('accept:done');
    return accepted();
  } }, { recordAccepted: async (deliveryId, candidateHash) => {
    assert.equal(deliveryId, id);
    assert.equal(candidateHash, hash);
    order.push('receipt');
    return 'recorded';
  } });
  await bound(reply, id);
  assert.deepEqual(order, ['accept:start', 'accept:done', 'receipt']);
});

test('failure or malformed acceptance cannot create a receipt', async () => {
  const malformed = [null, { status: 'accepted', deliveryId: id, candidateHash: 'wrong' },
    { status: 'accepted', deliveryId: id, candidateHash: hash, extra: true },
    Object.defineProperty({}, 'status', { get: () => 'accepted', enumerable: true }),
  ];
  let writes = 0;
  for (const value of malformed) {
    const bound = bindNumericReceiverAcceptance({ accept: () => value },
      { recordAccepted: async () => { writes += 1; return 'recorded'; } });
    await assert.rejects(bound(reply, id), (error) => error instanceof ReceiverBoundaryError && error.code === 'acceptance_unknown');
  }
  const throws = bindNumericReceiverAcceptance({ accept: () => { throw new Error('connection lost'); } },
    { recordAccepted: async () => { writes += 1; return 'recorded'; } });
  await assert.rejects(throws(reply, id), (error) => error instanceof ReceiverBoundaryError && error.code === 'acceptance_unknown');
  assert.equal(writes, 0);
});

test('receipt failures remain uncertain after receiver acceptance', async () => {
  for (const outcome of ['uncertain', 'conflict', 'malformed'] as const) {
    let accepts = 0;
    const bound = bindNumericReceiverAcceptance({ accept: () => { accepts += 1; return accepted(); } },
      { recordAccepted: async () => outcome as ReceiptWriteOutcome });
    await assert.rejects(bound(reply, id), (error) => error instanceof ReceiverBoundaryError &&
      error.code === (outcome === 'conflict' ? 'receipt_conflict' : 'receipt_unknown'));
    assert.equal(accepts, 1);
  }
  const lostWrite = bindNumericReceiverAcceptance({ accept: accepted },
    { recordAccepted: async () => { throw new Error('lost Redis response'); } });
  await assert.rejects(lostWrite(reply, id), (error) => error instanceof ReceiverBoundaryError && error.code === 'receipt_unknown');
});

test('an existing exact receipt can be observed as duplicate', async () => {
  const bound = bindNumericReceiverAcceptance({ accept: accepted }, { recordAccepted: async () => 'duplicate' });
  await bound(reply, id);
});
