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
  /** Capabilities the CORE could not provide at step 5 (reasonCode CAPABILITY_UNSATISFIED). */
  readonly missingCapabilities?: readonly string[];
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
let eventSequence = 0;

function freezeConnectionEvent(event: ConnectionEvent): ConnectionEvent {
  return Object.freeze({
    ...event,
    presentedContract: event.presentedContract ? Object.freeze({ ...event.presentedContract }) : undefined,
    missingCapabilities: event.missingCapabilities ? Object.freeze([...event.missingCapabilities]) : undefined,
    alternatives: event.alternatives ? Object.freeze(event.alternatives.map(alternative => Object.freeze({ ...alternative }))) : undefined,
    resources: event.resources ? Object.freeze({
      requested: event.resources.requested ? Object.freeze({ ...event.resources.requested }) : undefined,
      available: event.resources.available ? Object.freeze({ ...event.resources.available }) : undefined
    }) : undefined
  });
}

export function publishConnectionEvent(event: Omit<ConnectionEvent, 'eventId' | 'timestamp'> & { timestamp?: string }): ConnectionEvent {
  const eventId = typeof globalThis.crypto?.randomUUID === 'function'
    ? `conn-event-${globalThis.crypto.randomUUID()}`
    : `conn-event-${Date.now().toString(36)}-${++eventSequence}`;
  const committed = freezeConnectionEvent({
    ...event,
    eventId,
    timestamp: event.timestamp ?? new Date().toISOString()
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

/** Rehydrate persisted events without re-publishing them to persistence listeners. */
export function restoreConnectionEvents(events: readonly ConnectionEvent[]): void {
  const restored = new Map<string, ConnectionEvent>();
  for (const event of events) {
    if (!event.eventId || !event.attemptId || !event.timestamp || !event.kind) continue;
    restored.set(event.eventId, freezeConnectionEvent(event));
  }
  for (const event of eventLedger) restored.set(event.eventId, event);
  eventLedger.splice(0, eventLedger.length, ...restored.values());
}
