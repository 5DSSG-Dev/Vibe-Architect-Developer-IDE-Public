/** Disconnected coordinator. Only injected pure outcome validators and test processors.
 * HTTP mounting, real P5, executor adapters and operator recovery are deliberately absent. */
import { randomUUID } from 'node:crypto';
import { prepareSubmission, validateRealm, type PreparedSubmission, type Realm } from './luminary-admission-snapshot.js';
import { AdmissionStore } from './governance-record/admission.js';
import { AdmissionError, type AdmissionEvent, type Registration, type SubmissionStatus } from './governance-record/admission-types.js';
import { AppendOnlyLog, canonical } from './governance-record/log.js';
import { P6Results } from './governance-record/p6-results.js';
import { P6Error, UUID, hash, stringHash, json, exact, identity, operationId, receipt, sameIdentity, type Json, type P6Identity, type Route, type SavedResult, type PublicResultV1 } from './governance-record/p6-result-types.js';

export type ProcessOutcome =
  | { kind: 'validated-inbound-return'; status: 422; body: Json }
  | { kind: 'completed'; status: 200 | 201; body: Json; taskCandidate?: Json }
  | { kind: 'shortfall'; status: number; body: Json };
export interface TaskAdapter {
  /** Must be side-effect-free; uncertainty closes the entire enabled coordinator. */
  healthy(): boolean;
  /** Slice1 accepts fakes only. Real operation-ID ledger adapter is a later approved slice. */
  propose(candidate: Json, operationId: string): Promise<Extract<ProcessOutcome, { kind: 'completed' | 'shortfall' }>>;
}
export interface CoordinatorOptions {
  realm: Realm; admission: AdmissionStore; results: P6Results;
  process(prepared: PreparedSubmission, identity: P6Identity): Promise<ProcessOutcome>;
  validatePublicBody(outcome: PublicResultV1['outcome'], route: Route, status: number, body: Json): boolean;
  validateReturnedBody(body: Json): boolean;
  reviewHealthy?: () => boolean;
  task?: TaskAdapter;
}
export interface CoordinatorResponse { status: number; body: Record<string, unknown> }
const direction = 'architect-to-luminary' as const;

export class P6Coordinator {
  private queue: Promise<unknown> = Promise.resolve();
  private frozen = false;
  private closing = false;
  private closePromise?: Promise<void>;
  private constructor(private readonly options: CoordinatorOptions) {}

