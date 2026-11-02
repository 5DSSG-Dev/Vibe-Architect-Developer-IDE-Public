// The append-only, hash-chained review log (STP-0005 P3, plan rev16 F4, F5). One log per
// review area, on the gateway's disk:
//
//   <dir>/index.jsonl            one line per segment, in order (append-only)
//   <dir>/segment-000001.jsonl   one entry per line; each carries the hash of the one before
//
// The gateway only ever opens these files to append. Each write is flushed to disk (fsync)
// before append() resolves, so a caller reports a message as sent back only after it is on
// disk. A full segment starts a new one, chained to the last entry. There is no cap.
//
// On open, the whole chain is checked. It detects a changed or removed entry, entries cut off
// the end of a segment, a segment missing from or added outside the index, and a half-written
// last line after a crash. A half-written line is kept as it is, reported, and the next write
// starts a new segment. Nothing is ever removed or rewritten.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, open, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const DEFAULT_SEGMENT_BYTES = 8 * 1024 * 1024;

export interface LogLine<T> {
  seq: number;
  at: string;
  prevHash: string | null;
  entry: T;
  hash: string;
}

export interface LogHead {
  seq: number;
  hash: string | null;
}

export interface LogProblem {
  code: 'chain_broken' | 'unreadable_entry' | 'index_mismatch' | 'incomplete_entry' | 'unreadable_index';
  detail: string;
}

interface IndexLine {
  segment: string;
  firstSeq: number;
  prevHash: string | null;
  startedAt: string;
}

/** Stable JSON: object keys sorted, so a hash never depends on property order. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

export function lineHash(body: Omit<LogLine<unknown>, 'hash'>): string {
  return createHash('sha256').update(canonical(body)).digest('hex');
}

const segmentName = (n: number) => `segment-${String(n).padStart(6, '0')}.jsonl`;

async function appendDurably(path: string, text: string): Promise<void> {
  const handle = await open(path, 'a', 0o600);
  try {
    await handle.appendFile(text, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export interface LogOptions {
  maxSegmentBytes?: number;
  /** Admission-only: freeze after any uncertain append or verification problem. */
  strict?: boolean;
  /** Fault-injection/observability seam; never supplied by HTTP request data. */
  writeHook?: (phase: 'before-write' | 'after-write' | 'after-sync', path: string) => void | Promise<void>;
}

export class AppendOnlyLog<T> {
  private readonly lines: LogLine<T>[] = [];
  private readonly index: IndexLine[] = [];
  private head: LogHead = { seq: 0, hash: null };
  private segmentBytes = 0;
  private needsNewSegment = false;
  private queue: Promise<unknown> = Promise.resolve();
  readonly problems: LogProblem[] = [];

  private uncertain = false;

  private constructor(readonly dir: string, private readonly maxSegmentBytes: number, private readonly options: LogOptions) {}

  /** Open (creating if absent) and check the whole chain. Problems are reported, never repaired. */
  static async open<T>(dir: string, options: LogOptions = {}): Promise<AppendOnlyLog<T>> {
    const log = new AppendOnlyLog<T>(dir, options.maxSegmentBytes ?? DEFAULT_SEGMENT_BYTES, options);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await log.verify();
    return log;
  }

  get entries(): readonly LogLine<T>[] {
    return this.lines;
  }

  get latest(): LogHead {
    return this.head;
  }

  /** The hash recorded at a sequence number, for the second-anchor check. */
  hashAt(seq: number): string | null {
    return this.lines.find((line) => line.seq === seq)?.hash ?? null;
  }

