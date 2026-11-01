/** Disconnected P6 schemas. No provider, HTTP, executor or production-store wiring. */
import { createHash } from 'node:crypto';
import { canonical } from './log.js';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Route = 'ask' | 'tasks';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DIGEST = /^[0-9a-f]{64}$/;
export class P6Error extends Error {
  constructor(readonly code: 'invalid' | 'oversized' | 'unresolved' | 'conflict' | 'closed', message = code) { super(message); }
}
export function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new P6Error('invalid');
}
export function exact(value: unknown, keys: readonly string[], optional: readonly string[] = []): asserts value is Record<string, unknown> {
  object(value);
  if (Reflect.ownKeys(value).some(k => typeof k !== 'string' || !keys.includes(k) && !optional.includes(k)) || keys.some(k => !Object.hasOwn(value, k))) throw new P6Error('invalid');
}
export function text(value: unknown, bytes: number, nonblank = true): asserts value is string {
  if (typeof value !== 'string' || nonblank && !value.trim() || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) throw new P6Error('invalid');
  if (Buffer.byteLength(value, 'utf8') > bytes) throw new P6Error('oversized');
}
/** Reject getters, cycles, sparse arrays, undefined and deep/non-JSON inputs before hashing. */
export function json(value: unknown): asserts value is Json {
  const seen = new Set<object>(); let nodes = 0;
  function visit(v: unknown, depth: number): void {
    if (++nodes > 200000 || depth > 64) throw new P6Error('oversized');
    if (typeof v === 'string') { text(v, 131072, false); return; }
    if (v === null || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)) return;
    if (typeof v !== 'object' || seen.has(v)) throw new P6Error('invalid');
    seen.add(v);
    if (Array.isArray(v)) {
      if (Reflect.ownKeys(v).length !== v.length + 1) throw new P6Error('invalid');
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d || !('value' in d)) throw new P6Error('invalid'); visit(d.value, depth + 1);
      }
    } else {
      object(v);
      for (const k of Reflect.ownKeys(v)) {
        if (typeof k !== 'string') throw new P6Error('invalid'); text(k, 131072, false);
        const d = Object.getOwnPropertyDescriptor(v, k)!;
        if (!d.enumerable || !('value' in d)) throw new P6Error('invalid'); visit(d.value, depth + 1);
      }
    }
    seen.delete(v);
  }
  visit(value, 0);
}
export function hash(value: unknown): string { json(value); return createHash('sha256').update(canonical(value), 'utf8').digest('hex'); }
export const stringHash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
export const IDENTITY_KEYS = ['scope', 'workspace', 'direction', 'route', 'submissionKeyDigest', 'attemptId', 'exchangeId', 'ordinal', 'registrationDigest', 'snapshotDigest', 'originalDigest', 'effectiveDigest'] as const;
export interface P6Identity {
  scope: string; workspace: string; direction: 'architect-to-luminary'; route: Route;
  submissionKeyDigest: string; attemptId: string; exchangeId: string; ordinal: number;
  registrationDigest: string; snapshotDigest: string; originalDigest: string; effectiveDigest: string;
}
export function identity(v: Record<string, unknown>): void {
  text(v.scope, 256); text(v.workspace, 256);
  if (v.direction !== 'architect-to-luminary' || !['ask', 'tasks'].includes(v.route as string) || !Number.isInteger(v.ordinal) || (v.ordinal as number) < 0 || (v.ordinal as number) > 2) throw new P6Error('invalid');
  for (const k of ['attemptId', 'exchangeId']) if (typeof v[k] !== 'string' || !UUID.test(v[k])) throw new P6Error('invalid');
  for (const k of ['submissionKeyDigest', 'registrationDigest', 'snapshotDigest', 'originalDigest', 'effectiveDigest']) if (typeof v[k] !== 'string' || !DIGEST.test(v[k])) throw new P6Error('invalid');
}
export interface PublicResultV1 extends P6Identity {
  version: 1; kind: 'p6_public_result'; resultId: string; outcome: 'returned' | 'completed' | 'shortfall';
  httpStatus: number; body: Json; bodyDigest: string; taskOperationId: string | null;
}
export interface TaskIntentV1 extends P6Identity {
  version: 1; kind: 'p6_task_effect_intent'; operationId: string; candidateDigest: string; allowedFiles: string[];
}
export type P6ResultEvent = PublicResultV1 | TaskIntentV1;
export interface P6Anchor { area: 'p6-results'; seq: number; hash: string }
export interface SavedResult { result: PublicResultV1; anchor: P6Anchor }
export const operationId = (scope: string, attemptId: string) => hash([scope, attemptId, 'task-propose', 1]);
export function validateResult(value: unknown): asserts value is PublicResultV1 {
  json(value); exact(value, ['version', 'kind', ...IDENTITY_KEYS, 'resultId', 'outcome', 'httpStatus', 'body', 'bodyDigest', 'taskOperationId']); identity(value);
  if (value.version !== 1 || value.kind !== 'p6_public_result' || typeof value.resultId !== 'string' || !UUID.test(value.resultId) || !['returned', 'completed', 'shortfall'].includes(value.outcome as string)) throw new P6Error('invalid');
  const status = value.httpStatus;
  if (!Number.isInteger(status) || value.outcome === 'returned' && status !== 422 || value.outcome === 'completed' && status !== (value.route === 'tasks' ? 201 : 200) || value.outcome === 'shortfall' && ((status as number) < 400 || (status as number) > 599)) throw new P6Error('invalid');
  object(value.body);
  if (Buffer.byteLength(canonical(value.body), 'utf8') > 131072) throw new P6Error('oversized');
  if (hash(value.body) !== value.bodyDigest) throw new P6Error('invalid');
  if (value.taskOperationId !== null && (value.route !== 'tasks' || value.taskOperationId !== operationId(value.scope as string, value.attemptId as string)) || value.route === 'tasks' && value.outcome === 'completed' && value.taskOperationId === null) throw new P6Error('invalid');
}
export function validateIntent(value: unknown): asserts value is TaskIntentV1 {
  json(value); exact(value, ['version', 'kind', ...IDENTITY_KEYS, 'operationId', 'candidateDigest', 'allowedFiles']); identity(value);
  if (value.version !== 1 || value.kind !== 'p6_task_effect_intent' || value.route !== 'tasks' || value.operationId !== operationId(value.scope as string, value.attemptId as string) || typeof value.candidateDigest !== 'string' || !DIGEST.test(value.candidateDigest) || !Array.isArray(value.allowedFiles) || value.allowedFiles.length < 1 || value.allowedFiles.length > 8) throw new P6Error('invalid');
  for (const path of value.allowedFiles) text(path, 24000);
  if (new Set(value.allowedFiles).size !== value.allowedFiles.length) throw new P6Error('invalid');
}
export function sameIdentity(a: P6Identity, b: P6Identity): boolean { return IDENTITY_KEYS.every(k => a[k] === b[k]); }
/** Reconstructed from durable data only; this is a bound reference, not a signature. */
export function receipt(saved: SavedResult): string {
  const r = saved.result; validateResult(r);
  if (r.outcome !== 'returned') throw new P6Error('invalid');
  return 'p6-return-v1:' + hash({ version: 1, issuer: 'p6-inbound-coordinator', subject: 'validated-inbound-return', scope: r.scope, workspace: r.workspace, direction: r.direction, recipientRealm: r.scope, attemptId: r.attemptId, exchangeId: r.exchangeId, ordinal: r.ordinal, registrationDigest: r.registrationDigest, snapshotDigest: r.snapshotDigest, originalDigest: r.originalDigest, effectiveDigest: r.effectiveDigest, resultId: r.resultId, bodyDigest: r.bodyDigest, resultAnchor: saved.anchor });
}