  static async open(options: CoordinatorOptions): Promise<P6Coordinator> {
    validateRealm(options.realm);
    if (typeof options.process !== 'function' || typeof options.validatePublicBody !== 'function' || typeof options.validateReturnedBody !== 'function') throw new P6Error('invalid');
    // Copy trusted realm: callers cannot switch the active authority after initialization.
    const c = new P6Coordinator({ ...options, realm: { ...options.realm } });
    try { await c.verifyStartup(); } catch { c.frozen = true; }
    return c;
  }
  private healthy(): boolean {
    try {
      if (this.frozen || this.closing || !this.options.results.health().ok || this.options.reviewHealthy?.() === false || this.options.task && !this.options.task.healthy()) { this.frozen = true; return false; }
      return true;
    } catch { this.frozen = true; return false; }
  }
  private unresolved(key: string | null = null): CoordinatorResponse {
    return { status: 503, body: { version: 1, state: 'unresolved', key, attemptId: null, exchangeId: null, ordinal: null, result: null } };
  }
  private prepared(registration: Registration): PreparedSubmission {
    const r = registration.request;
    if (r.scope !== this.options.realm.scope || r.direction !== direction) throw new P6Error('unresolved');
    const snap: unknown = JSON.parse(r.content);
    json(snap); exact(snap, ['version', 'route', 'realm', 'workspace', 'direction', 'original', 'context', 'mode', 'level', 'allowedFiles', 'effectivePrompt']);
    if (snap.version !== 1 || snap.realm !== this.options.realm.scope || snap.workspace !== this.options.realm.workspace || snap.direction !== direction || !['ask', 'tasks'].includes(snap.route as string)) throw new P6Error('unresolved');
    const envelope = { version: 1, key: r.submissionKey, kind: r.exchangeId ? 'replacement' : 'new', ...(r.exchangeId ? { exchangeId: r.exchangeId, revisesAttemptId: r.revisesAttemptId, expectedHead: r.expectedHead } : {}) };
    const p = prepareSubmission(this.options.realm, snap.route as Route, snap.route === 'ask' ? { prompt: snap.original, submission: envelope } : { goal: snap.original, context: snap.context, mode: snap.mode, level: snap.level, allowedFiles: snap.allowedFiles, submission: envelope });
    if (p.canonicalSnapshot !== r.content) throw new P6Error('unresolved');
    return p;
  }
  private identity(registration: Registration, ordinal: number): P6Identity {
    const p = this.prepared(registration);
    const i: P6Identity = { scope: this.options.realm.scope, workspace: this.options.realm.workspace, direction, route: p.snapshot.route, submissionKeyDigest: stringHash(registration.request.submissionKey), attemptId: registration.attemptId, exchangeId: registration.exchangeId, ordinal, registrationDigest: registration.digest, snapshotDigest: p.snapshotDigest, originalDigest: p.originalDigest, effectiveDigest: p.effectiveDigest };
    identity(i as unknown as Record<string, unknown>); return i;
  }
  private bound(s: SubmissionStatus): SavedResult {
    const saved = this.options.results.verifiedResult(s.registration.attemptId);
    if (!saved || s.state !== 'admitted' || s.ordinal === undefined || !s.outcome || !sameIdentity(saved.result, this.identity(s.registration, s.ordinal)) || s.outcome.kind !== saved.result.outcome) throw new P6Error('unresolved');
    const r = saved.result;
    if (this.options.validatePublicBody(r.outcome, r.route, r.httpStatus, structuredClone(r.body)) !== true || r.outcome === 'returned' && (this.options.validateReturnedBody(structuredClone(r.body)) !== true || s.outcome.kind !== 'returned' || s.outcome.receipt !== receipt(saved))) throw new P6Error('unresolved');
    return saved;
  }
  private async verifyStartup(): Promise<void> {
    if (!this.healthy()) throw new P6Error('unresolved');
    // Read-only chain verification; never append through this secondary handle.
    const log = await AppendOnlyLog.open<AdmissionEvent>(this.options.admission.dir, { strict: true });
    if (log.problems.length) throw new P6Error('unresolved');
    const registrations = log.entries.filter(line => line.entry.kind === 'submission_registered').map(line => (line.entry as Extract<AdmissionEvent, { kind: 'submission_registered' }>).registration);
    const attempts = new Set<string>();
    for (const r of registrations) {
      attempts.add(r.attemptId); this.prepared(r);
      const s = await this.options.admission.lookupSubmission(r.request.scope, r.request.direction, r.request.submissionKey);
      if (s.state === 'not-admitted') { if (this.options.results.verifiedResult(r.attemptId)) throw new P6Error('unresolved'); continue; }
      // First slice never resumes a partially processed or registration-only attempt.
      this.bound(s);
    }
    for (const e of this.options.results.entries()) {
      if (!attempts.has(e.attemptId) || e.kind === 'p6_task_effect_intent' && !this.options.results.verifiedResult(e.attemptId)) throw new P6Error('unresolved');
    }
    if (!this.healthy()) throw new P6Error('unresolved');
  }
  submit(route: Route, raw: unknown): Promise<CoordinatorResponse> {
    if (this.closePromise) return Promise.resolve(this.unresolved());
    // Snapshot request synchronously before queueing; queued caller mutations cannot alter it.
    let prepared: PreparedSubmission;
    if (!this.healthy()) return Promise.resolve(this.unresolved());
    if (route === 'tasks' && !this.options.task) return Promise.resolve({ status: 503, body: { error: 'task_adapter_not_configured' } });
    try { prepared = prepareSubmission(this.options.realm, route, raw); }
    catch (error) { return Promise.resolve({ status: error instanceof P6Error && error.code === 'oversized' ? 413 : 400, body: { error: 'invalid_submission' } }); }
    const work = this.queue.then(() => this.process(prepared)); this.queue = work.catch(() => undefined); return work;
  }
  private async process(p: PreparedSubmission): Promise<CoordinatorResponse> {
    const { admission, results } = this.options;
    const key = p.submission.submissionKey;
    let processing = false;
    if (!this.healthy()) return this.unresolved(key);
    try {
      // Duplicate registrations return their original digest; changed inputs conflict here.
      // Parent evidence must be validated before a *new* replacement registration.
      let previous: SubmissionStatus | null = null;
      try { previous = await admission.lookupSubmission(p.submission.scope, direction, key); }
      catch (error) { if (!(error instanceof AdmissionError) || error.code !== 'not-found') throw error; }
      if (!previous && p.submission.exchangeId) {
        const view = await admission.getExchange(p.submission.exchangeId);
        if (!view.canReplace || view.head !== p.submission.expectedHead) return { status: 409, body: { error: 'replacement_not_eligible' } };
        const parentResult = results.verifiedResult(view.head!);
        if (!parentResult || parentResult.result.outcome !== 'returned') throw new P6Error('unresolved');
        // Find authoritative registration/key by the verified result's attempt, not request prose.
        const parent = await this.findStatus(view.head!); this.bound(parent);
      }
      const r = await admission.registerSubmission(p.submission);
      if (previous) return this.status(key, true);
      const a = await admission.admitSubmission(p.submission.scope, direction, key);
      if (a.admission !== 'new') return this.status(key, true);
      processing = true;
      const i = this.identity(r, a.ordinal!);
      let outcome = await this.options.process(structuredClone(p), structuredClone(i));
      this.validateOutcome(outcome);
      let taskOperationId: string | null = null;
      if (p.snapshot.route === 'tasks' && outcome.kind === 'completed') {
        if (!this.options.task || outcome.taskCandidate === undefined) throw new P6Error('unresolved');
        taskOperationId = operationId(i.scope, i.attemptId);
        await results.appendIntent({ version: 1, kind: 'p6_task_effect_intent', ...i, operationId: taskOperationId, candidateDigest: hash(outcome.taskCandidate), allowedFiles: [...p.snapshot.allowedFiles] });
        if (!this.healthy()) throw new P6Error('unresolved');
        // Only after both intent and checkpoint ACK; exceptions are conservatively ambiguous.
        const proposed: unknown = await this.options.task.propose(structuredClone(outcome.taskCandidate), taskOperationId);
        this.validateOutcome(proposed);
        if (proposed.kind === 'validated-inbound-return') throw new P6Error('unresolved');
        outcome = proposed;
      }
      const kind = outcome.kind === 'validated-inbound-return' ? 'returned' : outcome.kind;
      const body = structuredClone(outcome.body);
      if (this.options.validatePublicBody(kind, p.snapshot.route, outcome.status, structuredClone(body)) !== true || kind === 'returned' && this.options.validateReturnedBody(structuredClone(body)) !== true) throw new P6Error('unresolved');
      const result: PublicResultV1 = { version: 1, kind: 'p6_public_result', resultId: randomUUID(), ...i, outcome: kind, httpStatus: outcome.status, body, bodyDigest: hash(body), taskOperationId };
      const saved = await results.appendPublicResult(result);
      if (!this.healthy()) throw new P6Error('unresolved');
      await admission.closeProcessing(i.attemptId, kind === 'returned' ? { kind, receipt: receipt(saved) } : { kind });
      const verified = this.bound({ ...a, outcome: kind === 'returned' ? { kind, receipt: receipt(saved) } : { kind } });
      if (!this.healthy()) throw new P6Error('unresolved');
      // No await after final verification before returning saved bytes to the eventual adapter.
      return { status: verified.result.httpStatus, body: structuredClone(verified.result.body) as Record<string, unknown> };
    } catch (error) {
      if (!processing && error instanceof AdmissionError && ['invalid', 'conflict', 'stale-head', 'exhausted', 'processing-required'].includes(error.code)) return { status: error.code === 'invalid' ? 400 : 409, body: { error: error.code } };
      this.frozen = true; return this.unresolved(key);
    }
  }
  private validateOutcome(value: unknown): asserts value is ProcessOutcome {
    json(value); exact(value, ['kind', 'status', 'body'], ['taskCandidate']);
    if (!['validated-inbound-return', 'completed', 'shortfall'].includes(value.kind as string) || !Number.isInteger(value.status)) throw new P6Error('unresolved');
    if (value.kind === 'validated-inbound-return' && value.status !== 422 || value.kind === 'shortfall' && ((value.status as number) < 400 || (value.status as number) > 599)) throw new P6Error('unresolved');
    if (value.kind !== 'completed' && Object.hasOwn(value, 'taskCandidate')) throw new P6Error('unresolved');
  }
  private async findStatus(attemptId: string): Promise<SubmissionStatus> {
    const log = await AppendOnlyLog.open<AdmissionEvent>(this.options.admission.dir, { strict: true });
    if (log.problems.length) throw new P6Error('unresolved');
    for (const { entry } of log.entries) if (entry.kind === 'submission_registered' && entry.registration.attemptId === attemptId)
      return this.options.admission.lookupSubmission(this.options.realm.scope, direction, entry.registration.request.submissionKey);
    throw new P6Error('unresolved');
  }
  async status(key: string, allowTask = false): Promise<CoordinatorResponse> {
    if (!this.healthy()) return this.unresolved(key);
    if (typeof key !== 'string' || !UUID.test(key)) return { status: 400, body: { error: 'invalid_key' } };
    try {
      const s = await this.options.admission.lookupSubmission(this.options.realm.scope, direction, key);
      const p = this.prepared(s.registration);
      // The real HTTP adapter must additionally enforce loopback/Host/Origin/enablement.
      if (p.snapshot.route === 'tasks' && !allowTask) return { status: 403, body: { error: 'task_status_guard_required' } };
      const saved = s.outcome ? this.bound(s) : null;
      if (!this.healthy()) return this.unresolved(key);
      return { status: saved ? 200 : s.state === 'not-admitted' ? 409 : 202, body: { version: 1, state: saved ? 'terminal' : s.state, key, attemptId: s.registration.attemptId, exchangeId: s.registration.exchangeId, ordinal: s.ordinal ?? null, result: saved ? { status: saved.result.httpStatus, body: saved.result.body } : null } };
    } catch (error) {
      if (error instanceof AdmissionError && error.code === 'not-found') return { status: 404, body: { version: 1, state: 'absent', key, attemptId: null, exchangeId: null, ordinal: null, result: null } };
      this.frozen = true; return this.unresolved(key);
    }
  }
  close(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = (async () => { await this.queue; this.closing = true; await this.options.results.close(); await this.options.admission.close(); })();
    }
    return this.closePromise;
  }
}
