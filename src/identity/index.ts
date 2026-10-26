export type {
  IdentityCoverageState,
  IdentityDomain,
  ActionClass,
  PromotionReason,
  EvidenceReference,
  IdentityRecord,
  MinimumIdentityKernel,
  PromotedRecord,
  OmissionReference,
  CoverageMeasurement,
  AdaptiveIdentitySurface,
  ReasoningTier,
  TaskRiskClass,
  SubstrateContextEnvelope,
  ShortfallRecord,
  IdentityProjectionContext,
  ActionPermission,
} from './contracts.js';

export {
  IDENTITY_DOMAIN_ACTION_REQUIREMENTS,
  ENVELOPE_PROFILES,
} from './contracts.js';

export { buildMinimumIdentityKernel, kernelFitsEnvelope, serializeKernel, extractKernelRecords } from './kernel.js';
export type { KernelSource } from './kernel.js';

export { rankCandidates, selectPromotedRecords, computeCoverage, determineCoverageState } from './projection.js';

export { projectIdentitySurface, checkActionPermission } from './surface.js';
export type { ProjectionResult } from './surface.js';

export { computeHash } from './hash.js';
