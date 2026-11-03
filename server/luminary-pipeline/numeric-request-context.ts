/** Unmounted request-context adapter for an authenticated, per-principal numeric route. */
import { createHash } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../session-store.js';
import type { NumericPurpose } from './numeric-request-identity.js';

export const NUMERIC_RETRY_KEY_HEADER = 'idempotency-key';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NumericRequestContext = Readonly<{
  scope: string;
  clientKey: string;
  purpose: NumericPurpose;
  prompt: string;
}>;

/** Caller must obtain principal from a verified server session, never from a request body/header. */
export function captureNumericRequestContext(
  principal: AuthenticatedPrincipal | null | undefined,
  retryKey: unknown,
  purpose: NumericPurpose,
  prompt: unknown,
): NumericRequestContext | null {
  try {
    if (!principal || typeof principal !== 'object' || Object.getPrototypeOf(principal) !== Object.prototype) return null;
    const subjectDescriptor = Object.getOwnPropertyDescriptor(principal, 'subject');
    const tenantDescriptor = Object.getOwnPropertyDescriptor(principal, 'tenantId');
    if (!subjectDescriptor || !('value' in subjectDescriptor) || !tenantDescriptor || !('value' in tenantDescriptor)) return null;
    const subject = subjectDescriptor.value;
    const tenantId = tenantDescriptor.value;
    if (typeof subject !== 'string' || !subject || subject.length > 256 ||
        typeof tenantId !== 'string' || !tenantId || tenantId.length > 256 ||
        typeof retryKey !== 'string' || !UUID_V4.test(retryKey) ||
        (purpose !== 'ask-reply' && purpose !== 'task-proposal') ||
        typeof prompt !== 'string' || !prompt.trim()) return null;
    const scope = `principal:${createHash('sha256').update(JSON.stringify([tenantId, subject])).digest('hex')}`;
    return Object.freeze({ scope, clientKey: `retry:${retryKey.toLowerCase()}`, purpose, prompt });
  } catch { return null; }
}
