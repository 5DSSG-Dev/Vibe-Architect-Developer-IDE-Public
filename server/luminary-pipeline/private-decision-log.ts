import { appendFileSync, closeSync, existsSync, fsyncSync, openSync, readFileSync, realpathSync, statSync, unlinkSync } from 'node:fs';
import { dirname, isAbsolute, relative, sep } from 'node:path';
import { canonicalJson, sha256Hex } from '../evidence-store.js';

interface DecisionRecord { sequence: number; previousHash: string | null; recordedAt: string; data: Record<string, unknown>; hash: string }
export type PrivateDecisionSink = (data: Record<string, unknown>) => void;

/** Pure chain verification: never re-infers, dispatches, or refreshes an attempt budget. */
export function verifyDecisionLog(text: string): DecisionRecord[] {
  if (text && !text.endsWith('\n')) throw new Error('governance_audit_partial_record');
  const records: DecisionRecord[] = [];
  for (const line of text.split('\n').filter(Boolean)) {
    const entry = JSON.parse(line) as DecisionRecord;
    const { hash, ...body } = entry;
    if (Object.keys(entry).length !== 5 || entry.sequence !== records.length + 1 || entry.previousHash !== (records.at(-1)?.hash ?? null)
      || typeof entry.recordedAt !== 'string' || !Number.isFinite(Date.parse(entry.recordedAt))
      || !entry.data || Object.getPrototypeOf(entry.data) !== Object.prototype || hash !== sha256Hex(canonicalJson(body)))
      throw new Error('governance_audit_integrity');
    records.push(entry);
  }
  return records;
}

/** Local append-only private evidence, using the existing evidence canonicalization/hash pattern.
 * A bounded file and exclusive writer lock fail closed; no public evidence endpoint mounts this log.
 */
export function createPrivateDecisionLog(path: string, workspace: string, maxBytes = 16_777_216): PrivateDecisionSink {
  function assertPrivate() {
    if (!isAbsolute(path) || !Number.isSafeInteger(maxBytes) || maxBytes < 1024 || maxBytes > 67_108_864)
      throw new Error('governance_audit_configuration');
    const actual = existsSync(path) ? realpathSync(path) : realpathSync(dirname(path));
    const rel = relative(realpathSync(workspace), actual);
    if (!rel || (!(rel === '..' || rel.startsWith(`..${sep}`)) && !isAbsolute(rel))) throw new Error('governance_audit_public_location');
  }
  assertPrivate();
  return data => {
    assertPrivate();
    let lock: number | undefined;
    try {
      lock = openSync(`${path}.lock`, 'wx', 0o600);
      if (existsSync(path) && statSync(path).size > maxBytes) throw new Error('governance_audit_capacity');
      const previous = existsSync(path) ? readFileSync(path, 'utf8') : '';
      const records = verifyDecisionLog(previous);
      const body = { sequence: records.length + 1, previousHash: records.at(-1)?.hash ?? null,
        recordedAt: new Date().toISOString(), data: structuredClone(data) };
      const line = canonicalJson({ ...body, hash: sha256Hex(canonicalJson(body)) }) + '\n';
      if (Buffer.byteLength(previous, 'utf8') + Buffer.byteLength(line, 'utf8') > maxBytes) throw new Error('governance_audit_capacity');
      const fd = openSync(path, 'a', 0o600);
      try { appendFileSync(fd, line, 'utf8'); fsyncSync(fd); } finally { closeSync(fd); }
    } finally {
      if (lock !== undefined) { closeSync(lock); unlinkSync(`${path}.lock`); }
    }
  };
}
