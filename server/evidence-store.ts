import { createHash } from 'node:crypto';
import { createClient } from 'redis';

export type EvidenceKind = 'relation_contract' | 'work_ledger_entry';

export interface EvidenceRecord {
  schemaVersion: 'aegis-evidence-v1';
  evidenceId: string;
  kind: EvidenceKind;
  streamId: string;
  sourceSequence: number;
  observedAt: string;
  payload: Record<string, unknown>;
  sourceHash: string;
  previousIntegrityHash: string | null;
  integrityHash: string;
}

export interface EvidenceAppendResult {
  status: 'appended' | 'idempotent';
  record: EvidenceRecord;
}

export interface EvidenceReplayResult {
  records: EvidenceRecord[];
  nextCursor: string | null;
}

export interface EvidenceStore {
  readonly durable: boolean;
  append(record: EvidenceRecord): Promise<'appended' | 'idempotent'>;
  get(evidenceId: string): Promise<EvidenceRecord | undefined>;
  readStream(kind: EvidenceKind, streamId: string): Promise<EvidenceRecord[]>;
  replay(after: string | undefined, limit: number): Promise<EvidenceReplayResult>;
  close?(): Promise<void>;
}

export class EvidenceValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'EvidenceValidationError'; }
}

export class EvidenceIntegrityError extends Error {
  constructor(message: string) { super(message); this.name = 'EvidenceIntegrityError'; }
}

export class EvidenceConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'EvidenceConflictError'; }
}

export class EvidenceCapacityError extends Error {
  constructor() { super('The bounded in-memory evidence store has reached capacity.'); this.name = 'EvidenceCapacityError'; }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  if (serialized === undefined) throw new EvidenceValidationError('Evidence must be JSON serializable.');
  return serialized;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EvidenceValidationError(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 512) throw new EvidenceValidationError(`${field} must be a bounded non-empty string.`);
  return value;
}

function timestamp(value: unknown, field: string): string {
  const result = text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) || Number.isNaN(Date.parse(result))) {
    throw new EvidenceValidationError(`${field} must be an ISO-8601 UTC timestamp.`);
  }
  return result;
}

function integer(value: unknown, field: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new EvidenceValidationError(`${field} must be a safe integer >= ${minimum}.`);
  return value as number;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new EvidenceValidationError(`${field} must be boolean.`);
  return value;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 256) throw new EvidenceValidationError(`${field} must be a bounded string array.`);
  return value.map((entry, index) => text(entry, `${field}[${index}]`));
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const extra = Object.keys(value).filter(key => !allowed.includes(key));
  if (extra.length > 0) throw new EvidenceValidationError(`${field} contains unsupported fields: ${extra.join(', ')}.`);
}

function jsonValue(value: unknown, field: string, depth = 0): void {
  if (depth > 16) throw new EvidenceValidationError(`${field} exceeds the maximum nesting depth.`);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new EvidenceValidationError(`${field} contains a non-finite number.`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 256) throw new EvidenceValidationError(`${field} exceeds the maximum array length.`);
    value.forEach((child, index) => jsonValue(child, `${field}[${index}]`, depth + 1));
    return;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 256) throw new EvidenceValidationError(`${field} exceeds the maximum field count.`);
    for (const [key, child] of entries) {
      if (key.length === 0 || key.length > 128 || ['__proto__', 'prototype', 'constructor'].includes(key)) {
        throw new EvidenceValidationError(`${field} contains an unsafe or unbounded field name.`);
      }
      jsonValue(child, `${field}.${key}`, depth + 1);
    }
    return;
  }
  throw new EvidenceValidationError(`${field} contains a non-JSON value.`);
}

const INVARIANTS = [
  'never_serializes_witness',
  'never_persists_prompts',
  'no_verdict_over_inner_life',
  'no_unilateral_disconnection',
  'no_capability_without_contract',
] as const;

const RELATION_KEYS = [
  'contractId', 'timestamp', 'sourceItemId', 'sourceItemName', 'targetSocketId', 'targetSocketName',
  'handshakeCompletedStep', 'handshakeStatus', 'negativeSpaceInvariants', 'capabilitiesExchanged',
  'negotiatedProtocolVersion', 'allocatedMemoryMB', 'allocatedThreads', 'checksum', 'failureReason',
] as const;