  private async verify(): Promise<void> {
    let indexText = '';
    try {
      indexText = await readFile(join(this.dir, 'index.jsonl'), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const onDisk = (await readdir(this.dir)).filter((name) => /^segment-\d{6}\.jsonl$/.test(name)).sort();

    for (const raw of indexText.split('\n')) {
      if (!raw.trim()) continue;
      try {
        this.index.push(JSON.parse(raw) as IndexLine);
      } catch {
        this.problems.push({ code: 'unreadable_index', detail: 'An index line could not be read.' });
      }
    }
    const listed = this.index.map((line) => line.segment);
    for (const name of onDisk) if (!listed.includes(name)) this.problems.push({ code: 'index_mismatch', detail: `${name} is on disk but not in the index.` });
    if (onDisk.length > 0 && this.index.length === 0) this.problems.push({ code: 'index_mismatch', detail: 'Segments exist but the index is empty or missing.' });

    let prevHash: string | null = null;
    let seq = 0;
    for (let i = 0; i < this.index.length; i += 1) {
      const { segment, firstSeq, prevHash: indexPrev } = this.index[i];
      if (firstSeq !== seq + 1 || indexPrev !== prevHash) {
        this.problems.push({ code: 'chain_broken', detail: `${segment} does not start where the previous segment ended.` });
      }
      let text: string;
      try {
        text = await readFile(join(this.dir, segment), 'utf8');
      } catch {
        this.problems.push({ code: 'index_mismatch', detail: `${segment} is in the index but missing from disk.` });
        continue;
      }
      this.segmentBytes = Buffer.byteLength(text, 'utf8');
      const parts = text.split('\n');
      const tail = parts.pop() ?? '';
      if (tail.length > 0) {
        this.problems.push({ code: 'incomplete_entry', detail: `${segment} ends with a half-written entry (${Buffer.byteLength(tail, 'utf8')} bytes). It is kept as it is.` });
        this.needsNewSegment = true;
      }
      for (const raw of parts) {
        let line: LogLine<T>;
        try {
          line = JSON.parse(raw) as LogLine<T>;
        } catch {
          this.problems.push({ code: 'unreadable_entry', detail: `${segment} has a line that cannot be read.` });
          continue;
        }
        const { hash, ...body } = line;
        if (line.seq !== seq + 1 || line.prevHash !== prevHash || lineHash(body) !== hash) {
          this.problems.push({ code: 'chain_broken', detail: `The chain breaks at entry ${line.seq} in ${segment}.` });
        }
        this.lines.push(line);
        seq = line.seq;
        prevHash = line.hash;
      }
    }
    this.head = { seq, hash: prevHash };
  }

  /** Append one entry, flushed to disk before this resolves. Serialised, so the chain cannot fork. */
  append(entry: T): Promise<LogLine<T>> {
    const next = this.queue.then(async () => {
      if (this.options.strict && (this.uncertain || this.problems.length)) throw new Error('Log requires reconciliation.');
      try { return await this.appendNow(entry); }
      catch (error) { this.uncertain = true; throw error; }
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async write(path: string, text: string): Promise<void> {
    if (!this.options.writeHook) return appendDurably(path, text);
    const handle = await open(path, 'a', 0o600);
    try {
      await this.options.writeHook('before-write', path);
      await handle.appendFile(text, 'utf8');
      await this.options.writeHook('after-write', path);
      await handle.sync();
      await this.options.writeHook('after-sync', path);
    } finally { await handle.close(); }
  }

  private async appendNow(entry: T): Promise<LogLine<T>> {
    const body = { seq: this.head.seq + 1, at: new Date().toISOString(), prevHash: this.head.hash, entry };
    const line: LogLine<T> = { ...body, hash: lineHash(body) };
    const text = `${JSON.stringify(line)}\n`;
    const bytes = Buffer.byteLength(text, 'utf8');

    if (this.index.length === 0 || this.needsNewSegment || this.segmentBytes + bytes > this.maxSegmentBytes) {
      const indexLine: IndexLine = { segment: segmentName(this.index.length + 1), firstSeq: line.seq, prevHash: this.head.hash, startedAt: body.at };
      await this.write(join(this.dir, 'index.jsonl'), `${JSON.stringify(indexLine)}\n`);
      this.index.push(indexLine);
      this.segmentBytes = 0;
      this.needsNewSegment = false;
    }
    await this.write(join(this.dir, this.index[this.index.length - 1].segment), text);
    this.segmentBytes += bytes;
    this.lines.push(line);
    this.head = { seq: line.seq, hash: line.hash };
    return line;
  }

  /** Copy the index and every segment to a backup folder. The copies are only ever replaced by longer ones. */
  async backup(target: string): Promise<void> {
    await mkdir(target, { recursive: true, mode: 0o700 });
    for (const name of ['index.jsonl', ...this.index.map((line) => line.segment)]) {
      const source = join(this.dir, name);
      const destination = join(target, name);
      const [from, to] = await Promise.all([stat(source).catch(() => null), stat(destination).catch(() => null)]);
      if (from && (!to || to.size <= from.size)) await copyFile(source, destination);
    }
  }
}
