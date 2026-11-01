import { mkdir, realpath, rmdir } from 'node:fs/promises';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { AppendOnlyLog, type LogLine, type LogOptions } from './log.js';
import { P6Error, exact, json, DIGEST, sameIdentity, validateIntent, validateResult, type P6Anchor, type P6ResultEvent, type PublicResultV1, type SavedResult, type TaskIntentV1 } from './p6-result-types.js';

interface Checkpoint { version: 1; kind: 'p6_result_checkpoint'; resultHead: { seq: number; hash: string } }
export interface P6ResultsOptions {
  dir: string; anchorDir: string; writeHook?: LogOptions['writeHook']; checkpointWriteHook?: LogOptions['writeHook']; maxSegmentBytes?: number;
}
function overlaps(a: string, b: string): boolean {
  const inside = (x: string, y: string) => { const r = relative(x, y); return r === '' || !r.startsWith('..') && !isAbsolute(r); };
  return inside(a, b) || inside(b, a);
}
/** One result/checkpoint writer. No automatic recovery, takeover, or deletion of evidence. */
export class P6Results {
  private queue: Promise<unknown> = Promise.resolve();
  private frozen = false;
  private closing = false;
  private closed = false;
  private closePromise?: Promise<void>;
  private results = new Map<string, SavedResult>();
  private intents = new Map<string, TaskIntentV1>();
  private constructor(private log: AppendOnlyLog<P6ResultEvent>, private checkpoints: AppendOnlyLog<Checkpoint>, private locks: string[]) {}

  static async open(options: P6ResultsOptions): Promise<P6Results> {
    if (overlaps(resolve(options.dir), resolve(options.anchorDir))) throw new P6Error('invalid');
    await mkdir(options.dir, { recursive: true, mode: 0o700 }); await mkdir(options.anchorDir, { recursive: true, mode: 0o700 });
    const dir = await realpath(options.dir), anchorDir = await realpath(options.anchorDir);
    if (overlaps(dir, anchorDir)) throw new P6Error('invalid');
    const locks: string[] = [];
    try {
      // Both paths are owned; a shared anchor path must not admit a second writer either.
      for (const path of [join(dir, '.p6-results-writer'), join(anchorDir, '.p6-results-writer')]) { await mkdir(path, { mode: 0o700 }); locks.push(path); }
      const log = await AppendOnlyLog.open<P6ResultEvent>(dir, { strict: true, maxSegmentBytes: options.maxSegmentBytes, writeHook: options.writeHook });
      const checkpoints = await AppendOnlyLog.open<Checkpoint>(anchorDir, { strict: true, maxSegmentBytes: options.maxSegmentBytes, writeHook: options.checkpointWriteHook });
      const store = new P6Results(log, checkpoints, locks);
      try { store.verifyStartup(); } catch { store.frozen = true; }
      return store;
    } catch (error) { for (const path of locks.reverse()) await rmdir(path); throw error; }
  }
  health(): { ok: boolean } { return { ok: !this.frozen && !this.closing && !this.closed && !this.log.problems.length && !this.checkpoints.problems.length }; }
  private healthy(): void { if (!this.health().ok) throw new P6Error(this.closed || this.closing ? 'closed' : 'unresolved'); }
  private verifyStartup(): void {
    if (this.log.problems.length || this.checkpoints.problems.length || this.log.entries.length !== this.checkpoints.entries.length) throw new P6Error('unresolved');
    for (const [i, line] of this.log.entries.entries()) {
      const c = this.checkpoints.entries[i].entry;
      json(c); exact(c, ['version', 'kind', 'resultHead']); exact(c.resultHead, ['seq', 'hash']);
      if (c.version !== 1 || c.kind !== 'p6_result_checkpoint' || c.resultHead.seq !== line.seq || c.resultHead.hash !== line.hash) throw new P6Error('unresolved');
      this.validateNew(line.entry); this.project(line);
    }
  }
  private validateNew(entry: P6ResultEvent): void {
    if (entry?.kind === 'p6_public_result') {
      validateResult(entry);
      if (this.results.has(entry.attemptId) || [...this.results.values()].some(s => s.result.resultId === entry.resultId)) throw new P6Error('conflict');
      const intent = this.intents.get(entry.attemptId);
      if (entry.taskOperationId !== null && (!intent || !sameIdentity(intent, entry) || entry.taskOperationId !== intent.operationId)) throw new P6Error('invalid');
      if (intent && entry.taskOperationId === null) throw new P6Error('invalid');
    } else {
      validateIntent(entry);
      if (this.intents.has(entry.attemptId) || this.results.has(entry.attemptId)) throw new P6Error('conflict');
    }
  }
  private project(line: LogLine<P6ResultEvent>): void {
    const entry = structuredClone(line.entry);
    if (entry.kind === 'p6_public_result') this.results.set(entry.attemptId, { result: entry, anchor: { area: 'p6-results', seq: line.seq, hash: line.hash } });
    else this.intents.set(entry.attemptId, entry);
  }
  private append(entry: P6ResultEvent): Promise<LogLine<P6ResultEvent>> {
    if (this.closePromise) return Promise.reject(new P6Error('closed'));
    // Capture/validate before any await, and recheck projection inside the serialization queue.
    json(entry); const captured = structuredClone(entry);
    const work = this.queue.then(async () => {
      this.healthy(); this.validateNew(captured);
      let line: LogLine<P6ResultEvent>;
      try {
        line = await this.log.append(captured);
        await this.checkpoints.append({ version: 1, kind: 'p6_result_checkpoint', resultHead: { seq: line.seq, hash: line.hash } });
      } catch { this.frozen = true; throw new P6Error('unresolved'); }
      this.project(line); return structuredClone(line);
    });
    this.queue = work.catch(() => undefined); return work;
  }
  async appendPublicResult(entry: PublicResultV1): Promise<SavedResult> {
    const line = await this.append(entry); return this.verifiedResult(line.entry.attemptId)!;
  }
  async appendIntent(entry: TaskIntentV1): Promise<P6Anchor> {
    const line = await this.append(entry); return { area: 'p6-results', seq: line.seq, hash: line.hash };
  }
  verifiedResult(attemptId: string): SavedResult | null {
    this.healthy(); const found = this.results.get(attemptId); return found ? structuredClone(found) : null;
  }
  intent(attemptId: string): TaskIntentV1 | null { this.healthy(); return structuredClone(this.intents.get(attemptId) ?? null); }
  /** Detached projections for startup cross-store verification, never a log mutation surface. */
  entries(): P6ResultEvent[] { this.healthy(); return this.log.entries.map(line => structuredClone(line.entry)); }
  checkClientAnchor(value: P6Anchor): void {
    this.healthy();
    try {
      json(value); exact(value, ['area', 'seq', 'hash']);
      if (value.area !== 'p6-results' || !Number.isSafeInteger(value.seq) || value.seq < 1 || !DIGEST.test(value.hash) || this.log.hashAt(value.seq) !== value.hash) throw new P6Error('unresolved');
    } catch { this.frozen = true; throw new P6Error('unresolved'); }
  }
  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    // Queued writes must finish before closing; reject *new* writes immediately.
    this.closePromise = (async () => { await this.queue; this.closing = true; for (const path of [...this.locks].reverse()) await rmdir(path); this.closed = true; })();
    return this.closePromise;
  }
}