function validateRelationContract(value: unknown): Record<string, unknown> {
  const contract = record(value, 'Relation Contract');
  exactKeys(contract, RELATION_KEYS, 'Relation Contract');
  text(contract.contractId, 'contractId');
  timestamp(contract.timestamp, 'timestamp');
  text(contract.sourceItemId, 'sourceItemId');
  text(contract.sourceItemName, 'sourceItemName');
  text(contract.targetSocketId, 'targetSocketId');
  text(contract.targetSocketName, 'targetSocketName');
  integer(contract.handshakeCompletedStep, 'handshakeCompletedStep', 0);
  if (contract.handshakeStatus !== 'SUCCESS') {
    throw new EvidenceIntegrityError('Only successfully signed Relation Contracts may enter the contract evidence stream.');
  }
  const invariants = record(contract.negativeSpaceInvariants, 'negativeSpaceInvariants');
  exactKeys(invariants, INVARIANTS, 'negativeSpaceInvariants');
  for (const name of INVARIANTS) {
    if (boolean(invariants[name], `negativeSpaceInvariants.${name}`) !== true) throw new EvidenceIntegrityError(`Required invariant ${name} is not true.`);
  }
  stringArray(contract.capabilitiesExchanged, 'capabilitiesExchanged');
  text(contract.negotiatedProtocolVersion, 'negotiatedProtocolVersion');
  integer(contract.allocatedMemoryMB, 'allocatedMemoryMB');
  integer(contract.allocatedThreads, 'allocatedThreads');
  if (contract.failureReason !== undefined) {
    throw new EvidenceIntegrityError('A signed Relation Contract cannot contain a failureReason.');
  }
  const checksum = text(contract.checksum, 'checksum');
  if (!/^sha256:[a-f0-9]{64}$/.test(checksum)) throw new EvidenceIntegrityError('Relation Contract checksum format is invalid.');
  const { checksum: _checksum, ...body } = contract;
  if (`sha256:${sha256Hex(canonicalJson(body))}` !== checksum) throw new EvidenceIntegrityError('Relation Contract checksum verification failed.');
  return clone(contract);
}

const WORK_STAGES = new Set([
  'WORK_REQUEST_CREATED', 'CONDUCTOR_ANALYZED', 'ORBITAL_DISPATCHED', 'SATELLITE_ASSIGNED',
  'ACTUATOR_EMPLOYED', 'ARTIFACT_PRODUCED', 'ASSURANCE_VERIFIED', 'ACTUATOR_STOOD_DOWN',
  'SATELLITE_RECEIVED_EVIDENCE', 'ORBITAL_RETURNED_EVIDENCE', 'CONDUCTOR_RECEIVED_EVIDENCE',
  'WORK_REQUEST_REFUSED', 'SHORTFALL_RECORDED',
]);

const WORK_STAGE_TRANSITIONS = new Map<string | null, ReadonlySet<string>>([
  [null, new Set(['WORK_REQUEST_CREATED'])],
  ['WORK_REQUEST_CREATED', new Set(['CONDUCTOR_ANALYZED'])],
  ['CONDUCTOR_ANALYZED', new Set(['ORBITAL_DISPATCHED', 'WORK_REQUEST_REFUSED', 'SHORTFALL_RECORDED'])],
  ['ORBITAL_DISPATCHED', new Set(['SATELLITE_ASSIGNED'])],
  ['SATELLITE_ASSIGNED', new Set(['ACTUATOR_EMPLOYED', 'SHORTFALL_RECORDED'])],
  ['ACTUATOR_EMPLOYED', new Set(['ARTIFACT_PRODUCED'])],
  ['ARTIFACT_PRODUCED', new Set(['ACTUATOR_STOOD_DOWN'])],
  ['ACTUATOR_STOOD_DOWN', new Set(['ASSURANCE_VERIFIED', 'SHORTFALL_RECORDED'])],
  ['ASSURANCE_VERIFIED', new Set(['SATELLITE_RECEIVED_EVIDENCE'])],
  ['SATELLITE_RECEIVED_EVIDENCE', new Set(['ORBITAL_RETURNED_EVIDENCE'])],
  ['ORBITAL_RETURNED_EVIDENCE', new Set(['CONDUCTOR_RECEIVED_EVIDENCE'])],
  ['CONDUCTOR_RECEIVED_EVIDENCE', new Set()],
  ['WORK_REQUEST_REFUSED', new Set()],
  ['SHORTFALL_RECORDED', new Set()],
]);

