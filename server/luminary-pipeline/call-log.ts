// Call log (STP-0005 P1, plan rev16 G6). Every model call and every delivery to the
// Architect is tagged by path at the point it is made, never inferred afterwards, so the
// gate's zero-call criteria can be audited:
//
//   luminary_response   any call that could produce a Luminary reply to the Architect
//   ids_model           IDS's embedded-model calls (Identify, Define, Suggest, rewrites)
//   gauge               IRG scoring calls
//   architect_delivery  a governed Luminary reply delivered to the Architect
//
// The embedded model and the Luminary may share a provider; the tag still keeps them apart.

export const CALL_PATHS = ['luminary_response', 'ids_model', 'gauge', 'architect_delivery'] as const;

export type CallPath = (typeof CALL_PATHS)[number];

export interface CallRecord {
  path: CallPath;
  /** True when this call is the bounded service retry (F2b). */
  retry: boolean;
}

export type CallCounts = Record<CallPath, number>;

export interface CallLog {
  record(path: CallPath, retry?: boolean): void;
  readonly entries: readonly CallRecord[];
  counts(): CallCounts;
}

export function createCallLog(): CallLog {
  const entries: CallRecord[] = [];
  return {
    entries,
    record(path, retry = false) {
      if (!(CALL_PATHS as readonly string[]).includes(path)) throw new Error(`Untagged call path: ${String(path)}`);
      entries.push({ path, retry });
    },
    counts() {
      const counts = Object.fromEntries(CALL_PATHS.map((path) => [path, 0])) as CallCounts;
      for (const entry of entries) counts[entry.path] += 1;
      return counts;
    },
  };
}

/** Wrap an async call so every invocation is recorded under `path` before it runs. */
export function tagged<A extends unknown[], R>(log: CallLog, path: CallPath, call: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return (...args: A) => {
    log.record(path);
    return call(...args);
  };
}
