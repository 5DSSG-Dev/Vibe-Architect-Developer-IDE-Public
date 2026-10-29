import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendLuminaryExchangeEvidence,
  appendRelationContractEvidence,
  appendWorkRequestEvidence,
  exportVerifiedEvidenceArchive,
  readEvidenceArchive,
  verifyEvidenceArchive,
  type EvidenceStorage
} from './evidenceArchive';
import { executeUmbilicalHandshake, severConnection } from './connectionRuntime';
import { registerCustomOrbManifest } from '../contracts/orbManifest';
import { createWorkRequest, executeWorkRequest } from './workRequestRuntime';
import type { ApothecaryItem, SocketBinding } from './relationEngine';

class MemoryStorage implements EvidenceStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function item(): ApothecaryItem {
  const orb: ApothecaryItem = {
    id: 'evidence-orb', name: 'Evidence Orb', category: 'Orbs', trust: 'Canonical',
    description: 'Evidence fixture', version: '1.0.0', memoryReq: 64, threadsReq: 1,
    capabilities: ['evidence'], requirements: []
  };
  return {
    ...orb,
    umbilicalContractRef: registerCustomOrbManifest({
      id: orb.id,
      name: orb.name,
      version: orb.version,
      memoryReq: orb.memoryReq,
      threadsReq: orb.threadsReq,
      capabilities: orb.capabilities,
      requirements: orb.requirements
    }, 'Interface')
  };
}

function socket(): SocketBinding {
  return { id: 'evidence-socket', name: 'Evidence Socket', angleDeg: 0, radius: 1, state: 'Vacant' };
}

async function completedWorkRequest() {
  return executeWorkRequest(createWorkRequest({
    intent: 'Do not persist this raw intent.',
    requestedCapability: 'document.markdown.compose',
    scope: ['workspace:artifact:markdown'],
    impact: 'reversible_local_change',
    authority: { requestedBy: 'architect', approvedBy: 'architect', approvalRef: 'test:evidence' },
    payload: {
      title: 'Private content must be omitted',
      purpose: 'Do not persist this raw purpose.',
      sections: [{ heading: 'Private', body: 'Do not persist this raw body.' }]
    }
  }));
}

test('appends and replays signed Relation Contract evidence idempotently', async () => {
  const storage = new MemoryStorage();
  const contract = executeUmbilicalHandshake(item(), socket());
  const first = await appendRelationContractEvidence(contract, storage);
  const second = await appendRelationContractEvidence(contract, storage);

  assert.equal(first.appended, true);
  assert.equal(second.appended, false);
  assert.equal((await readEvidenceArchive(storage)).length, 1);
  assert.equal(await verifyEvidenceArchive(await readEvidenceArchive(storage)), true);
  severConnection(contract.contractId, 'test cleanup', { fault: true });
});

test('persists a sanitized Work Request receipt without raw intent or artifact content', async () => {
  const storage = new MemoryStorage();
  const result = await completedWorkRequest();
  await appendWorkRequestEvidence(result, storage);
  const exported = await exportVerifiedEvidenceArchive(storage);

  assert.doesNotMatch(exported, /Do not persist this raw/);
  assert.doesNotMatch(exported, /Private content must be omitted/);
  assert.match(exported, /CONDUCTOR_RECEIVED_EVIDENCE/);
  assert.match(exported, new RegExp(result.artifact!.sha256));
});

test('refuses a conflicting duplicate and detects stored tampering', async () => {
  const storage = new MemoryStorage();
  const result = await completedWorkRequest();
  await appendWorkRequestEvidence(result, storage);

  const conflicting = structuredClone(result);
  conflicting.state = 'SHORTFALL';
  await assert.rejects(() => appendWorkRequestEvidence(conflicting, storage), /conflicting append-only evidence/i);

  const key = [...storage.values.keys()][0];
  const records = JSON.parse(storage.values.get(key)!) as Array<{ payload: { state: string } }>;
  records[0].payload.state = 'REFUSED';
  storage.values.set(key, JSON.stringify(records));
  await assert.rejects(() => readEvidenceArchive(storage), /integrity verification/i);
});

test('refuses unsigned or mutated Relation Contract evidence', async () => {
  const storage = new MemoryStorage();
  const contract = executeUmbilicalHandshake(item(), socket());
  contract.sourceItemName = 'Tampered';
  await assert.rejects(() => appendRelationContractEvidence(contract, storage), /invalid Relation Contract/i);
  severConnection(contract.contractId, 'test cleanup', { fault: true });
});

test('Luminary exchanges join the same hash-chained record as Work Request receipts', async () => {
  const storage = new MemoryStorage();
  const receipt = await appendWorkRequestEvidence(await completedWorkRequest(), storage);
  const asked = await appendLuminaryExchangeEvidence({ exchangeId: 'x1', event: 'asked', conversationId: 'c1', detail: { excerpt: 'What is an Orb?', sha256: 'abc', chars: 15, mode: 'DESIGN', level: 'plain', context: [] } }, storage);
  const declined = await appendLuminaryExchangeEvidence({ exchangeId: 'x2', event: 'offering_declined', conversationId: 'c1', detail: { title: 'Orb note' } }, storage);
  assert.equal(asked.record.kind, 'LUMINARY_EXCHANGE');
  assert.equal(asked.record.previousRecordHash, receipt.record.recordHash);
  assert.equal(declined.record.previousRecordHash, asked.record.recordHash);
  const records = await readEvidenceArchive(storage);
  assert.equal(records.length, 3);
  assert.equal(await verifyEvidenceArchive(records), true);
  await assert.rejects(appendLuminaryExchangeEvidence({ exchangeId: 'x1', event: 'replied', conversationId: 'c1', detail: {} }, storage), /Conflicting append-only evidence/);
  await assert.rejects(appendLuminaryExchangeEvidence({ exchangeId: '', event: 'asked', conversationId: 'c1', detail: {} }, storage), /incomplete/);
});
