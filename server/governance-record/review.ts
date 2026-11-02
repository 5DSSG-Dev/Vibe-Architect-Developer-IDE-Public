// The review areas (STP-0005 P3, plan rev16 F3, F4, F5). Two append-only logs:
//
//   architect/  every Architect message, in full: coherent or not, sent on or returned
//   luminary/   every Luminary reply, in full, with every pass the pipeline made
//
// Both sit in a private folder in the Architect's own user profile, outside the repository,
// so they are never committed or published. The Architect can read both. An entry is never
// changed: a revision or a resubmission is a new entry that names the one it came from.
//
// If a check fails on start, or the second anchor in the browser's evidence archive does not
// match, governance stays closed until the Architect has seen the problem and acknowledged it.

import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { CallCounts } from '../luminary-pipeline/call-log.js';
import type { IdsObservation } from '../luminary-pipeline/ids.js';
import type { LineageEntry } from '../luminary-pipeline/pipeline.js';
import { AppendOnlyLog, type LogHead, type LogLine, type LogProblem } from './log.js';

export const DEFAULT_RECORD_DIR = join(homedir(), '.aegis-vibe-architect', 'governance');

/** The message limit (F3): two revisions, then the review area. */
export const MESSAGE_REVISION_LIMIT = 2;

export type ArchitectState = 'sent' | 'returned' | 'saved_for_review' | 'gauge_error' | 'ids_error';

export interface ArchitectEntry {
  kind: 'architect_message';
  id: string;
  message: string;
  /** 0 for an original, 1 and 2 for revisions (F3). */
  loop: number;
  revisionOf?: string;
  /** Set on a resubmission from the review area: a new linked entry with a fresh count (F5). */
  resubmittedFrom?: string;
  state: ArchitectState;
  flaggedBy?: 'structural' | 'pim' | 'irg';
  observation?: IdsObservation;
  lineage: LineageEntry[];
  calls?: CallCounts;
}

export type LuminaryState = 'delivered' | 'saved_for_review' | 'gauge_error' | 'ids_error' | 'upstream_error' | 'not_delivered';

export interface LuminaryEntry {
  kind: 'luminary_reply';
  id: string;
  /** The Architect message this reply answers. */
  architectEntryId: string;
  modelId: string | null;
  /** Every candidate the pipeline read, in order, in full. */
  passes: string[];
  state: LuminaryState;
  shortfallCode?: string;
  lineage: LineageEntry[];
  calls?: CallCounts;
}

export interface NoteEntry {
  kind: 'note';
  id: string;
  text: string;
}

export type AreaName = 'architect' | 'luminary';
type AreaEntry = ArchitectEntry | LuminaryEntry | NoteEntry;

export interface Anchor {
  area: AreaName;
  seq: number;
  hash: string;
}

export interface AreaStatus {
  head: LogHead;
  problems: LogProblem[];
}

export class ReviewRecord {
  private openProblems: Array<LogProblem & { area: AreaName | 'anchor' }> = [];

  private constructor(
    readonly architect: AppendOnlyLog<AreaEntry>,
    readonly luminary: AppendOnlyLog<AreaEntry>,
    private readonly backupDir: string | undefined,
  ) {
    for (const problem of architect.problems) this.openProblems.push({ ...problem, area: 'architect' });
    for (const problem of luminary.problems) this.openProblems.push({ ...problem, area: 'luminary' });
  }

  static async open(options: { dir?: string; backupDir?: string; maxSegmentBytes?: number } = {}): Promise<ReviewRecord> {
    const dir = options.dir ?? DEFAULT_RECORD_DIR;
    const [architect, luminary] = await Promise.all([
      AppendOnlyLog.open<AreaEntry>(join(dir, 'architect'), options),
      AppendOnlyLog.open<AreaEntry>(join(dir, 'luminary'), options),
    ]);
    const record = new ReviewRecord(architect, luminary, options.backupDir);
    await record.backup();
    return record;
  }

  /** Closed while any problem found on start or by the anchor check is unacknowledged. */
  get closed(): boolean {
    return this.openProblems.length > 0;
  }

  get problems(): ReadonlyArray<LogProblem & { area: AreaName | 'anchor' }> {
    return this.openProblems;
  }

  newId(): string {
    return randomUUID();
  }

  findArchitect(id: string): ArchitectEntry | undefined {
    for (let i = this.architect.entries.length - 1; i >= 0; i -= 1) {
      const entry = this.architect.entries[i].entry;
      if (entry.kind === 'architect_message' && entry.id === id) return entry;
    }
    return undefined;
  }

  async appendArchitect(entry: ArchitectEntry): Promise<Anchor> {
    const line = await this.architect.append(entry);
    if (entry.state === 'saved_for_review') await this.backup();
    return { area: 'architect', seq: line.seq, hash: line.hash };
  }

  async appendLuminary(entry: LuminaryEntry): Promise<Anchor> {
    const line = await this.luminary.append(entry);
    if (entry.state === 'saved_for_review') await this.backup();
    return { area: 'luminary', seq: line.seq, hash: line.hash };
  }

  /** The items saved for review in one area, newest first, in full. */
  reviewItems(area: AreaName): Array<LogLine<AreaEntry>> {
    const log = area === 'architect' ? this.architect : this.luminary;
    return log.entries.filter((line) => line.entry.kind !== 'note' && line.entry.state === 'saved_for_review').slice().reverse();
  }

  status(): Record<AreaName, AreaStatus> {
    return {
      architect: { head: this.architect.latest, problems: [...this.architect.problems] },
      luminary: { head: this.luminary.latest, problems: [...this.luminary.problems] },
    };
  }

  /**
   * The second anchor (F4): the newest hash and count the browser recorded for each area. A
   * pointer past the head means entries were cut off; a hash that differs means the log was
   * replaced. Either keeps governance closed until the Architect has seen it.
   */
  checkAnchors(anchors: readonly Anchor[]): LogProblem[] {
    const found: LogProblem[] = [];
    for (const anchor of anchors) {
      const log = anchor.area === 'architect' ? this.architect : this.luminary;
      if (anchor.seq > log.latest.seq) {
        found.push({ code: 'chain_broken', detail: `The ${anchor.area} log ends at entry ${log.latest.seq}, but the IDE recorded entry ${anchor.seq}. Entries are missing from the end.` });
      } else if (log.hashAt(anchor.seq) !== anchor.hash) {
        found.push({ code: 'chain_broken', detail: `The ${anchor.area} log's entry ${anchor.seq} does not match what the IDE recorded. The log may have been replaced.` });
      }
    }
    for (const problem of found) this.openProblems.push({ ...problem, area: 'anchor' });
    return found;
  }

  /** The Architect has seen the problems. Recorded in both logs; nothing is removed or repaired. */
  async acknowledge(): Promise<void> {
    if (this.openProblems.length === 0) return;
    const text = `The Architect acknowledged: ${this.openProblems.map((p) => `[${p.area}] ${p.detail}`).join(' ')}`;
    await this.architect.append({ kind: 'note', id: this.newId(), text });
    await this.luminary.append({ kind: 'note', id: this.newId(), text });
    this.openProblems = [];
  }

  private async backup(): Promise<void> {
    if (!this.backupDir) return;
    await this.architect.backup(join(this.backupDir, 'architect'));
    await this.luminary.backup(join(this.backupDir, 'luminary'));
  }
}
