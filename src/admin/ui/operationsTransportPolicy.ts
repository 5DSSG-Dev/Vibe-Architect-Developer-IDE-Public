export const MAX_TRANSPORT_FAILURES = 5;
export const MAX_RECONNECT_DELAY_MS = 8_000;

export type TransportRecovery = 'resume' | 'resync' | 'stop';

export function reconnectDelayMs(failureCount: number): number {
  return Math.min(MAX_RECONNECT_DELAY_MS, 1_000 * 2 ** Math.max(0, failureCount - 1));
}

export function chooseTransportRecovery(input: {
  failureCount: number;
  hasCursor: boolean;
  resumeAttempted: boolean;
  needsResynchronization: boolean;
}): TransportRecovery {
  if (input.failureCount >= MAX_TRANSPORT_FAILURES) return 'stop';
  if (input.needsResynchronization) return 'resync';
  if (input.hasCursor && !input.resumeAttempted) return 'resume';
  return 'resync';
}

export function isUnauthorizedTransportError(error?: Error & { status?: number }): boolean {
  return error?.status === 401
    || error?.status === 403
    || error?.name === 'UnauthorizedOperationsDataSourceError';
}
