import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, realpath, readdir, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { AppendOnlyLog, canonical, type LogOptions } from './log.js';
import { AdmissionError, type AdmissionEvent, type Submission, type Registration,
  type SubmissionStatus, type ExchangeView, type ProcessingOutcome, type AdmissionResult } from './admission-types.js';

const copy = <T>(value: T): T => structuredClone(value);
const keyOf = (r: Submission) => canonical([r.scope, r.direction, r.submissionKey]);
/** Explicit fixed payload; reject extra fields rather than silently dropping material input. */
export function submissionDigest(request: Submission): string {
  const allowed = ['scope', 'direction', 'submissionKey', 'content', 'exchangeId', 'revisesAttemptId', 'expectedHead'];
  if (!request || Object.keys(request).some(k => !allowed.includes(k)) ||
      !['architect-to-luminary', 'luminary-to-architect'].includes(request.direction)) throw new AdmissionError('invalid');
  for (const k of ['scope', 'submissionKey', 'content'] as const)
    if (typeof request[k] !== 'string' || !request[k].length) throw new AdmissionError('invalid');
  for (const k of ['exchangeId', 'revisesAttemptId', 'expectedHead'] as const)
    if (request[k] !== undefined && (typeof request[k] !== 'string' || !request[k]!.length)) throw new AdmissionError('invalid');
  if (Boolean(request.exchangeId) !== Boolean(request.revisesAttemptId) ||
      Boolean(request.exchangeId) !== Boolean(request.expectedHead)) throw new AdmissionError('invalid');
  return createHash('sha256').update(canonical(request)).digest('hex');
}

/** One cooperative writer per dedicated directory. Never point at legacy review logs.
 * A crash leaves .admission-writer behind: no automatic timeout/PID takeover.
 * Recovery requires an operator to establish that the old writer is stopped before
 * removing that empty lock directory. This is not an OS security boundary against
 * another process with write access to the directory.
 */
export class AdmissionStore {
  private log!: AppendOnlyLog<AdmissionEvent>;
  private records = new Map<string, SubmissionStatus>();
  private keys = new Map<string, string>();
  private queue: Promise<unknown> = Promise.resolve();
  private frozen = false;
  private closed = false;
  private closing = false;
  private reconciliationFailures = 0;
  private recoveredPending = new Set<string>();
  private unresolvedKey: string | null = null;
  private constructor(readonly dir: string, private readonly options: LogOptions, private readonly reconciliationTimeoutMs: number) {}

