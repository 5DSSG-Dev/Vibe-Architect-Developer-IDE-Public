/** Unmounted orchestration: establish request identity before provider or numeric gates. */
import { createHash } from 'node:crypto';
import type { GovernedReply, GovernanceOptions } from '../luminary-governance.js';
import type { IdqObservation } from './idq.js';
import type { CurrentGateAdapters } from './marker-adapters.js';
import { runClaimedNumericDelivery, type AtomicDeliveryClaims, type NumericDeliveryOutcome } from './numeric-delivery-claim.js';
import { numericDeliveryId } from './numeric-delivery-reconciliation.js';
import type { NumericPurpose, RequestIdentityResult } from './numeric-request-identity.js';

export interface RequestIdentities {
  issue(scope: string, clientKey: string, purpose: NumericPurpose, inputHash: string): Promise<RequestIdentityResult>;
}
export type RequestDeliveryResult = Readonly<
  | { status: 'invalid_request' | 'identity_conflict' | 'identity_uncertain'; requestId: null; deliveryId: null }
  | { status: 'provider_error'; requestId: string; deliveryId: string }
  | { status: 'routed'; requestId: string; deliveryId: string; outcome: NumericDeliveryOutcome }
>;

/** Caller must supply an authenticated scope and a stable client retry key for this exact prompt. */
export async function runNumericRequestDelivery(
  request: { scope: string; clientKey: string; purpose: NumericPurpose; prompt: string },
  identities: RequestIdentities,
  model: (prompt: string) => Promise<unknown> | unknown,
  adaptersForAttempt: (reply: GovernedReply, attempt: number) => CurrentGateAdapters,
  reform: (observation: IdqObservation, previous: GovernedReply, attempt: number) => Promise<unknown> | unknown,
  claims: AtomicDeliveryClaims,
  receiver: (reply: GovernedReply, deliveryId: string) => Promise<unknown> | unknown,
  maxReforms = 2,
  governance: GovernanceOptions = {},
): Promise<RequestDeliveryResult> {
  const stopped = (status: 'invalid_request' | 'identity_conflict' | 'identity_uncertain'): RequestDeliveryResult =>
    Object.freeze({ status, requestId: null, deliveryId: null });
  let captured: { scope: string; clientKey: string; purpose: NumericPurpose; prompt: string };
  try {
    if (!request || typeof request !== 'object' || Object.getPrototypeOf(request) !== Object.prototype ||
        Reflect.ownKeys(request).sort().join(',') !== 'clientKey,prompt,purpose,scope') return stopped('invalid_request');
    const descriptors = Object.getOwnPropertyDescriptors(request);
    if (Object.values(descriptors).some((descriptor) => !('value' in descriptor))) return stopped('invalid_request');
    const { scope, clientKey, purpose, prompt } = Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value])) as typeof request;
    if (typeof scope !== 'string' || typeof clientKey !== 'string' ||
        (purpose !== 'ask-reply' && purpose !== 'task-proposal') ||
        typeof prompt !== 'string' || !prompt.trim()) return stopped('invalid_request');
    captured = Object.freeze({ scope, clientKey, purpose, prompt });
  } catch { return stopped('invalid_request'); }
  const inputHash = createHash('sha256').update(captured.prompt).digest('hex');
  let identity: RequestIdentityResult;
  try { identity = await identities.issue(captured.scope, captured.clientKey, captured.purpose, inputHash); }
  catch { return stopped('identity_uncertain'); }
  if (identity.status === 'conflict') return stopped('identity_conflict');
  if (identity.status === 'invalid') return stopped('invalid_request');
  if (identity.status !== 'issued' && identity.status !== 'existing') return stopped('identity_uncertain');
  const deliveryId = numericDeliveryId(identity.requestId, captured.purpose);
  if (!deliveryId) return stopped('identity_uncertain');
  let candidate: unknown;
  try { candidate = await model(captured.prompt); }
  catch { return Object.freeze({ status: 'provider_error', requestId: identity.requestId, deliveryId }); }
  const outcome = await runClaimedNumericDelivery(candidate, adaptersForAttempt, reform,
    deliveryId, claims, receiver, maxReforms, governance);
  return Object.freeze({ status: 'routed', requestId: identity.requestId, deliveryId, outcome });
}
