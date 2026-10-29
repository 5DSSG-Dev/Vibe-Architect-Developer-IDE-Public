import { computeContractChecksum } from './connectionRuntime';
import type { RelationContract } from './relationEngine';
import {
  canonicalJson,
  sha256Hex,
  verifyWorkLedger,
  type WorkExecutionResult,
  type WorkLedgerEntry
} from './workRequestRuntime';

const EVIDENCE_STORAGE_KEY = 'aegis-vibe-architect.evidence.v1';
// Raised from 1,000 when the Luminary's exchanges joined this record (STP-0002 P19, N34).
export const MAX_EVIDENCE_RECORDS = 5_000;

export type EvidenceKind = 'RELATION_CONTRACT' | 'WORK_REQUEST_RECEIPT' | 'LUMINARY_EXCHANGE';

export interface EvidenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WorkRequestReceipt {
  workRequestId: string;
  state: WorkExecutionResult['state'];
  requestedCapability: string;
  impact: WorkExecutionResult['workRequest']['impact'];
  scope: string[];
  authority: WorkExecutionResult['workRequest']['authority'];
  artifact?: {
    artifactId: string;
    fileName: string;
    mediaType: string;
    sha256: string;
    producedByActuatorId: string;
  };
  ledger: WorkLedgerEntry[];
}

/**
 * One Luminary exchange (STP-0002 P19): every request, result, accept and decline. Long text is kept
 * as an excerpt plus the sha256 of the whole, so the record stays small and still binds the full text.
 */
export type LuminaryExchangeEvent =
  | 'asked' | 'replied' | 'shortfall' | 'stopped'
  | 'offering_accepted' | 'offering_declined'
  | 'task_assigned' | 'task_proposed' | 'task_refused' | 'task_accepted' | 'task_declined' | 'task_decision_failed';

export interface LuminaryExchange {
  exchangeId: string;
  event: LuminaryExchangeEvent;
  conversationId: string;
  detail: Record<string, string | number | boolean | string[] | null>;
}

export interface EvidenceRecord {
  schemaVersion: 1;
  sequence: number;
  recordId: string;
  kind: EvidenceKind;
  subjectId: string;
  recordedAt: string;
  payload: RelationContract | WorkRequestReceipt | LuminaryExchange;
  payloadHash: string;
  previousRecordHash: string | null;
  recordHash: string;
}

export interface EvidenceAppendResult {
  record: EvidenceRecord;
  appended: boolean;
  archiveVerified: true;
}

function resolveStorage(storage?: EvidenceStorage): EvidenceStorage {
  if (storage) return storage;
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('Durable local evidence storage is unavailable.');
  }
  return window.localStorage;
}

function recordBody(record: Omit<EvidenceRecord, 'recordHash'>) {
  return record;
}

async function computeRecordHash(record: Omit<EvidenceRecord, 'recordHash'>): Promise<string> {
  return sha256Hex(canonicalJson(recordBody(record)));
}

export async function verifyEvidenceArchive(records: readonly EvidenceRecord[]): Promise<boolean> {
  let previousRecordHash: string | null = null;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (
      record.schemaVersion !== 1
      || record.sequence !== index + 1
      || record.previousRecordHash !== previousRecordHash
      || record.recordId !== `${record.kind}:${record.subjectId}`
      || await sha256Hex(canonicalJson(record.payload)) !== record.payloadHash
    ) return false;
    const { recordHash, ...body } = record;
    if (await computeRecordHash(body) !== recordHash) return false;
    previousRecordHash = record.recordHash;
  }
  return true;
}

export async function readEvidenceArchive(storage?: EvidenceStorage): Promise<EvidenceRecord[]> {
  const raw = resolveStorage(storage).getItem(EVIDENCE_STORAGE_KEY);
  if (!raw) return [];
  let records: EvidenceRecord[];
  try {
    records = JSON.parse(raw) as EvidenceRecord[];
  } catch {
    throw new Error('Local evidence archive is malformed.');
  }
  if (!Array.isArray(records) || records.length > MAX_EVIDENCE_RECORDS || !await verifyEvidenceArchive(records)) {
    throw new Error('Local evidence archive failed integrity verification.');
  }
  return records;
}