  static async open(dir: string, options: Pick<LogOptions, 'maxSegmentBytes' | 'writeHook'> & { reconciliationTimeoutMs?: number } = {}): Promise<AdmissionStore> {
    const timeout = options.reconciliationTimeoutMs ?? 5000;
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 60000) throw new AdmissionError('invalid');
    await mkdir(dir, { recursive: true, mode: 0o700 });
    dir = await realpath(dir);
    const lock = join(dir, '.admission-writer');
    await mkdir(lock, { mode: 0o700 }); // exclusive acquisition; EEXIST refuses second writer
    const store = new AdmissionStore(dir, { ...options, strict: true }, timeout);
    try { await store.reload(); return store; }
    catch (error) { await rmdir(lock); throw error; }
  }

  private run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.closed || this.closing) return Promise.reject(new AdmissionError('closed'));
    const next = this.queue.then(fn);
    this.queue = next.catch(() => undefined);
    return next;
  }
  private writable() {
    if (this.frozen) throw new AdmissionError('persistence-unresolved');
  }
  private status(scope: string, direction: Submission['direction'], submissionKey: string): SubmissionStatus {
    const id = this.keys.get(canonical([scope, direction, submissionKey]));
    if (!id) throw new AdmissionError('not-found');
    return this.records.get(id)!;
  }
  private exchange(id: string): ExchangeView {
    const records = [...this.records.values()].filter(x => x.registration.exchangeId === id);
    if (!records.length) throw new AdmissionError('not-found');
    const admitted = records.filter(x => x.state === 'admitted').sort((a, b) => a.ordinal! - b.ordinal!);
    const last = admitted.at(-1);
    const pending = records.some(x => x.state === 'registered' || x.state === 'not-admitted');
    return { exchangeId: id, admitted: admitted.length, replacementsRemaining: Math.max(0, 3 - Math.max(1, admitted.length)),
      head: last?.registration.attemptId ?? null, pending,
      canReplace: !this.frozen && !pending && admitted.length < 3 && last?.outcome?.kind === 'returned' };
  }
  private checkNew(r: Submission) {
    if (!r.exchangeId) return;
    const view = this.exchange(r.exchangeId);
    const head = view.head ? this.records.get(view.head)! : undefined;
    if (!head || head.registration.request.scope !== r.scope || head.registration.request.direction !== r.direction)
      throw new AdmissionError('conflict');
    if (view.admitted >= 3) throw new AdmissionError('exhausted');
    if (view.pending) throw new AdmissionError('processing-required');
    if (view.head !== r.expectedHead || view.head !== r.revisesAttemptId) throw new AdmissionError('stale-head');
    if (!view.canReplace) throw new AdmissionError('processing-required');
  }

  /** Validate projections as well as the hash chain. Old schemas are not auto-migrated. */
  private apply(e: AdmissionEvent) {
    if (e.schemaVersion !== 1 || typeof e.eventId !== 'string') throw new Error('Invalid admission schema');
    if (e.kind === 'submission_registered') {
      const { registration: r } = e;
      if (!r || typeof r.attemptId !== 'string' || !r.attemptId || typeof r.exchangeId !== 'string' || !r.exchangeId ||
          submissionDigest(r.request) !== r.digest || this.keys.has(keyOf(r.request)) || this.records.has(r.attemptId))
        throw new Error('Invalid registration');
      this.checkNew(r.request);
      if (r.request.exchangeId && r.request.exchangeId !== r.exchangeId) throw new Error('Exchange mismatch');
      if (!r.request.exchangeId && [...this.records.values()].some(x => x.registration.exchangeId === r.exchangeId))
        throw new Error('Duplicate initial exchange');
      this.keys.set(keyOf(r.request), r.attemptId);
      this.records.set(r.attemptId, { registration: copy(r), state: 'registered' });
      return;
    }
    const s = this.records.get(e.attemptId);
    if (!s) throw new Error('Missing registration');
    if (e.kind === 'attempt_admitted') {
      const count = this.exchange(s.registration.exchangeId).admitted;
      if (s.state !== 'registered' || e.ordinal !== count || count > 2) throw new Error('Invalid admission');
      s.state = 'admitted'; s.ordinal = e.ordinal;
    } else if (e.kind === 'admission_resolved') {
      if (typeof e.admitted !== 'boolean' || (e.admitted ? s.state !== 'admitted' : s.state !== 'registered'))
        throw new Error('Invalid reconciliation');
      if (!e.admitted) s.state = 'not-admitted';
    } else if (e.kind === 'attempt_processing_closed') {
      if (s.state !== 'admitted' || s.outcome || !e.outcome ||
          !['returned', 'completed', 'shortfall'].includes(e.outcome.kind) ||
          (e.outcome.kind === 'returned' && (typeof e.outcome.receipt !== 'string' || !e.outcome.receipt)))
        throw new Error('Invalid closure');
      s.outcome = copy(e.outcome);
    } else throw new Error('Unknown event');
  }

  private async reload() {
    const log = await AppendOnlyLog.open<AdmissionEvent>(this.dir, this.options);
    if (log.problems.length) throw new Error('Admission log integrity failure; explicit recovery required');
    // A readable line is not a durability acknowledgment: establish a successful flush.
    for (const name of await readdir(this.dir)) {
      if (name !== 'index.jsonl' && !/^segment-\d{6}\.jsonl$/.test(name)) continue;
      const handle = await open(join(this.dir, name), 'r+');
      try { await handle.sync(); } finally { await handle.close(); }
    }
    const records = this.records, keys = this.keys, frozen = this.frozen;
    const livePending = new Set([...records.values()].filter(x => x.state === 'registered' && !this.recoveredPending.has(x.registration.attemptId)).map(x => x.registration.attemptId));
    this.records = new Map(); this.keys = new Map(); this.frozen = false;
    try {
      const seen = new Set<string>();
      for (const line of log.entries) {
        if (seen.has(line.entry.eventId)) throw new Error('Duplicate event');
        seen.add(line.entry.eventId); this.apply(line.entry);
      }
      this.log = log;
      this.recoveredPending = new Set([...this.records.values()].filter(s => s.state === 'registered' && !livePending.has(s.registration.attemptId)).map(s => s.registration.attemptId));
    } catch (error) { this.records = records; this.keys = keys; throw error; }
    finally { this.frozen = frozen; }
  }
  private async append(event: AdmissionEvent) {
    try { await this.log.append(event); this.apply(event); }
    catch { this.frozen = true;
      if (event.kind === 'submission_registered') this.unresolvedKey = keyOf(event.registration.request);
      else { const r = this.records.get(event.attemptId)?.registration; this.unresolvedKey = r ? keyOf(r.request) : null; }
      throw new AdmissionError('persistence-unresolved'); }
  }

  registerSubmission(request: Submission): Promise<Registration> {
    // Capture before queueing: callers cannot mutate the pending payload.
    const r = copy(request);
    return this.run(async () => {
      this.writable(); const digest = submissionDigest(r);
      const id = this.keys.get(keyOf(r));
      if (id) {
        const prior = this.records.get(id)!;
        if (prior.registration.digest !== digest) throw new AdmissionError('conflict');
        return copy(prior.registration);
      }
      this.checkNew(r);
      const registration = { exchangeId: r.exchangeId ?? randomUUID(), attemptId: randomUUID(), digest, request: r };
      await this.append({ schemaVersion: 1, eventId: randomUUID(), kind: 'submission_registered', registration });
      return copy(registration);
    });
  }
  admitSubmission(scope: string, direction: Submission['direction'], submissionKey: string): Promise<AdmissionResult> {
    return this.run(async () => {
      this.writable(); const s = this.status(scope, direction, submissionKey);
      if (s.state === 'admitted') return { ...copy(s), admission: 'existing' }; // caller must not automatically replay assessment
      if (s.state !== 'registered' || this.recoveredPending.has(s.registration.attemptId)) throw new AdmissionError('processing-required');
      await this.append({ schemaVersion: 1, eventId: randomUUID(), kind: 'attempt_admitted',
        attemptId: s.registration.attemptId, ordinal: this.exchange(s.registration.exchangeId).admitted });
      return { ...copy(s), admission: 'new' };
    });
  }
  lookupSubmission(scope: string, direction: Submission['direction'], submissionKey: string): Promise<SubmissionStatus> {
    return this.run(async () => { this.writable(); return copy(this.status(scope, direction, submissionKey)); });
  }
  getExchange(id: string): Promise<ExchangeView> {
    return this.run(async () => { this.writable(); return copy(this.exchange(id)); });
  }
  closeProcessing(attemptId: string, outcome: ProcessingOutcome): Promise<void> {
    const captured = copy(outcome);
    return this.run(async () => {
      this.writable(); const s = this.records.get(attemptId);
      if (!s || s.state !== 'admitted') throw new AdmissionError('not-found');
      if (s.outcome) {
        if (canonical(s.outcome) !== canonical(captured)) throw new AdmissionError('conflict');
        return;
      }
      if (!captured || !['returned', 'completed', 'shortfall'].includes(captured.kind) ||
          (captured.kind === 'returned' && (typeof captured.receipt !== 'string' || !captured.receipt)))
        throw new AdmissionError('invalid');
      await this.append({ schemaVersion: 1, eventId: randomUUID(), kind: 'attempt_processing_closed', attemptId, outcome: captured });
    });
  }

  /** Explicit reconciliation only. At most two failed calls per instance; never replays processing.
   * Missing registration after successful disk verification is reported absent. A pending
   * registration without an admission is closed as not-admitted; it is not blindly retried.
   */
  reconcileSubmission(scope: string, direction: Submission['direction'], submissionKey: string): Promise<SubmissionStatus | null> {
    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = this.run(async () => {
      const requestedKey = canonical([scope, direction, submissionKey]);
      if (expired) throw new AdmissionError('persistence-unresolved');
      if (this.unresolvedKey && requestedKey !== this.unresolvedKey) throw new AdmissionError('persistence-unresolved');
      if (this.reconciliationFailures >= 2) throw new AdmissionError('persistence-unresolved');
      try {
        await this.reload();
        if (expired) throw new AdmissionError('persistence-unresolved');
        this.frozen = false;
        const id = this.keys.get(canonical([scope, direction, submissionKey]));
        if (!id) { this.unresolvedKey = null; return null; }
        const s = this.records.get(id)!;
        if (s.state !== 'not-admitted') await this.append({ schemaVersion: 1, eventId: randomUUID(),
          kind: 'admission_resolved', attemptId: id, admitted: s.state === 'admitted' });
        if (expired) throw new AdmissionError('persistence-unresolved');
        this.unresolvedKey = null;
        return copy(s);
      } catch {
        this.reconciliationFailures++; this.frozen = true;
        this.unresolvedKey ??= requestedKey;
        throw new AdmissionError('persistence-unresolved');
      }
    });
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expired = true; this.frozen = true;
        // A queued timeout must not replace another operation's recovery identity.
        this.unresolvedKey ??= canonical([scope, direction, submissionKey]);
        reject(new AdmissionError('persistence-unresolved'));
      }, this.reconciliationTimeoutMs);
    });
    // Do not release the serialization queue when the caller times out. Pending OS IO
    // may still complete; its result remains uncertain until later reconciliation.
    return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
  }
  async close(): Promise<void> {
    if (this.closed) return;
    if (this.closing) { await this.queue; return; }
    this.closing = true;
    await this.queue;
    // Graceful close releases ownership, not consumption. Crash never executes this.
    await rmdir(join(this.dir, '.admission-writer'));
    this.closed = true;
  }
}