const LEDGER_KEYS = [
  'sequence', 'eventId', 'workRequestId', 'stage', 'actorId', 'observedAt', 'summary',
  'evidence', 'previousHash', 'entryHash',
] as const;

function validateWorkLedgerEntry(value: unknown): Record<string, unknown> {
  const entry = record(value, 'Work Request ledger entry');
  exactKeys(entry, LEDGER_KEYS, 'Work Request ledger entry');
  integer(entry.sequence, 'sequence', 1);
  text(entry.eventId, 'eventId');
  text(entry.workRequestId, 'workRequestId');
  if (typeof entry.stage !== 'string' || !WORK_STAGES.has(entry.stage)) throw new EvidenceValidationError('stage is invalid.');
  text(entry.actorId, 'actorId');
  timestamp(entry.observedAt, 'observedAt');
  text(entry.summary, 'summary');
  record(entry.evidence, 'evidence');
  jsonValue(entry.evidence, 'evidence');
  if (entry.previousHash !== null && (typeof entry.previousHash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.previousHash))) {
    throw new EvidenceIntegrityError('previousHash format is invalid.');
  }
  if (typeof entry.entryHash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.entryHash)) throw new EvidenceIntegrityError('entryHash format is invalid.');
  const { entryHash, ...body } = entry;
  if (sha256Hex(canonicalJson(body)) !== entryHash) throw new EvidenceIntegrityError('Work Request ledger entry hash verification failed.');
  return clone(entry);
}

function envelopeHash(recordValue: Omit<EvidenceRecord, 'integrityHash'>): string {
  return sha256Hex(canonicalJson(recordValue));
}

function verifyRecord(recordValue: EvidenceRecord): void {
  const envelope = record(recordValue, 'Evidence envelope');
  exactKeys(envelope, [
    'schemaVersion', 'evidenceId', 'kind', 'streamId', 'sourceSequence', 'observedAt', 'payload',
    'sourceHash', 'previousIntegrityHash', 'integrityHash',
  ], 'Evidence envelope');
  if (recordValue.schemaVersion !== 'aegis-evidence-v1') throw new EvidenceIntegrityError('Evidence schema version is invalid.');
  text(recordValue.evidenceId, 'evidenceId');
  if (!['relation_contract', 'work_ledger_entry'].includes(recordValue.kind)) throw new EvidenceIntegrityError('Evidence kind is invalid.');
  text(recordValue.streamId, 'streamId');
  integer(recordValue.sourceSequence, 'sourceSequence', 1);
  timestamp(recordValue.observedAt, 'observedAt');
  record(recordValue.payload, 'payload');
  if (recordValue.previousIntegrityHash !== null && !/^[a-f0-9]{64}$/.test(recordValue.previousIntegrityHash)) {
    throw new EvidenceIntegrityError('Evidence previousIntegrityHash format is invalid.');
  }
  const { integrityHash, ...body } = recordValue;
  if (!/^[a-f0-9]{64}$/.test(integrityHash) || envelopeHash(body) !== integrityHash) {
    throw new EvidenceIntegrityError(`Evidence envelope ${recordValue.evidenceId} failed integrity verification.`);
  }
  if (recordValue.kind === 'relation_contract') {
    const payload = validateRelationContract(recordValue.payload);
    if (payload.contractId !== recordValue.streamId || recordValue.sourceSequence !== 1 || payload.checksum !== recordValue.sourceHash
      || payload.timestamp !== recordValue.observedAt || recordValue.evidenceId !== `relation:${recordValue.streamId}`) {
      throw new EvidenceIntegrityError(`Relation Contract envelope ${recordValue.evidenceId} disagrees with its source.`);
    }
  } else {
    const payload = validateWorkLedgerEntry(recordValue.payload);
    if (payload.workRequestId !== recordValue.streamId || payload.sequence !== recordValue.sourceSequence || payload.entryHash !== recordValue.sourceHash
      || payload.observedAt !== recordValue.observedAt || recordValue.evidenceId !== `work:${recordValue.streamId}:${payload.eventId as string}`) {
      throw new EvidenceIntegrityError(`Work ledger envelope ${recordValue.evidenceId} disagrees with its source.`);
    }
  }
}

