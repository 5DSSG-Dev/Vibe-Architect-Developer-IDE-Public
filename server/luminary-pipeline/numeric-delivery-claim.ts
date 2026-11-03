/** Unmounted delivery boundary. Atomic claim precedes any receiver invocation. */
import { createHash } from 'node:crypto';
import type { GovernedReply, GovernanceOptions } from '../luminary-governance.js';
import type { IdqObservation } from './idq.js';
import { runGovernedNumericReplyLoop, type GovernedNumericResult } from './governed-numeric-reply-loop.js';
import type { CurrentGateAdapters } from './marker-adapters.js';

export type ClaimOutcome = 'claimed' | 'duplicate' | 'conflict' | 'uncertain';
export interface AtomicDeliveryClaims {
  /** Must be atomic across every process that can call the receiver. */
  claimOnce(deliveryId: string, candidateHash: string): Promise<ClaimOutcome>;
}

export interface RedisClaimClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}

const CLAIM_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing then
  if existing == ARGV[1] then return 0 end
  return -1
end
redis.call('SET', KEYS[1], ARGV[1])
return 1
`;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[0-9a-f]{64}$/;

/** Redis atomic claim; deployment must separately establish Redis persistence and key retention. */
export class RedisAtomicDeliveryClaims implements AtomicDeliveryClaims {
  constructor(private readonly client: RedisClaimClient, private readonly prefix = 'aegis:numeric-delivery:') {}

  async claimOnce(deliveryId: string, candidateHash: string): Promise<ClaimOutcome> {
    if (!ID.test(deliveryId) || !HASH.test(candidateHash)) return 'conflict';
    const key = `${this.prefix}${createHash('sha256').update(deliveryId).digest('hex')}`;
    const payload = JSON.stringify({ version: 1, deliveryId, candidateHash });
    try {
      const code = await this.client.eval(CLAIM_SCRIPT, { keys: [key], arguments: [payload] });
      if (code === 1) return 'claimed';
      if (code === 0) return 'duplicate';
      if (code === -1) return 'conflict';
      return 'uncertain';
    } catch { return 'uncertain'; }
  }
}

export type NumericDeliveryOutcome =
  | { status: 'withheld'; route: GovernedNumericResult }
  | { status: 'claim_uncertain' | 'duplicate_claim' | 'identity_conflict' | 'delivery_uncertain' | 'delivered'; route: Extract<GovernedNumericResult, { status: 'admitted' }> };

/** Owns the route result until the claim is resolved; no caller-supplied result can authorize delivery. */
export async function runClaimedNumericDelivery(
  initial: unknown,
  adaptersForAttempt: (reply: GovernedReply, attempt: number) => CurrentGateAdapters,
  reform: (observation: IdqObservation, previous: GovernedReply, attempt: number) => Promise<unknown> | unknown,
  deliveryId: string,
  claims: AtomicDeliveryClaims,
  receiver: (reply: GovernedReply, deliveryId: string) => Promise<unknown> | unknown,
  maxReforms = 2,
  governance: GovernanceOptions = {},
): Promise<NumericDeliveryOutcome> {
  const route = await runGovernedNumericReplyLoop(initial, adaptersForAttempt, reform, maxReforms, governance);
  if (route.status === 'withheld') return Object.freeze({ status: 'withheld', route });
  const candidateHash = route.lineage.at(-1)?.marker.candidateHash;
  if (!candidateHash || !ID.test(deliveryId) ||
      candidateHash !== createHash('sha256').update(route.reply.content).digest('hex')) {
    return Object.freeze({ status: 'identity_conflict', route });
  }
  let claim: ClaimOutcome;
  try { claim = await claims.claimOnce(deliveryId, candidateHash); }
  catch { claim = 'uncertain'; }
  if (claim === 'duplicate') return Object.freeze({ status: 'duplicate_claim', route });
  if (claim === 'conflict') return Object.freeze({ status: 'identity_conflict', route });
  if (claim !== 'claimed') return Object.freeze({ status: 'claim_uncertain', route });
  try { await receiver(route.reply, deliveryId); }
  catch { return Object.freeze({ status: 'delivery_uncertain', route }); }
  return Object.freeze({ status: 'delivered', route });
}
