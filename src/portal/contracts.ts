import type { ActionPermission } from '../identity/contracts.js';

export type PortalState =
  | 'dormant'
  | 'negotiating'
  | 'active'
  | 'suspended'
  | 'severed';

export type ExternalServiceKind =
  | 'api'
  | 'stream'
  | 'storage'
  | 'compute'
  | 'monitor';

export type FlowDirection = 'inbound' | 'outbound' | 'bidirectional';

export type TenderState =
  | 'initializing'
  | 'ready'
  | 'serving'
  | 'draining'
  | 'terminated';

export const PORTAL_STATE_ORDER: PortalState[] = [
  'dormant',
  'negotiating',
  'active',
  'suspended',
  'severed',
];

export const TENDER_STATE_ORDER: TenderState[] = [
  'initializing',
  'ready',
  'serving',
  'draining',
  'terminated',
];

export const VALID_PORTAL_TRANSITIONS: Record<PortalState, PortalState[]> = {
  dormant: ['negotiating'],
  negotiating: ['active', 'severed'],
  active: ['suspended', 'severed'],
  suspended: ['active', 'severed'],
  severed: ['dormant'],
};

export const VALID_TENDER_TRANSITIONS: Record<TenderState, TenderState[]> = {
  initializing: ['ready', 'terminated'],
  ready: ['serving', 'terminated'],
  serving: ['draining', 'terminated'],
  draining: ['terminated'],
  terminated: ['initializing'],
};

export interface ExternalEndpoint {
  endpointId: string;
  serviceKind: ExternalServiceKind;
  protocol: string;
  address: string;
  flowDirection: FlowDirection;
  capabilities: string[];
  hash: string;
}

export interface BoundaryPolicy {
  policyId: string;
  allowedFlowDirections: FlowDirection[];
  allowedServiceKinds: ExternalServiceKind[];
  maxPayloadBytes: number;
  requiresIdentityGate: boolean;
  hash: string;
}

export interface TenderSpec {
  tenderId: string;
  portalRef: string;
  state: TenderState;
  endpoint: ExternalEndpoint;
  bufferCapacity: number;
  maxConcurrentFlows: number;
  healthCheckIntervalMs: number;
  hash: string;
}

export interface PortalDescriptor {
  portalId: string;
  name: string;
  angleDeg: number;
  state: PortalState;
  tender: TenderSpec | null;
  boundaryPolicy: BoundaryPolicy;
  createdAt: string;
  lastStateChange: string;
  hash: string;
}

export interface PortalContract {
  contractId: string;
  portalRef: string;
  tenderRef: string;
  endpointRef: string;
  timestamp: string;
  state: PortalState;
  negotiatedProtocol: string;
  flowDirection: FlowDirection;
  boundaryPolicyRef: string;
  negativeSpaceInvariants: {
    never_serializes_witness: boolean;
    never_persists_prompts: boolean;
    no_verdict_over_inner_life: boolean;
  };
  hash: string;
}

export interface PortalTransition {
  transitionId: string;
  portalRef: string;
  fromState: PortalState;
  toState: PortalState;
  timestamp: string;
  reason: string;
  identityPermission: ActionPermission | null;
  hash: string;
}

export interface PortalOperationResult {
  success: boolean;
  portal: PortalDescriptor;
  transition: PortalTransition | null;
  contract: PortalContract | null;
  failureReason: string | null;
}
