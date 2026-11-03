/** Unmounted composition of authenticated HTTP context and numeric delivery. */
import type { GovernedReply, GovernanceOptions } from '../luminary-governance.js';
import type { IdqObservation } from './idq.js';
import { createNumericAuthenticatedRouter } from './numeric-authenticated-router.js';
import { createNumericIntegrationAdapters, type NumericIntegrationInputs } from './numeric-integration-adapters.js';
import type { AtomicDeliveryClaims } from './numeric-delivery-claim.js';
import { runNumericRequestDelivery, type RequestIdentities } from './numeric-request-delivery.js';
import type { NumericRequestContext } from './numeric-request-context.js';

export interface AuthenticatedNumericDeliveryInputs {
  identities: RequestIdentities;
  model: (prompt: string) => Promise<unknown> | unknown;
  integrationForRequest: (request: NumericRequestContext) => NumericIntegrationInputs;
  reform: (observation: IdqObservation, previous: GovernedReply, attempt: number) => Promise<unknown> | unknown;
  claims: AtomicDeliveryClaims;
  receiver: (reply: GovernedReply, deliveryId: string) => Promise<unknown> | unknown;
  maxReforms?: number;
  governance?: GovernanceOptions;
}

/** All dependencies are trusted server-owned sources; caller must mount after session middleware. */
export function createNumericAuthenticatedDeliveryRouter(expectedOrigin: string, raw: AuthenticatedNumericDeliveryInputs) {
  if (!raw || Object.getPrototypeOf(raw) !== Object.prototype) throw new Error('numeric_delivery_inputs_invalid');
  const names = ['identities', 'model', 'integrationForRequest', 'reform', 'claims', 'receiver', 'maxReforms', 'governance'];
  if (Reflect.ownKeys(raw).some(key => typeof key !== 'string' || !names.includes(key))) throw new Error('numeric_delivery_inputs_invalid');
  const data = Object.getOwnPropertyDescriptors(raw);
  if (Object.values(data).some(descriptor => !('value' in descriptor))) throw new Error('numeric_delivery_inputs_invalid');
  const { identities, model, integrationForRequest, reform, claims, receiver, maxReforms, governance } =
    Object.fromEntries(Object.entries(data).map(([key, descriptor]) => [key, descriptor.value])) as AuthenticatedNumericDeliveryInputs;
  if (!identities || typeof identities.issue !== 'function' || typeof model !== 'function' ||
      typeof integrationForRequest !== 'function' || typeof reform !== 'function' ||
      !claims || typeof claims.claimOnce !== 'function' || typeof receiver !== 'function' ||
      (maxReforms !== undefined && (!Number.isSafeInteger(maxReforms) || maxReforms < 0 || maxReforms > 10))) {
    throw new Error('numeric_delivery_inputs_invalid');
  }
  return createNumericAuthenticatedRouter(expectedOrigin, request => {
    let adapters: ReturnType<typeof createNumericIntegrationAdapters> | undefined;
    return runNumericRequestDelivery(request, identities, model, (reply, attempt) => {
      adapters ??= createNumericIntegrationAdapters(integrationForRequest(request));
      return adapters(reply, attempt);
    }, reform, claims, receiver, maxReforms, governance);
  });
}
