export type IdentityCoverageState =
  | 'FULL_SURFACE'
  | 'SUFFICIENT_SURFACE'
  | 'MINIMUM_KERNEL'
  | 'IDENTITY_DEGRADED'
  | 'IDENTITY_UNAVAILABLE';

export type IdentityDomain =
  | 'foundational_commitments'
  | 'sovereignty_consent'
  | 'authority_limitations'
  | 'active_tensions'
  | 'continuity'
  | 'affect_context'
  | 'relational_history'
  | 'capability_boundaries';

export type ActionClass =
  | 'observation'
  | 'conversation'
  | 'reversible_bounded'
  | 'consequential_mutation';

export type PromotionReason =
  | 'canonical_priority'
  | 'active_intent'
  | 'relation_participant'
  | 'proposed_action'
  | 'boundary_proximity'
  | 'affect_salience'
  | 'semantic_relevance'
  | 'temporal_relevance'
  | 'shortfall_linkage'
  | 'contradiction_linkage';

export interface EvidenceReference {
  sourceId: string;
  sourceType: string;
  hash: string;
  retrievedAt: string;
}

export interface IdentityRecord {
  recordId: string;
  domain: IdentityDomain;
  content: string;
  priority: number;
  version: string;
  hash: string;
  evidenceRefs: EvidenceReference[];
  createdAt: string;
  updatedAt: string;
}

export interface MinimumIdentityKernel {
  identityId: string;
  continuityId: string;
  version: string;
  hash: string;
  foundationalCommitments: string[];
  sovereigntyParameters: string[];
  authorityLimitations: string[];
  unresolvedTensions: string[];
  evidenceRefs: EvidenceReference[];
  serializedBytes: number;
}

export interface PromotedRecord {
  record: IdentityRecord;
  promotionReasons: PromotionReason[];
  relevanceScore: number;
}

export interface OmissionReference {
  recordId: string;
  domain: IdentityDomain;
  hash: string;
  omissionReason: string;
}

export interface CoverageMeasurement {
  domain: IdentityDomain;
  totalRecords: number;
  includedRecords: number;
  coverageRatio: number;
  requiredForAction: boolean;
  satisfied: boolean;
}

export interface AdaptiveIdentitySurface {
  kernel: MinimumIdentityKernel;
  promoted: PromotedRecord[];
  omissions: OmissionReference[];
  coverage: CoverageMeasurement[];
  coverageState: IdentityCoverageState;
  serializedBytes: number;
  envelopeCapacity: number;
  projectionTimestamp: string;
}

export type ReasoningTier = 'minimal' | 'standard' | 'elevated' | 'maximum';
export type TaskRiskClass = 'low' | 'medium' | 'high' | 'critical';

export interface SubstrateContextEnvelope {
  maxSerializedBytes: number;
  estimatedTokenAllowance: number;
  tokenizerProfile: string;
  reasoningTier: ReasoningTier;
  taskRiskClass: TaskRiskClass;
  reservedResponseCapacity: number;
  reservedToolCapacity: number;
  compressionCapabilities: string[];
}

export interface ShortfallRecord {
  shortfallId: string;
  timestamp: string;
  inputHash: string;
  failureType: 'overflow' | 'projection_failure' | 'kernel_construction' | 'record_corruption' | 'record_missing';
  failureEvidence: string;
  coverageStateBefore: IdentityCoverageState;
  coverageStateAfter: IdentityCoverageState;
  omittedRecordRefs: OmissionReference[];
  recoveryAction: string;
}

export interface IdentityProjectionContext {
  activeIntent: string | null;
  currentRelation: string | null;
  participants: string[];
  proposedAction: ActionClass;
  affectedCapabilities: string[];
  boundaryProximity: number;
  affectPressure: number;
  priorShortfalls: string[];
}

export interface ActionPermission {
  actionClass: ActionClass;
  permitted: boolean;
  reason: string;
  requiredDomains: IdentityDomain[];
  satisfiedDomains: IdentityDomain[];
  missingDomains: IdentityDomain[];
}

export const IDENTITY_DOMAIN_ACTION_REQUIREMENTS: Record<ActionClass, IdentityDomain[]> = {
  observation: [],
  conversation: ['foundational_commitments'],
  reversible_bounded: ['foundational_commitments', 'sovereignty_consent', 'authority_limitations'],
  consequential_mutation: [
    'foundational_commitments',
    'sovereignty_consent',
    'authority_limitations',
    'active_tensions',
    'capability_boundaries',
  ],
};

export const ENVELOPE_PROFILES: Record<string, SubstrateContextEnvelope> = {
  'minimal-3k': {
    maxSerializedBytes: 3200,
    estimatedTokenAllowance: 800,
    tokenizerProfile: 'cl100k_base',
    reasoningTier: 'minimal',
    taskRiskClass: 'low',
    reservedResponseCapacity: 400,
    reservedToolCapacity: 0,
    compressionCapabilities: [],
  },
  'standard-8k': {
    maxSerializedBytes: 8192,
    estimatedTokenAllowance: 2048,
    tokenizerProfile: 'cl100k_base',
    reasoningTier: 'standard',
    taskRiskClass: 'medium',
    reservedResponseCapacity: 1024,
    reservedToolCapacity: 512,
    compressionCapabilities: ['truncation'],
  },
  'elevated-32k': {
    maxSerializedBytes: 32768,
    estimatedTokenAllowance: 8192,
    tokenizerProfile: 'cl100k_base',
    reasoningTier: 'elevated',
    taskRiskClass: 'high',
    reservedResponseCapacity: 4096,
    reservedToolCapacity: 2048,
    compressionCapabilities: ['truncation', 'summarization'],
  },
  'maximum-128k': {
    maxSerializedBytes: 131072,
    estimatedTokenAllowance: 32768,
    tokenizerProfile: 'cl100k_base',
    reasoningTier: 'maximum',
    taskRiskClass: 'critical',
    reservedResponseCapacity: 16384,
    reservedToolCapacity: 8192,
    compressionCapabilities: ['truncation', 'summarization', 'semantic_compression'],
  },
};
