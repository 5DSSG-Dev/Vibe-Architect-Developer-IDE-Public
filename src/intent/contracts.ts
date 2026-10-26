import type { ActionClass, ActionPermission, IdentityCoverageState } from '../identity/contracts.js';

export type GestureKind =
  | 'dock_item'
  | 'undock_item'
  | 'tether_satellite'
  | 'untether_satellite'
  | 'mesh_connect'
  | 'mesh_disconnect'
  | 'portal_place'
  | 'portal_remove'
  | 'daemon_toggle'
  | 'budget_adjust';

export type MutationTarget =
  | 'sockets'
  | 'contracts'
  | 'portals'
  | 'daemons'
  | 'budget';

export type ResolutionVerdict = 'permitted' | 'denied' | 'deferred';

export type DispatchRoute = 'direct' | 'construction' | 'deferred';

export type OutcomeStatus = 'executed' | 'blocked' | 'deferred' | 'failed';

export interface IntentEnvelope {
  intentId: string;
  timestamp: string;
  gesture: GestureKind;
  actionClass: ActionClass;
  sourceEntityId: string;
  targetEntityId: string;
  mutationTargets: MutationTarget[];
  parameters: Record<string, unknown>;
  hash: string;
}

export interface IntentResolution {
  resolutionId: string;
  intentRef: string;
  timestamp: string;
  verdict: ResolutionVerdict;
  permission: ActionPermission;
  identityCoverageState: IdentityCoverageState;
  reason: string;
  hash: string;
}

export interface DispatchDecision {
  decisionId: string;
  intentRef: string;
  resolutionRef: string;
  timestamp: string;
  route: DispatchRoute;
  approved: boolean;
  reason: string;
  hash: string;
}

export interface DispatchOutcome {
  outcomeId: string;
  intentRef: string;
  decisionRef: string;
  timestamp: string;
  status: OutcomeStatus;
  resolution: IntentResolution;
  decision: DispatchDecision;
  mutationApplied: boolean;
  failureDetail: string | null;
  hash: string;
}

export const GESTURE_ACTION_CLASS_MAP: Record<GestureKind, ActionClass> = {
  dock_item: 'consequential_mutation',
  undock_item: 'consequential_mutation',
  tether_satellite: 'consequential_mutation',
  untether_satellite: 'consequential_mutation',
  mesh_connect: 'consequential_mutation',
  mesh_disconnect: 'consequential_mutation',
  portal_place: 'reversible_bounded',
  portal_remove: 'reversible_bounded',
  daemon_toggle: 'reversible_bounded',
  budget_adjust: 'reversible_bounded',
};

export const GESTURE_DISPATCH_ROUTES: Record<GestureKind, DispatchRoute> = {
  dock_item: 'construction',
  undock_item: 'construction',
  tether_satellite: 'construction',
  untether_satellite: 'construction',
  mesh_connect: 'construction',
  mesh_disconnect: 'construction',
  portal_place: 'direct',
  portal_remove: 'direct',
  daemon_toggle: 'direct',
  budget_adjust: 'direct',
};

export const GESTURE_MUTATION_TARGETS: Record<GestureKind, MutationTarget[]> = {
  dock_item: ['sockets', 'contracts'],
  undock_item: ['sockets', 'contracts'],
  tether_satellite: ['sockets', 'contracts'],
  untether_satellite: ['sockets', 'contracts'],
  mesh_connect: ['contracts'],
  mesh_disconnect: ['contracts'],
  portal_place: ['portals'],
  portal_remove: ['portals'],
  daemon_toggle: ['daemons'],
  budget_adjust: ['budget'],
};

export const GESTURE_KIND_ORDER: GestureKind[] = [
  'dock_item',
  'undock_item',
  'tether_satellite',
  'untether_satellite',
  'mesh_connect',
  'mesh_disconnect',
  'portal_place',
  'portal_remove',
  'daemon_toggle',
  'budget_adjust',
];
