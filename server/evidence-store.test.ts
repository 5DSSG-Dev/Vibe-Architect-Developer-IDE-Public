import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EvidenceCapacityError,
  EvidenceConflictError,
  EvidenceIntegrityError,
  EvidenceService,
  InMemoryEvidenceStore,
  RedisEvidenceStore,
  canonicalJson,
  sha256Hex,
  type EvidenceRecord,
  type RedisEvidenceClient,
} from './evidence-store.js';

class FakeRedisEvidenceClient implements RedisEvidenceClient {
  isOpen = true;
  readonly values = new Map<string, string>();
  readonly lists = new Map<string, string[]>();
  on(): unknown { return this; }
  async connect(): Promise<void> {}
  async eval(_script: string, options: { keys: string[]; arguments: string[] }): Promise<number> {
    const [recordKey, streamKey, globalKey, tailKey] = options.keys;
    const [serialized, expectedTail, integrityHash, evidenceId] = options.arguments;
    const existing = this.values.get(recordKey);
    if (existing !== undefined) return existing === serialized ? 0 : -1;
    if ((this.values.get(tailKey) ?? '') !== expectedTail) return -2;
    this.values.set(recordKey, serialized);
    this.lists.set(streamKey, [...(this.lists.get(streamKey) ?? []), evidenceId]);
    this.lists.set(globalKey, [...(this.lists.get(globalKey) ?? []), evidenceId]);
    this.values.set(tailKey, integrityHash);
    return 1;
  }
  async get(key: string): Promise<string | null> { return this.values.get(key) ?? null; }
  async mGet(keys: string[]): Promise<Array<string | null>> { return keys.map(key => this.values.get(key) ?? null); }
  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) ?? [];
    return list.slice(start, stop < 0 ? undefined : stop + 1);
  }
  async lPos(key: string, element: string): Promise<number | null> {
    const position = (this.lists.get(key) ?? []).indexOf(element);
    return position < 0 ? null : position;
  }
  async close(): Promise<void> { this.isOpen = false; }
}

function relationContract(overrides: Record<string, unknown> = {}) {
  const body = {
    contractId: 'ctr-test-1',
    timestamp: '2026-08-14T12:00:00.000Z',
    sourceItemId: 'orb-test',
    sourceItemName: 'Test Orb',
    targetSocketId: 'socket-test',
    targetSocketName: 'Test Socket',
    handshakeCompletedStep: 9,
    handshakeStatus: 'SUCCESS',
    negativeSpaceInvariants: {
      never_serializes_witness: true,
      never_persists_prompts: true,
      no_verdict_over_inner_life: true,
      no_unilateral_disconnection: true,
      no_capability_without_contract: true,
    },
    capabilitiesExchanged: ['observe'],
    negotiatedProtocolVersion: '4D-VIBE-v1.0',
    allocatedMemoryMB: 64,
    allocatedThreads: 1,
    ...overrides,
  };
  return { ...body, checksum: `sha256:${sha256Hex(canonicalJson(body))}` };
}

function ledgerEntry(sequence: number, previousHash: string | null, overrides: Record<string, unknown> = {}) {
  const body = {
    sequence,
    eventId: `event-${sequence}`,
    workRequestId: 'work-test-1',
    stage: sequence === 1 ? 'WORK_REQUEST_CREATED' : 'CONDUCTOR_ANALYZED',
    actorId: sequence === 1 ? 'tracey' : 'conductor',
    observedAt: `2026-08-14T12:00:0${sequence}.000Z`,
    summary: `Evidence ${sequence}`,
    evidence: {},
    previousHash,
    ...overrides,
  };
  return { ...body, entryHash: sha256Hex(canonicalJson(body)) };
}

test('Relation Contract evidence is append-only and identical duplicates are idempotent', async () => {
  const service = new EvidenceService(new InMemoryEvidenceStore());
  const contract = relationContract();

  const first = await service.appendRelationContract(contract);
  const duplicate = await service.appendRelationContract(contract);
  assert.equal(first.status, 'appended');
  assert.equal(duplicate.status, 'idempotent');

  const stream = await service.readRelationContract('ctr-test-1');
  assert.equal(stream.length, 1);
  assert.equal(stream[0].integrityHash, first.record.integrityHash);
  assert.deepEqual((await service.replay()).records.map(record => record.evidenceId), ['relation:ctr-test-1']);
});