async function appendEvidence(
  kind: EvidenceKind,
  subjectId: string,
  payload: RelationContract | WorkRequestReceipt | LuminaryExchange,
  storage?: EvidenceStorage
): Promise<EvidenceAppendResult> {
  const target = resolveStorage(storage);
  const records = await readEvidenceArchive(target);
  const payloadHash = await sha256Hex(canonicalJson(payload));
  const recordId = `${kind}:${subjectId}`;
  const existing = records.find(record => record.recordId === recordId);
  if (existing) {
    if (existing.payloadHash !== payloadHash) {
      throw new Error(`Conflicting append-only evidence refused for ${recordId}.`);
    }
    return { record: existing, appended: false, archiveVerified: true };
  }
  if (records.length >= MAX_EVIDENCE_RECORDS) {
    throw new Error(`Local evidence archive capacity of ${MAX_EVIDENCE_RECORDS} records reached.`);
  }

  const body: Omit<EvidenceRecord, 'recordHash'> = {
    schemaVersion: 1,
    sequence: records.length + 1,
    recordId,
    kind,
    subjectId,
    recordedAt: new Date().toISOString(),
    payload,
    payloadHash,
    previousRecordHash: records.length > 0 ? records[records.length - 1].recordHash : null
  };
  const record: EvidenceRecord = { ...body, recordHash: await computeRecordHash(body) };
  const next = [...records, record];
  target.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(next));
  if (!await verifyEvidenceArchive(next)) throw new Error('Evidence archive verification failed after append.');
  return { record, appended: true, archiveVerified: true };
}

export async function appendRelationContractEvidence(
  contract: RelationContract,
  storage?: EvidenceStorage
): Promise<EvidenceAppendResult> {
  if (contract.handshakeStatus !== 'SUCCESS' || computeContractChecksum(contract) !== contract.checksum) {
    throw new Error('Unsigned or invalid Relation Contract evidence refused.');
  }
  return appendEvidence('RELATION_CONTRACT', contract.contractId, structuredClone(contract), storage);
}

export async function appendWorkRequestEvidence(
  result: WorkExecutionResult,
  storage?: EvidenceStorage
): Promise<EvidenceAppendResult> {
  if (!await verifyWorkLedger(result.ledger)) {
    throw new Error('Invalid Work Request evidence ledger refused.');
  }
  const receipt: WorkRequestReceipt = {
    workRequestId: result.workRequest.workRequestId,
    state: result.state,
    requestedCapability: result.workRequest.requestedCapability,
    impact: result.workRequest.impact,
    scope: [...result.workRequest.scope],
    authority: { ...result.workRequest.authority },
    artifact: result.artifact ? {
      artifactId: result.artifact.artifactId,
      fileName: result.artifact.fileName,
      mediaType: result.artifact.mediaType,
      sha256: result.artifact.sha256,
      producedByActuatorId: result.artifact.producedByActuatorId
    } : undefined,
    ledger: structuredClone(result.ledger)
  };
  return appendEvidence('WORK_REQUEST_RECEIPT', receipt.workRequestId, receipt, storage);
}

export async function appendLuminaryExchangeEvidence(
  exchange: LuminaryExchange,
  storage?: EvidenceStorage
): Promise<EvidenceAppendResult> {
  if (!exchange.exchangeId || !exchange.event || !exchange.conversationId) throw new Error('An incomplete Luminary exchange record was refused.');
  return appendEvidence('LUMINARY_EXCHANGE', exchange.exchangeId, structuredClone(exchange), storage);
}

export async function exportVerifiedEvidenceArchive(storage?: EvidenceStorage): Promise<string> {
  const records = await readEvidenceArchive(storage);
  return `${JSON.stringify({ schemaVersion: 1, verified: true, records }, null, 2)}\n`;
}