function verifyStream(records: readonly EvidenceRecord[]): void {
  let previous: string | null = null;
  let previousWorkStage: string | null = null;
  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    verifyRecord(current);
    if (current.previousIntegrityHash !== previous || current.sourceSequence !== index + 1) {
      throw new EvidenceIntegrityError(`Evidence stream ${current.streamId} has a chain discontinuity.`);
    }
    if (current.kind === 'work_ledger_entry') {
      const sourcePrevious = current.payload.previousHash;
      const expectedSourcePrevious = index === 0 ? null : records[index - 1].sourceHash;
      if (sourcePrevious !== expectedSourcePrevious) throw new EvidenceIntegrityError(`Work ledger ${current.streamId} has a source-chain discontinuity.`);
      const stage = current.payload.stage as string;
      if (!WORK_STAGE_TRANSITIONS.get(previousWorkStage)?.has(stage)) {
        throw new EvidenceIntegrityError(`Work ledger ${current.streamId} has invalid stage transition ${previousWorkStage ?? 'START'} -> ${stage}.`);
      }
      previousWorkStage = stage;
    }
    previous = current.integrityHash;
  }
}

export class InMemoryEvidenceStore implements EvidenceStore {
  readonly durable = false;
  private readonly records = new Map<string, EvidenceRecord>();
  private readonly streams = new Map<string, string[]>();
  private readonly order: string[] = [];

  constructor(private readonly maxRecords = 10_000) {
    if (!Number.isInteger(maxRecords) || maxRecords <= 0) throw new TypeError('maxRecords must be a positive integer.');
  }

  async append(recordValue: EvidenceRecord): Promise<'appended' | 'idempotent'> {
    const serialized = canonicalJson(recordValue);
    const existing = this.records.get(recordValue.evidenceId);
    if (existing) {
      if (canonicalJson(existing) === serialized) return 'idempotent';
      throw new EvidenceConflictError(`Evidence ID ${recordValue.evidenceId} already has different content.`);
    }
    if (this.records.size >= this.maxRecords) throw new EvidenceCapacityError();
    const key = this.streamKey(recordValue.kind, recordValue.streamId);
    const stream = this.streams.get(key) ?? [];
    const tail = stream.length > 0 ? this.records.get(stream[stream.length - 1])!.integrityHash : null;
    if (recordValue.previousIntegrityHash !== tail) throw new EvidenceConflictError(`Evidence stream ${recordValue.streamId} advanced concurrently.`);
    this.records.set(recordValue.evidenceId, clone(recordValue));
    this.streams.set(key, [...stream, recordValue.evidenceId]);
    this.order.push(recordValue.evidenceId);
    return 'appended';
  }

  async get(evidenceId: string): Promise<EvidenceRecord | undefined> {
    const value = this.records.get(evidenceId);
    return value ? clone(value) : undefined;
  }

  async readStream(kind: EvidenceKind, streamId: string): Promise<EvidenceRecord[]> {
    return (this.streams.get(this.streamKey(kind, streamId)) ?? []).map(id => clone(this.records.get(id)!));
  }

  async replay(after: string | undefined, limit: number): Promise<EvidenceReplayResult> {
    let start = 0;
    if (after) {
      const position = this.order.indexOf(after);
      if (position < 0) throw new EvidenceConflictError('Replay cursor is unknown.');
      start = position + 1;
    }
    const ids = this.order.slice(start, start + limit);
    return {
      records: ids.map(id => clone(this.records.get(id)!)),
      nextCursor: start + ids.length < this.order.length && ids.length > 0 ? ids[ids.length - 1] : null,
    };
  }

  async close(): Promise<void> {}

  private streamKey(kind: EvidenceKind, streamId: string): string { return `${kind}:${streamId}`; }
}

export interface RedisEvidenceClient {
  readonly isOpen: boolean;
  on(event: 'error', listener: (error: Error) => void): unknown;
  connect(): Promise<unknown>;
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
  get(key: string): Promise<string | null>;
  mGet(keys: string[]): Promise<Array<string | null>>;
  lRange(key: string, start: number, stop: number): Promise<string[]>;
  lPos(key: string, element: string): Promise<number | null>;
  close(): Promise<unknown>;
}

