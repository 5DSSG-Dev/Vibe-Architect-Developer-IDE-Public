/** Unmounted structural-governance wrapper for the numeric candidate/reform loop. */
import { DEFAULT_MAX_CONTENT_BYTES, governReply, type GovernanceOptions, type GovernedReply, type Shortfall } from '../luminary-governance.js';
import type { IdqObservation } from './idq.js';
import type { CurrentGateAdapters } from './marker-adapters.js';
import { runNumericReplyLoop, type NumericLoopResult } from './numeric-reply-loop.js';

export type GovernedNumericResult =
  | { status: 'admitted'; reply: GovernedReply; lineage: NumericLoopResult['lineage'] }
  | { status: 'withheld'; reason: 'structural_shortfall' | 'configuration_error' | Extract<NumericLoopResult, { status: 'withheld' }>['reason'];
      lineage: NumericLoopResult['lineage']; structural?: Shortfall; observation?: IdqObservation };

function seal(result: GovernedNumericResult): GovernedNumericResult {
  const lineage = Object.freeze([...result.lineage]);
  if (result.status === 'admitted') return Object.freeze({ status: 'admitted', reply: Object.freeze({ ...result.reply }), lineage });
  const structural = result.structural ? Object.freeze({ ...result.structural }) : undefined;
  return Object.freeze({ status: 'withheld', reason: result.reason, lineage,
    ...(structural ? { structural } : {}), ...(result.observation ? { observation: result.observation } : {}) });
}

function captureGovernance(raw: GovernanceOptions): GovernanceOptions | null {
  try {
    if (!raw || typeof raw !== 'object' || Object.getPrototypeOf(raw) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(raw);
    if (keys.some((key) => key !== 'maxContentBytes')) return null;
    const descriptor = Object.getOwnPropertyDescriptor(raw, 'maxContentBytes');
    if (descriptor && !('value' in descriptor)) return null;
    const limit = descriptor ? descriptor.value : DEFAULT_MAX_CONTENT_BYTES;
    if (!Number.isSafeInteger(limit) || limit <= 0) return null;
    return Object.freeze({ maxContentBytes: limit });
  } catch { return null; }
}

const malformedReply: Shortfall = Object.freeze({ code: 'malformed_reply', message: 'Reply structure could not be read.', modelId: null });

/** Validate the first model reply and every reform before any semantic gate receives it. */
export async function runGovernedNumericReplyLoop(
  initial: unknown,
  adaptersForAttempt: (reply: GovernedReply, attempt: number) => CurrentGateAdapters,
  reform: (observation: IdqObservation, previous: GovernedReply, attempt: number) => Promise<unknown> | unknown,
  maxReforms = 2,
  governance: GovernanceOptions = {},
): Promise<GovernedNumericResult> {
  const policy = captureGovernance(governance);
  if (!policy) return seal({ status: 'withheld', reason: 'configuration_error', lineage: [] });
  let first;
  try { first = governReply(initial, policy); }
  catch { return seal({ status: 'withheld', reason: 'structural_shortfall', structural: malformedReply, lineage: [] }); }
  if (!first.ok) return seal({ status: 'withheld', reason: 'structural_shortfall', structural: first.shortfall, lineage: [] });
  let current: GovernedReply = Object.freeze({ ...first.reply });
  let structural: Shortfall | undefined;
  const result = await runNumericReplyLoop(current.content,
    (_candidate, attempt) => adaptersForAttempt(current, attempt),
    async (observation, _candidate, attempt) => {
      const raw = await reform(observation, current, attempt);
      let checked;
      try { checked = governReply(raw, policy); }
      catch {
        structural = malformedReply;
        throw new Error('structural_shortfall');
      }
      if (!checked.ok) {
        structural = checked.shortfall;
        throw new Error('structural_shortfall');
      }
      current = Object.freeze({ ...checked.reply });
      return current.content;
    }, maxReforms);
  if (result.status === 'admitted') {
    if (result.candidate !== current.content) return seal({ status: 'withheld', reason: 'route_shortfall', lineage: result.lineage });
    return seal({ status: 'admitted', reply: current, lineage: result.lineage });
  }
  if (structural) return seal({ status: 'withheld', reason: 'structural_shortfall', structural, lineage: result.lineage, observation: result.observation });
  return seal(result);
}
