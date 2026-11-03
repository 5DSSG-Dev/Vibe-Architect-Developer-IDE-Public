/** Opt-in real Redis probe. Use a dedicated ephemeral Redis URL, never a shared production DB. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createClient } from 'redis';
import { RedisAtomicDeliveryClaims } from './numeric-delivery-claim.js';
import { numericDeliveryId, reconcileNumericDelivery, RedisNumericClaimEvidenceReader } from './numeric-delivery-reconciliation.js';
import { RedisReceiverAcceptanceReceipts } from './numeric-receiver-receipt.js';
import { RedisNumericRequestIdentities } from './numeric-request-identity.js';

test('real Redis claim, receipt, and reconciliation use atomic scripts and exact records',
  { skip: !process.env.NUMERIC_TEST_REDIS_URL }, async (t) => {
    const url = process.env.NUMERIC_TEST_REDIS_URL!;
    const first = createClient({ url });
    const second = createClient({ url });
    await Promise.all([first.connect(), second.connect()]);
    let claimKey = '';
    let receiptKey = '';
    t.after(async () => {
      if (claimKey && receiptKey) await first.del([claimKey, receiptKey]);
      await Promise.all([first.quit(), second.quit()]);
    });
    const prefix = `test:numeric:${randomUUID()}:`;
    const claimPrefix = `${prefix}claim:`;
    const receiptPrefix = `${prefix}receipt:`;
    const id = `delivery:${randomUUID()}`;
    const hash = createHash('sha256').update('candidate').digest('hex');
    const other = createHash('sha256').update('different candidate').digest('hex');
    const claimA = new RedisAtomicDeliveryClaims(first, claimPrefix);
    const claimB = new RedisAtomicDeliveryClaims(second, claimPrefix);
    const claimReader = new RedisNumericClaimEvidenceReader(second, claimPrefix);
    const receipts = new RedisReceiverAcceptanceReceipts(second, receiptPrefix);
    claimKey = `${claimPrefix}${createHash('sha256').update(id).digest('hex')}`;
    receiptKey = `${receiptPrefix}${createHash('sha256').update(id).digest('hex')}`;

    const claims = await Promise.all([claimA.claimOnce(id, hash), claimB.claimOnce(id, hash)]);
    assert.deepEqual(claims.sort(), ['claimed', 'duplicate']);
    assert.equal(await claimA.claimOnce(id, other), 'conflict');
    assert.equal(await claimReader.readClaim(id, hash), 'matching');
    assert.equal(await claimReader.readClaim(id, other), 'conflicting');
    assert.equal(await first.ttl(claimKey), -1);

    const evidence = {
      readClaim: (deliveryId: string, candidateHash: string) => claimReader.readClaim(deliveryId, candidateHash),
      readReceiver: (deliveryId: string, candidateHash: string) => receipts.readReceiver(deliveryId, candidateHash),
    };
    assert.equal((await reconcileNumericDelivery(id, hash, evidence)).status, 'claimed_without_receipt');
    const writes = await Promise.all([receipts.recordAccepted(id, hash), receipts.recordAccepted(id, hash)]);
    assert.deepEqual(writes.sort(), ['duplicate', 'recorded']);
    assert.equal(await receipts.recordAccepted(id, other), 'conflict');
    assert.equal(await receipts.readReceiver(id, other), 'unknown');
    assert.equal((await reconcileNumericDelivery(id, hash, evidence)).status, 'delivered');
    assert.equal(await first.ttl(receiptKey), -1);
    await first.del(claimKey);
    assert.equal((await reconcileNumericDelivery(id, hash, evidence)).status, 'claim_record_absent');
  });

test('real Redis request identity script converges retries and treats corrupt records as uncertain',
  { skip: !process.env.NUMERIC_TEST_REDIS_URL }, async (t) => {
    const first = createClient({ url: process.env.NUMERIC_TEST_REDIS_URL! });
    const second = createClient({ url: process.env.NUMERIC_TEST_REDIS_URL! });
    await Promise.all([first.connect(), second.connect()]);
    const prefix = `test:numeric-request:${randomUUID()}:`;
    const scope = 'architect:test';
    const clientKey = `client:${randomUUID()}`;
    const purpose = 'task-proposal';
    const key = `${prefix}${createHash('sha256').update(JSON.stringify([scope, purpose, clientKey])).digest('hex')}`;
    t.after(async () => { await first.del(key); await Promise.all([first.quit(), second.quit()]); });
    const inputHash = createHash('sha256').update('exact request').digest('hex');
    const otherHash = createHash('sha256').update('changed request').digest('hex');
    const a = new RedisNumericRequestIdentities(first, prefix);
    const b = new RedisNumericRequestIdentities(second, prefix);
    const results = await Promise.all([a.issue(scope, clientKey, purpose, inputHash),
      b.issue(scope, clientKey, purpose, inputHash)]);
    assert.deepEqual(results.map((result) => result.status).sort(), ['existing', 'issued']);
    assert.equal(results[0].requestId, results[1].requestId);
    assert.equal((await a.issue(scope, clientKey, purpose, inputHash)).requestId, results[0].requestId);
    assert.equal((await b.issue(scope, clientKey, purpose, otherHash)).status, 'conflict');
    assert.equal(await first.ttl(key), -1);
    await first.set(key, '{broken');
    assert.equal((await a.issue(scope, clientKey, purpose, inputHash)).status, 'uncertain');
  });

test('real Redis request retry converges to one delivery claim and exact acceptance receipt',
  { skip: !process.env.NUMERIC_TEST_REDIS_URL }, async (t) => {
    const first = createClient({ url: process.env.NUMERIC_TEST_REDIS_URL! });
    const second = createClient({ url: process.env.NUMERIC_TEST_REDIS_URL! });
    await Promise.all([first.connect(), second.connect()]);
    const prefix = `test:numeric-chain:${randomUUID()}:`;
    const scope = 'architect:chain';
    const clientKey = `client:${randomUUID()}`;
    const purpose = 'task-proposal';
    const inputHash = createHash('sha256').update('original task input').digest('hex');
    const candidateHash = createHash('sha256').update('admitted reply').digest('hex');
    const identitiesA = new RedisNumericRequestIdentities(first, `${prefix}request:`);
    const identitiesB = new RedisNumericRequestIdentities(second, `${prefix}request:`);
    const issued = await identitiesA.issue(scope, clientKey, purpose, inputHash);
    assert.equal(issued.status, 'issued');
    const recovered = await identitiesB.issue(scope, clientKey, purpose, inputHash);
    assert.equal(recovered.status, 'existing');
    assert.equal(recovered.requestId, issued.requestId);
    const id = numericDeliveryId(issued.requestId!, purpose)!;
    assert.equal(id, numericDeliveryId(recovered.requestId!, purpose));
    const requestKey = `${prefix}request:${createHash('sha256').update(JSON.stringify([scope, purpose, clientKey])).digest('hex')}`;
    const claimPrefix = `${prefix}claim:`;
    const receiptPrefix = `${prefix}receipt:`;
    const claimKey = `${claimPrefix}${createHash('sha256').update(id).digest('hex')}`;
    const receiptKey = `${receiptPrefix}${createHash('sha256').update(id).digest('hex')}`;
    t.after(async () => {
      await first.del([requestKey, claimKey, receiptKey]);
      await Promise.all([first.quit(), second.quit()]);
    });
    const claimA = new RedisAtomicDeliveryClaims(first, claimPrefix);
    const claimB = new RedisAtomicDeliveryClaims(second, claimPrefix);
    const receipt = new RedisReceiverAcceptanceReceipts(second, receiptPrefix);
    const claimReader = new RedisNumericClaimEvidenceReader(first, claimPrefix);
    const claims = await Promise.all([claimA.claimOnce(id, candidateHash), claimB.claimOnce(id, candidateHash)]);
    assert.deepEqual(claims.sort(), ['claimed', 'duplicate']);
    const evidence = {
      readClaim: (deliveryId: string, hash: string) => claimReader.readClaim(deliveryId, hash),
      readReceiver: (deliveryId: string, hash: string) => receipt.readReceiver(deliveryId, hash),
    };
    assert.equal((await reconcileNumericDelivery(id, candidateHash, evidence)).status, 'claimed_without_receipt');
    assert.equal(await receipt.recordAccepted(id, candidateHash), 'recorded');
    assert.equal((await reconcileNumericDelivery(id, candidateHash, evidence)).status, 'delivered');
    assert.equal((await identitiesA.issue(scope, clientKey, purpose,
      createHash('sha256').update('different task input').digest('hex'))).status, 'conflict');
  });