const APPEND_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing then
  if existing == ARGV[1] then return 0 end
  return -1
end
local tail = redis.call('GET', KEYS[4])
if not tail then tail = '' end
if tail ~= ARGV[2] then return -2 end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('RPUSH', KEYS[2], ARGV[4])
redis.call('RPUSH', KEYS[3], ARGV[4])
redis.call('SET', KEYS[4], ARGV[3])
return 1
`;

export class RedisEvidenceStore implements EvidenceStore {
  readonly durable = true;

  constructor(private readonly client: RedisEvidenceClient, private readonly prefix = 'aegis:evidence:') {}

  static async connect(url: string): Promise<RedisEvidenceStore> {
    if (!url) throw new Error('A Redis URL is required for durable evidence.');
    const client = createClient({ url }) as unknown as RedisEvidenceClient;
    client.on('error', error => console.error('Redis evidence store error', error));
    await client.connect();
    return new RedisEvidenceStore(client);
  }

  async append(recordValue: EvidenceRecord): Promise<'appended' | 'idempotent'> {
    const result = Number(await this.client.eval(APPEND_SCRIPT, {
      keys: [this.recordKey(recordValue.evidenceId), this.streamKey(recordValue.kind, recordValue.streamId), this.globalKey(), this.tailKey(recordValue.kind, recordValue.streamId)],
      arguments: [canonicalJson(recordValue), recordValue.previousIntegrityHash ?? '', recordValue.integrityHash, recordValue.evidenceId],
    }));
    if (result === 1) return 'appended';
    if (result === 0) return 'idempotent';
    if (result === -1) throw new EvidenceConflictError(`Evidence ID ${recordValue.evidenceId} already has different content.`);
    throw new EvidenceConflictError(`Evidence stream ${recordValue.streamId} advanced concurrently.`);
  }

  async get(evidenceId: string): Promise<EvidenceRecord | undefined> {
    const serialized = await this.client.get(this.recordKey(evidenceId));
    return serialized ? this.parse(serialized) : undefined;
  }

  async readStream(kind: EvidenceKind, streamId: string): Promise<EvidenceRecord[]> {
    return this.readIds(await this.client.lRange(this.streamKey(kind, streamId), 0, -1));
  }

  async replay(after: string | undefined, limit: number): Promise<EvidenceReplayResult> {
    let start = 0;
    if (after) {
      const position = await this.client.lPos(this.globalKey(), after);
      if (position === null) throw new EvidenceConflictError('Replay cursor is unknown.');
      start = position + 1;
    }
    const ids = await this.client.lRange(this.globalKey(), start, start + limit);
    const hasMore = ids.length > limit;
    const page = hasMore ? ids.slice(0, limit) : ids;
    return { records: await this.readIds(page), nextCursor: hasMore && page.length > 0 ? page[page.length - 1] : null };
  }

  async close(): Promise<void> { if (this.client.isOpen) await this.client.close(); }

  private async readIds(ids: string[]): Promise<EvidenceRecord[]> {
    if (ids.length === 0) return [];
    const values = await this.client.mGet(ids.map(id => this.recordKey(id)));
    if (values.some(value => value === null)) throw new EvidenceIntegrityError('Durable evidence index references a missing record.');
    return values.map(value => this.parse(value!));
  }

  private parse(serialized: string): EvidenceRecord {
    try { return JSON.parse(serialized) as EvidenceRecord; }
    catch { throw new EvidenceIntegrityError('Durable evidence contains malformed JSON.'); }
  }
  private recordKey(id: string): string { return `${this.prefix}record:${id}`; }
  private streamKey(kind: EvidenceKind, id: string): string { return `${this.prefix}stream:${kind}:${id}`; }
  private tailKey(kind: EvidenceKind, id: string): string { return `${this.prefix}tail:${kind}:${id}`; }
  private globalKey(): string { return `${this.prefix}global`; }
}

export class EvidenceService {
  constructor(readonly store: EvidenceStore) {}

  async appendRelationContract(value: unknown): Promise<EvidenceAppendResult> {
    const payload = validateRelationContract(value);
    return this.append({
      evidenceId: `relation:${payload.contractId as string}`,
      kind: 'relation_contract',
      streamId: payload.contractId as string,
      sourceSequence: 1,
      observedAt: payload.timestamp as string,
      payload,
      sourceHash: payload.checksum as string,
    });
  }

  async appendWorkLedgerEntry(value: unknown): Promise<EvidenceAppendResult> {
    const payload = validateWorkLedgerEntry(value);
    return this.append({
      evidenceId: `work:${payload.workRequestId as string}:${payload.eventId as string}`,
      kind: 'work_ledger_entry',
      streamId: payload.workRequestId as string,
      sourceSequence: payload.sequence as number,
      observedAt: payload.observedAt as string,
      payload,
      sourceHash: payload.entryHash as string,
    });
  }

  async readRelationContract(contractId: string): Promise<EvidenceRecord[]> {
    return this.readStream('relation_contract', text(contractId, 'contractId'));
  }

  async readWorkLedger(workRequestId: string): Promise<EvidenceRecord[]> {
    return this.readStream('work_ledger_entry', text(workRequestId, 'workRequestId'));
  }

  async replay(options: { after?: string; limit?: number } = {}): Promise<EvidenceReplayResult> {
    const limit = options.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new EvidenceValidationError('Replay limit must be an integer from 1 through 100.');
    const result = await this.store.replay(options.after, limit);
    const streams = new Set<string>();
    for (const item of result.records) {
      verifyRecord(item);
      streams.add(`${item.kind}:${item.streamId}`);
    }
    for (const key of streams) {
      const separator = key.indexOf(':');
      await this.readStream(key.slice(0, separator) as EvidenceKind, key.slice(separator + 1));
    }
    return result;
  }

  async verifyIntegrity(): Promise<{ valid: boolean; checkedRecords: number }> {
    try {
      const all: EvidenceRecord[] = [];
      let cursor: string | undefined;
      do {
        const page = await this.store.replay(cursor, 100);
        all.push(...page.records);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      const streams = new Map<string, EvidenceRecord[]>();
      for (const item of all) {
        const key = `${item.kind}:${item.streamId}`;
        streams.set(key, [...(streams.get(key) ?? []), item]);
      }
      for (const entries of streams.values()) verifyStream(entries);
      return { valid: true, checkedRecords: all.length };
    } catch (error) {
      if (error instanceof EvidenceIntegrityError || error instanceof EvidenceValidationError) return { valid: false, checkedRecords: 0 };
      throw error;
    }
  }

  private async append(input: Omit<EvidenceRecord, 'schemaVersion' | 'previousIntegrityHash' | 'integrityHash'>): Promise<EvidenceAppendResult> {
    const existing = await this.store.get(input.evidenceId);
    if (existing) {
      verifyRecord(existing);
      if (existing.sourceHash !== input.sourceHash || canonicalJson(existing.payload) !== canonicalJson(input.payload)) {
        throw new EvidenceConflictError(`Evidence ID ${input.evidenceId} already has different content.`);
      }
      return { status: 'idempotent', record: existing };
    }
    const stream = await this.store.readStream(input.kind, input.streamId);
    verifyStream(stream);
    if (input.sourceSequence !== stream.length + 1) throw new EvidenceConflictError(`Evidence stream ${input.streamId} expected sequence ${stream.length + 1}.`);
    if (input.kind === 'work_ledger_entry') {
      const expected = stream.length === 0 ? null : stream[stream.length - 1].sourceHash;
      if (input.payload.previousHash !== expected) throw new EvidenceConflictError(`Work ledger ${input.streamId} source chain does not continue from its durable tail.`);
    }
    const body: Omit<EvidenceRecord, 'integrityHash'> = {
      schemaVersion: 'aegis-evidence-v1',
      ...input,
      previousIntegrityHash: stream.length === 0 ? null : stream[stream.length - 1].integrityHash,
    };
    const evidenceRecord: EvidenceRecord = { ...body, integrityHash: envelopeHash(body) };
    verifyStream([...stream, evidenceRecord]);
    const status = await this.store.append(evidenceRecord);
    return { status, record: clone(evidenceRecord) };
  }

  private async readStream(kind: EvidenceKind, streamId: string): Promise<EvidenceRecord[]> {
    const stream = await this.store.readStream(kind, streamId);
    verifyStream(stream);
    return stream;
  }
}
