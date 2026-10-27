import type { AdminComponentKind } from '../../contracts/elementSchema';

export const TENSOR_CHANNELS = ['PEER', 'PCT', 'NCT', 'SPINE'] as const;

export type TensorChannel = (typeof TENSOR_CHANNELS)[number];
export type TrustState = 'draft' | 'provisional' | 'verified';
export type SourceBoundary = 'replay_fixture' | 'live';
export type ComponentKind = AdminComponentKind;

export interface CanonicalEvidenceContract {
  created_utc: string;
  source: string;
  trust_state: TrustState;
  [key: string]: unknown;
}

export interface CanonicalPodContract {
  schema_version: string;
  pod_id: string;
  peer_id: string;
  runtime: { language: string; implementation: string };
  tensor_spec: {
    spec_id: string;
    spec_path: string;
    active_output_root: string;
  };
  tensors: Record<TensorChannel, {
    name: TensorChannel;
    purpose: string;
    storage: string;
    output: string;
    shape: [string, number, number];
    dtype: string;
    axis_order: [string, string, string];
    append_only: boolean;
  }>;
  roles: Record<string, { purpose: string; owns: string[]; reads: string[] }>;
  processor: { purpose: string; status: string };
  temporal_daemon: { purpose: string; status: string };
  orbs: Array<{
    orb_id: string;
    required_for_full_function: boolean;
    umbilical: string;
    orb_version_pin?: string;
  }>;
  evidence: CanonicalEvidenceContract;
}

export interface CanonicalOrbContract {
  schema_version: string;
  orb_id: string;
  orb_version?: string;
  ability_name: string;
  purpose: string;
  runtime: {
    language: string;
    form: 'local_process' | 'container' | 'http_service' | 'library' | 'manual_fixture';
    entrypoint: string;
    package?: { name: string; version_spec: string; source: string };
  };
  capabilities: Array<{ name: string; function: string }>;
  demonstration: {
    input_fixture: string;
    expected_outputs: string[];
    observable_events: string[];
  };
  umbilicals: string[];
  evidence: CanonicalEvidenceContract;
}

export interface CanonicalUmbilicalContract {
  schema_version: string;
  umbilical_id: string;
  pod_id: string;
  orb_id: string;
  attachment_point: string;
  runtime: { language: string; form: string };
  invocation: Record<string, unknown>;
  input_contract: Record<string, unknown>;
  output_contract: Record<string, unknown>;
  observation_contract: Record<string, unknown>;
  evidence_contract: Record<string, unknown>;
  working_parameters: {
    status: TrustState;
    outside_parameters_behavior: string;
  };
}

export interface PortalProjectionInput {
  schema_version: string;
  portal_id: string;
  pod_id: string;
  name: string;
  mode: 'local-contract' | 'private' | 'production';
  enabled: boolean;
  scope: string;
  boundary: string;
  evidence: CanonicalEvidenceContract;
}

export interface SafeEvidenceSummary {
  trustState: TrustState;
  observedAt: string;
  sourceLabel: string;
  evidenceRefs: string[];
  hashes: string[];
}

export type ContractAxis = 'valid' | 'provisional' | 'invalid' | 'unknown';
export type AttachmentAxis = 'attached' | 'handshaking' | 'detached' | 'not_applicable' | 'unknown';
export type ActivityAxis = 'idle' | 'observed' | 'queued' | 'running' | 'completed' | 'fell_short' | 'unknown';
export type EvidenceAxis = 'verified' | 'provisional' | 'draft' | 'missing';
export type HealthAxis = 'nominal' | 'degraded' | 'contained' | 'rejected' | 'rolled_back' | 'unknown';

export interface ComponentStatusAxes {
  contract: ContractAxis;
  attachment: AttachmentAxis;
  activity: ActivityAxis;
  evidence: EvidenceAxis;
  health: HealthAxis;
  sourceBoundary: SourceBoundary;
}

export interface CanonicalPodProjection {
  canonical: true;
  schema_version: string;
  pod_id: string;
  peer_id: string;
  displayName: string;
  runtime: { language: string; implementation: string };
  tensors: Record<TensorChannel, {
    name: TensorChannel;
    purpose: string;
    shape: [string, number, number];
    dtype: string;
    append_only: boolean;
  }>;
  orbIds: string[];
  orbAttachments: Array<{
    orb_id: string;
    umbilical_id: string;
    requiredForFullFunction: boolean;
    orb_version_pin?: string;
  }>;
  evidence: SafeEvidenceSummary;
  status: ComponentStatusAxes;
}

export interface CanonicalOrbProjection {
  canonical: true;
  schema_version: string;
  orb_id: string;
  orb_version?: string;
  pod_id: string;
  abilityName: string;
  purpose: string;
  runtime: { language: string; form: CanonicalOrbContract['runtime']['form'] };
  capabilities: Array<{ name: string; function: string }>;
  umbilicalIds: string[];
  evidence: SafeEvidenceSummary;
  status: ComponentStatusAxes;
}

export interface CanonicalUmbilicalProjection {
  canonical: true;
  schema_version: string;
  umbilical_id: string;
  pod_id: string;
  orb_id: string;
  attachmentPoint: string;
  runtime: { language: string; form: string };
  orbVersionPin?: string;
  evidence: SafeEvidenceSummary;
  status: ComponentStatusAxes;
}

export interface TenderProjection {
  canonical: false;
  projectionKind: 'conceptual_tender';
  tender_id: string;
  portal_id: string;
  safeguards: string[];
  evidence: SafeEvidenceSummary;
  status: ComponentStatusAxes;
}

export interface PortalProjection {
  canonical: false;
  projectionKind: 'conceptual_portal';
  schema_version: string;
  portal_id: string;
  pod_id: string;
  name: string;
  mode: PortalProjectionInput['mode'];
  enabled: boolean;
  scope: string;
  boundary: string;
  tender?: TenderProjection;
  evidence: SafeEvidenceSummary;
  status: ComponentStatusAxes;
}

export interface SatelliteProjection {
  canonical: false;
  projectionKind: 'fixture_satellite' | 'conceptual_satellite';
  satellite_id: string;
  parent_orb_id: string;
  pod_id: string;
  name: string;
  capability: string;
  evidence: SafeEvidenceSummary;
  status: ComponentStatusAxes;
}

export interface PodTopologySnapshot {
  schemaVersion: string;
  capturedAt: string;
  sourceBoundary: SourceBoundary;
  pod: CanonicalPodProjection;
  orbs: CanonicalOrbProjection[];
  umbilicals: CanonicalUmbilicalProjection[];
  satellites: SatelliteProjection[];
  portals: PortalProjection[];
}

export interface RouteDescriptor {
  routeId: string;
  orderedRefs: Array<{ kind: ComponentKind; id: string }>;
}

export interface OperationEvent {
  schemaVersion: string;
  eventId: string;
  sequence: number;
  observedAt: string;
  operationId: string;
  podId: string;
  componentRef: { kind: ComponentKind; id: string; parentId?: string };
  phase: 'observed' | 'queued' | 'running' | 'completed' | 'fell_short';
  status: 'nominal' | 'degraded' | 'contained' | 'rejected' | 'rolled_back';
  route: RouteDescriptor;
  routeRefs: string[];
  evidenceRefs: string[];
  redactedSummary?: string;
  messageFlow?: import('./messageFlow.ts').SanitizedMessageFlowProjection;
}
