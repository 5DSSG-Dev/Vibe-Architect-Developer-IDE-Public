/** Unmounted PTAG attempt issuer. The caller must supply approved context and eligible facts. */
import { createHash, randomUUID } from 'node:crypto';
import type { PtagCheck } from './marker-adapters.js';
import { derivePtagCaseId, validatedPtagCheck } from './ptag-validated-adapter.js';

export interface TrustedPtagInputs {
  contextBinding: string | null;
  eligibleFactIds: ReadonlySet<string>;
}

export interface PtagAttemptRequest {
  readonly candidate: string;
  readonly caseId: string;
  readonly contextBinding: string | null;
  readonly eligibleFactIds: readonly string[];
}

/** Mint a new case for one candidate. The producer must echo its case ID in its envelope. */
export function createAttemptBoundPtagCheck(
  candidate: string,
  trusted: TrustedPtagInputs,
  produce: (request: PtagAttemptRequest) => Promise<unknown> | unknown,
): PtagCheck {
  if (typeof candidate !== 'string' || !candidate.trim()) throw new Error('invalid_ptag_candidate');
  if (!trusted || typeof trusted !== 'object' || Object.getPrototypeOf(trusted) !== Object.prototype
    || Reflect.ownKeys(trusted).some((key) => key !== 'contextBinding' && key !== 'eligibleFactIds')) {
    throw new Error('invalid_ptag_trusted_context');
  }
  const bindingField = Object.getOwnPropertyDescriptor(trusted, 'contextBinding');
  const factsField = Object.getOwnPropertyDescriptor(trusted, 'eligibleFactIds');
  if (!bindingField || !('value' in bindingField) || !factsField || !('value' in factsField)) {
    throw new Error('invalid_ptag_trusted_context');
  }
  const binding = bindingField.value;
  if (binding !== null && (typeof binding !== 'string' || !binding.trim())) throw new Error('invalid_ptag_context_binding');
  const facts = factsField.value;
  if (!(facts instanceof Set) || Object.getPrototypeOf(facts) !== Set.prototype) throw new Error('invalid_ptag_eligible_facts');
  const factIds = Array.from(Set.prototype.values.call(facts) as IterableIterator<unknown>);
  if (factIds.length > 4096) throw new Error('invalid_ptag_eligible_facts');
  if (factIds.some((id) => typeof id !== 'string' || !id.trim())) throw new Error('invalid_ptag_eligible_facts');
  const capturedIds = factIds as string[];
  const candidateHash = createHash('sha256').update(candidate).digest('hex');
  const attemptId = randomUUID();
  const caseId = derivePtagCaseId(candidateHash, binding, attemptId);
  const context = { caseId, attemptId, candidateHash, contextBinding: binding, eligibleFactIds: new Set(capturedIds) };
  const request: PtagAttemptRequest = Object.freeze({ candidate, caseId, contextBinding: binding, eligibleFactIds: Object.freeze(capturedIds) });
  const check = validatedPtagCheck(context, (actual) => {
    if (actual !== candidate) throw new Error('ptag_validation: candidate_mismatch');
    return produce(request);
  });
  let claimed = false;
  return (actual) => {
    if (claimed) throw new Error('ptag_validation: attempt_reused');
    claimed = true;
    return check(actual);
  };
}
