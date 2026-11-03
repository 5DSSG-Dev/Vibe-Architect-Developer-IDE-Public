/** Unmounted candidate/reform loop over the numeric route. Dispatch remains external. */
import type { IdqObservation } from './idq.js';
import { examineWithCurrentGates, type CurrentGateAdapters } from './marker-adapters.js';
import { markerToIdq } from './marker-idq.js';
import type { RouteOutcome } from './marker-route.js';

export type NumericLoopResult =
  | { status: 'admitted'; candidate: string; lineage: readonly RouteOutcome[] }
  | { status: 'withheld'; reason: 'route_shortfall' | 'idq_unavailable' | 'reform_error' | 'invalid_reform' | 'retry_exhausted'; lineage: readonly RouteOutcome[]; observation?: IdqObservation };

function sealObservation(observation: IdqObservation): IdqObservation {
  Object.freeze(observation.define);
  Object.freeze(observation.question);
  return Object.freeze(observation);
}

function finish<T extends NumericLoopResult>(result: T): T {
  Object.freeze(result.lineage);
  return Object.freeze(result);
}

/** Every reform receives a new adapter set, so its gate identities bind the new candidate. */
export async function runNumericReplyLoop(
  initialCandidate: string,
  adaptersForAttempt: (candidate: string, attempt: number) => CurrentGateAdapters,
  reform: (observation: IdqObservation, candidate: string, attempt: number) => Promise<unknown> | unknown,
  maxReforms = 2,
): Promise<NumericLoopResult> {
  const lineage: RouteOutcome[] = [];
  if (!Number.isSafeInteger(maxReforms) || maxReforms < 0 || maxReforms > 10) {
    return finish({ status: 'withheld', reason: 'invalid_reform', lineage });
  }
  let candidate = initialCandidate;
  for (let attempt = 1; attempt <= maxReforms + 1; attempt += 1) {
    let outcome: RouteOutcome;
    try { outcome = await examineWithCurrentGates(candidate, adaptersForAttempt(candidate, attempt)); }
    catch { return finish({ status: 'withheld', reason: 'route_shortfall', lineage }); }
    lineage.push(outcome);
    if (outcome.destination === 'prism') return finish({ status: 'admitted', candidate, lineage });
    if (outcome.destination === 'shortfall') return finish({ status: 'withheld', reason: 'route_shortfall', lineage });
    const rawObservation = markerToIdq(outcome);
    if (!rawObservation) return finish({ status: 'withheld', reason: 'idq_unavailable', lineage });
    const observation = sealObservation(rawObservation);
    if (attempt > maxReforms) return finish({ status: 'withheld', reason: 'retry_exhausted', lineage, observation });
    let next: unknown;
    try { next = await reform(observation, candidate, attempt); }
    catch { return finish({ status: 'withheld', reason: 'reform_error', lineage, observation }); }
    if (typeof next !== 'string' || !next.trim() || next === candidate) {
      return finish({ status: 'withheld', reason: 'invalid_reform', lineage, observation });
    }
    candidate = next;
  }
  return finish({ status: 'withheld', reason: 'retry_exhausted', lineage });
}
