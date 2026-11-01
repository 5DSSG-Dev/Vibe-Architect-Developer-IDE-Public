import { composePrompt, EXPLANATION_LEVELS, type ExplanationLevel } from '../src/luminary/blocks.js';
import { checkFencePath } from './luminary-executor.js';
import { canonical } from './governance-record/log.js';
import type { Submission } from './governance-record/admission-types.js';
import { exact, json, text, UUID, P6Error, hash, stringHash, type Route } from './governance-record/p6-result-types.js';

export interface Realm { scope: string; workspace: string; maxEffectiveBytes: number }
export interface Snapshot {
  version: 1; route: Route; realm: string; workspace: string; direction: 'architect-to-luminary'; original: string;
  context: { label: string; text: string }[]; mode: string | null; level: ExplanationLevel | null; allowedFiles: string[]; effectivePrompt: string;
}
export interface PreparedSubmission {
  snapshot: Snapshot; canonicalSnapshot: string; originalDigest: string; effectiveDigest: string; snapshotDigest: string; submission: Submission;
}
export function validateRealm(realm: Realm): void {
  text(realm.scope, 256); text(realm.workspace, 256);
  if (!Number.isSafeInteger(realm.maxEffectiveBytes) || realm.maxEffectiveBytes < 1 || realm.maxEffectiveBytes > 131072) throw new P6Error('invalid');
}
export function prepareSubmission(realm: Realm, route: Route, raw: unknown): PreparedSubmission {
  validateRealm(realm); json(raw);
  if (!['ask', 'tasks'].includes(route)) throw new P6Error('invalid');
  if (Buffer.byteLength(JSON.stringify(raw), 'utf8') > 32768) throw new P6Error('oversized');
  exact(raw, route === 'ask' ? ['prompt', 'submission'] : ['goal', 'allowedFiles', 'submission'], route === 'tasks' ? ['context', 'mode', 'level'] : []);
  const e = raw.submission;
  exact(e, ['version', 'key', 'kind'], ['exchangeId', 'revisesAttemptId', 'expectedHead']);
  if (e.version !== 1 || typeof e.key !== 'string' || !UUID.test(e.key) || !['new', 'replacement'].includes(e.kind as string)) throw new P6Error('invalid');
  const lineage = ['exchangeId', 'revisesAttemptId', 'expectedHead'] as const;
  if (e.kind === 'new' && lineage.some(k => Object.hasOwn(e, k))) throw new P6Error('invalid');
  if (e.kind === 'replacement') {
    for (const k of lineage) if (typeof e[k] !== 'string' || !UUID.test(e[k])) throw new P6Error('invalid');
    if (e.revisesAttemptId !== e.expectedHead) throw new P6Error('invalid');
  }
  const original = raw[route === 'ask' ? 'prompt' : 'goal']; text(original, 24000);
  let context: Snapshot['context'] = [], mode: string | null = null, level: ExplanationLevel | null = null, allowedFiles: string[] = [];
  if (route === 'tasks') {
    const suppliedContext = raw.context ?? [];
    if (!Array.isArray(suppliedContext) || suppliedContext.length > 16) throw new P6Error('invalid');
    context = suppliedContext.map(item => { exact(item, ['label', 'text']); text(item.label, 32768, false); text(item.text, 24000, false); return { label: Array.from(item.label).slice(0, 80).join(''), text: item.text }; });
    if (context.reduce((n, c) => n + Buffer.byteLength(c.label + c.text, 'utf8'), 0) > 24000) throw new P6Error('oversized');
    if (raw.level !== undefined && !(EXPLANATION_LEVELS as readonly unknown[]).includes(raw.level)) throw new P6Error('invalid');
    level = (raw.level as ExplanationLevel | undefined) ?? 'plain';
    if (raw.mode !== undefined) text(raw.mode, 32768);
    mode = raw.mode === undefined ? 'CODE' : Array.from((raw.mode as string).trim()).slice(0, 32).join('');
    if (!Array.isArray(raw.allowedFiles) || raw.allowedFiles.length < 1 || raw.allowedFiles.length > 8) throw new P6Error('invalid');
    allowedFiles = raw.allowedFiles.map(path => { text(path, 24000); const checked = checkFencePath(path); if (!checked.ok) throw new P6Error('invalid'); return checked.path; });
    if (new Set(allowedFiles).size !== allowedFiles.length) throw new P6Error('invalid');
  }
  const effectivePrompt = route === 'ask' ? original : composePrompt({ message: original, context, mode: mode!, level: level!, task: { allowedFiles } });
  text(effectivePrompt, realm.maxEffectiveBytes);
  const snapshot: Snapshot = { version: 1, route, realm: realm.scope, workspace: realm.workspace, direction: 'architect-to-luminary', original, context, mode, level, allowedFiles, effectivePrompt };
  const canonicalSnapshot = canonical(snapshot);
  if (Buffer.byteLength(canonicalSnapshot, 'utf8') > 131072) throw new P6Error('oversized');
  const submission: Submission = { scope: realm.scope, direction: 'architect-to-luminary', submissionKey: e.key, content: canonicalSnapshot,
    ...(e.kind === 'replacement' ? { exchangeId: e.exchangeId as string, revisesAttemptId: e.revisesAttemptId as string, expectedHead: e.expectedHead as string } : {}) };
  return { snapshot, canonicalSnapshot, originalDigest: stringHash(original), effectiveDigest: stringHash(effectivePrompt), snapshotDigest: hash(snapshot), submission };
}
