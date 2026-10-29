import type { OrbContractReference } from './orbManifest';
import type { UmbilicalProfileId } from './umbilicalStandards';

export type ConnectionEventKind =
  | 'attempt-started' | 'contract-resolved' | 'resources-committed' | 'refused'
  | 'active' | 'degraded' | 'suspended' | 'severed' | 'resources-released';

export interface ConnectionAlternative {
  readonly profileId: UmbilicalProfileId;
  readonly profileVersion: string;
  readonly memoryMB: number;
  readonly threads: number;
  readonly bandwidthNormal: number;
  readonly bandwidthPeak: number;
  readonly gpu: boolean;
}

export interface ConnectionEvent {
  readonly eventId: string;
  readonly attemptId: string;
  readonly kind: ConnectionEventKind;
  readonly timestamp: string;
  readonly orbId: string;
  readonly portId: string;
  readonly presentedContract?: OrbContractReference;
  readonly resolvedContractId?: string;
  readonly resolvedContractVersion?: string;
  readonly profileId?: UmbilicalProfileId;
  readonly profileVersion?: string;
  readonly reasonCode?: string;
  readonly message?: string;
  /** CORE-validated profile choices that fit the reported fresh resource snapshot. */
  readonly alternatives?: readonly ConnectionAlternative[];
  readonly resources?: {
    readonly requested?: { readonly memoryMB: number; readonly threads: number; readonly bandwidthNormal: number; readonly bandwidthPeak: number; readonly gpu: boolean };
    readonly available?: { readonly memoryMB: number; readonly threads: number; readonly bandwidthCredits: number; readonly gpu: boolean };
  };
}

type ConnectionEventListener = (event: ConnectionEvent) => void;
const eventLedger: ConnectionEvent[] = [];
const listeners = new Set<ConnectionEventListener>();

export function publishConnectionEvent(event: Omit<ConnectionEvent, 'eventId' | 'timestamp'> & { timestamp?: string }): ConnectionEvent {
  const committed = Object.freeze({
    ...event,
    eventId: `conn-event-${eventLedger.length + 1}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
    presentedContract: event.presentedContract ? Object.freeze({ ...event.presentedContract }) : undefined,
    alternatives: event.alternatives ? Object.freeze(event.alternatives.map(alternative => Object.freeze({ ...alternative }))) : undefined,
    resources: event.resources ? Object.freeze({
      requested: event.resources.requested ? Object.freeze({ ...event.resources.requested }) : undefined,
      available: event.resources.available ? Object.freeze({ ...event.resources.available }) : undefined
    }) : undefined
  });
  eventLedger.push(committed);
  for (const listener of listeners) listener(committed);
  return committed;
}

export function subscribeConnectionEvents(listener: ConnectionEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConnectionEvents(): readonly ConnectionEvent[] {
  return Object.freeze([...eventLedger]);
}