test('conflicting or malformed Relation Contract evidence is refused', async () => {
  const service = new EvidenceService(new InMemoryEvidenceStore());
  await service.appendRelationContract(relationContract());

  await assert.rejects(
    () => service.appendRelationContract(relationContract({ allocatedMemoryMB: 128 })),
    EvidenceConflictError,
  );
  await assert.rejects(
    () => service.appendRelationContract({ ...relationContract({ contractId: 'ctr-bad' }), checksum: 'sha256:00' }),
    EvidenceIntegrityError,
  );
  await assert.rejects(
    () => service.appendRelationContract(relationContract({ contractId: 'ctr-failed', handshakeStatus: 'FAILED', failureReason: 'refused' })),
    /Only successfully signed Relation Contracts/,
  );
});

test('Work Request ledger evidence requires exact source and service hash chains', async () => {
  const service = new EvidenceService(new InMemoryEvidenceStore());
  const first = ledgerEntry(1, null);
  const second = ledgerEntry(2, first.entryHash);

  await service.appendWorkLedgerEntry(first);
  await service.appendWorkLedgerEntry(second);
  const stream = await service.readWorkLedger('work-test-1');
  assert.equal(stream.length, 2);
  assert.equal(stream[1].previousIntegrityHash, stream[0].integrityHash);
  assert.equal((await service.verifyIntegrity()).valid, true);

  await assert.rejects(
    () => service.appendWorkLedgerEntry(ledgerEntry(4, second.entryHash, { eventId: 'event-gap' })),
    EvidenceConflictError,
  );
  await assert.rejects(
    () => service.appendWorkLedgerEntry({ ...ledgerEntry(3, second.entryHash), summary: 'tampered after hashing' }),
    EvidenceIntegrityError,
  );
});

test('Work Request evidence refuses semantically invalid stage transitions', async () => {
  const service = new EvidenceService(new InMemoryEvidenceStore());
  const invalidFirst = ledgerEntry(1, null, { stage: 'ACTUATOR_EMPLOYED' });
  await assert.rejects(
    () => service.appendWorkLedgerEntry(invalidFirst),
    /invalid stage transition START -> ACTUATOR_EMPLOYED/,
  );
});

test('read and replay refuse persisted evidence that no longer verifies', async () => {
  const store = new InMemoryEvidenceStore();
  const service = new EvidenceService(store);
  const appended = await service.appendRelationContract(relationContract());
  const internal = store as unknown as { records: Map<string, EvidenceRecord> };
  internal.records.get(appended.record.evidenceId)!.payload = { attackerControlled: true };

  await assert.rejects(() => service.readRelationContract('ctr-test-1'), EvidenceIntegrityError);
  await assert.rejects(() => service.replay(), EvidenceIntegrityError);
  assert.equal((await service.verifyIntegrity()).valid, false);
});

test('development in-memory evidence is bounded and unknown replay cursors fail closed', async () => {
  const service = new EvidenceService(new InMemoryEvidenceStore(1));
  await service.appendRelationContract(relationContract());
  await assert.rejects(
    () => service.appendRelationContract(relationContract({ contractId: 'ctr-test-2' })),
    EvidenceCapacityError,
  );
  await assert.rejects(() => service.replay({ after: 'missing-cursor' }), EvidenceConflictError);
});

test('Redis evidence remains durable across service instances and closes cleanly', async () => {
  const client = new FakeRedisEvidenceClient();
  const writer = new EvidenceService(new RedisEvidenceStore(client, 'test:evidence:'));
  const contract = relationContract({ contractId: 'ctr-redis' });
  assert.equal((await writer.appendRelationContract(contract)).status, 'appended');
  assert.equal((await writer.appendRelationContract(contract)).status, 'idempotent');

  const durableStore = new RedisEvidenceStore(client, 'test:evidence:');
  const reader = new EvidenceService(durableStore);
  assert.equal(durableStore.durable, true);
  assert.equal((await reader.readRelationContract('ctr-redis')).length, 1);
  assert.equal((await reader.verifyIntegrity()).valid, true);
  await durableStore.close();
  assert.equal(client.isOpen, false);
});
