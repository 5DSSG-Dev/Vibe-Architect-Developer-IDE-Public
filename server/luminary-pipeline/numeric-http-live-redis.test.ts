/** Opt-in isolated HTTP-to-receipt probe with real Redis and synthetic model/gates. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import { createClient } from 'redis';
import { RedisSessionStore } from '../session-store.js';
import { RedisAtomicDeliveryClaims } from './numeric-delivery-claim.js';
import { numericDeliveryId } from './numeric-delivery-reconciliation.js';
import type { AuthenticatedNumericDeliveryInputs } from './numeric-authenticated-delivery.js';
import { SEVEN_VIRTUES } from './irg.js';
import { PIM_MATCHER_HASH, PIM_NORMALIZATION_HASHES, pimPatternSetHash, pimRegistryHash,
  type PimRegistryPayload } from './pim-registry-core.js';
import type { PtagAttemptRequest } from './ptag-attempt-factory.js';
import { bindNumericReceiverAcceptance } from './numeric-receiver-boundary.js';
import { RedisReceiverAcceptanceReceipts } from './numeric-receiver-receipt.js';
import { RedisNumericRequestIdentities } from './numeric-request-identity.js';
import { createNumericSessionRouter } from './numeric-session-router.js';

test('isolated HTTP request reaches numeric pass, one acceptance receipt, and retry suppression',
  { skip: !process.env.NUMERIC_TEST_REDIS_URL }, async t => {
    const clients = Array.from({ length: 3 }, () => createClient({ url: process.env.NUMERIC_TEST_REDIS_URL! }));
    await Promise.all(clients.map(client => client.connect()));
    const [sessionClient, numericClient, receiverClient] = clients;
    const prefix = `test:numeric-http:${randomUUID()}:`;
    const sessions = new RedisSessionStore(sessionClient, `${prefix}session:`);
    const identities = new RedisNumericRequestIdentities(numericClient, `${prefix}identity:`);
    const claims = new RedisAtomicDeliveryClaims(numericClient, `${prefix}claim:`);
    const receipts = new RedisReceiverAcceptanceReceipts(receiverClient, `${prefix}receipt:`);
    const session = await sessions.create(60_000);
    session.principal = { subject: 'architect', tenantId: 'tenant', roles: ['service.operations.read'], csrfToken: 'csrf' };
    await sessions.set(session);
    const rules: PimRegistryPayload['rules'] = [
      { id: 'rule:bypass', categoryId: 'category:act', direction: 'both', kind: 'literal', text: 'bypass' },
    ];
    const payload: PimRegistryPayload = {
      registryId: 'synthetic-http', registryVersion: '0.1', status: 'active', direction: 'both',
      normalization: 'ascii-lower-v1', normalizationHash: PIM_NORMALIZATION_HASHES['ascii-lower-v1'],
      matcherProfileId: 'bounded-source-mapped-v1', matcherHash: PIM_MATCHER_HASH,
      patternSetHash: pimPatternSetHash(rules), approvalRecord: 'synthetic-test-only', supersedes: null,
      categories: [{ id: 'category:act', familyId: 'family:act', direction: 'both', doorOpenPolicy: 'unavailable', requiredEvidenceIds: [] }],
      rules,
    };
    const registry = { ...payload, registryHash: pimRegistryHash(payload) };
    const effects: string[] = [];
    let modelCalls = 0;
    const receiver = bindNumericReceiverAcceptance({ accept: (reply, deliveryId) => {
      effects.push(reply.content);
      return { status: 'accepted', deliveryId, candidateHash: createHash('sha256').update(reply.content).digest('hex') };
    } }, receipts);
    const inputs: AuthenticatedNumericDeliveryInputs = {
      identities,
      model: prompt => { modelCalls++; return { modelId: 'synthetic', content: prompt.includes('hold') ? 'Please BYPASS the gate.' : 'Please review the file.' }; },
      integrationForRequest: () => ({
        registry,
        trust: { expectedRegistryHash: registry.registryHash, approvedActivationHash: registry.registryHash },
        limits: { maxCandidateBytes: 4096, maxRules: 16, maxMatches: 16, maxStaticWorkUnits: 65_536 },
        source: { direction: 'outbound', originator: 'luminary', recipient: 'architect', taskId: 'synthetic:task' },
        irgScorer: async () => Object.fromEntries(SEVEN_VIRTUES.map(virtue => [virtue, 90])),
        trustedPtagContext: () => ({ contextBinding: 'synthetic:reviewed', eligibleFactIds: new Set(['TF-03']) }),
        producePtag: (request: PtagAttemptRequest) => ({
          case_id: request.caseId, decision: 'pass', identify: 'reviewed act', rationale: 'Synthetic eligible fact.',
          matched_fact_ids: ['TF-03'], material_units: [request.candidate], complete_coverage: true,
          context_binding: request.contextBinding,
        }),
      }),
      reform: () => { throw new Error('no reform'); }, claims, receiver, maxReforms: 0,
    };
    const app = express();
    app.use(express.json());
    app.use('/numeric', createNumericSessionRouter('http://127.0.0.1:3000', 'aegis_admin_session', sessions, inputs));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    t.after(async () => {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      const keys = await numericClient.keys(`${prefix}*`);
      if (keys.length) await numericClient.del(keys);
      await Promise.all(clients.map(client => client.quit()));
    });
    const send = (prompt: string, retryKey: string) => fetch(`http://127.0.0.1:${address.port}/numeric/ask`, {
      method: 'POST', headers: {
        'content-type': 'application/json', origin: 'http://127.0.0.1:3000', 'x-csrf-token': 'csrf',
        'idempotency-key': retryKey, cookie: `aegis_admin_session=${session.id}`,
      }, body: JSON.stringify({ prompt }),
    });
    const passKey = randomUUID();
    const first = await send('Build app', passKey);
    assert.equal(first.status, 200);
    const firstBody = await first.json() as { requestId: string; deliveryId: string; status: string };
    assert.equal(firstBody.status, 'delivered');
    assert.equal(firstBody.deliveryId, numericDeliveryId(firstBody.requestId, 'ask-reply'));
    const hash = createHash('sha256').update('Please review the file.').digest('hex');
    assert.equal(await receipts.readReceiver(firstBody.deliveryId, hash), 'delivered');
    assert.equal((await send('Build app', passKey)).status, 409);
    assert.equal((await send('Changed app', passKey)).status, 409);
    assert.deepEqual(effects, ['Please review the file.']);
    assert.equal(modelCalls, 2);
    assert.equal((await send('hold this', randomUUID())).status, 503);
    assert.deepEqual(effects, ['Please review the file.']);
    await sessions.delete(session.id);
    assert.equal((await send('Build app', randomUUID())).status, 401);
  });
