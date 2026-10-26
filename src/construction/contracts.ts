import type { ActionPermission, EvidenceReference, IdentityCoverageState } from '../identity/contracts.js';

export type VerificationStage =
  | 'identity_gate'
  | 'typecheck'
  | 'test'
  | 'contract_conformance'
  | 'boundary_check'
  | 'evidence_validation';

export type ConstructionPhase =
  | 'intent'
  | 'spec'
  | 'scaffold'
  | 'implement'
  | 'test'
  | 'validate'
  | 'register';

export type GateVerdict = 'PASS' | 'FAIL' | 'PARTIAL';

export type RepairComplexity = 'trivial' | 'moderate' | 'significant';

export interface FileChange {
  path: string;
  changeType: 'add' | 'modify' | 'delete';
  contentHash: string;
}

export interface ConstructionArtifact {
  artifactId: string;
  constructionId: string;
  intent: string;
  phase: ConstructionPhase;
  files: FileChange[];
  evidenceRefs: EvidenceReference[];
  metadata: Record<string, unknown>;
}

export interface StageResult {
  stage: VerificationStage;
  passed: boolean;
  evidence: string[];
  durationMs: number;
  failureDetail: string | null;
}

export interface IdentitySnapshot {
  coverageState: IdentityCoverageState;
  permission: ActionPermission;
  surfaceHash: string | null;
}

export interface VerificationManifest {
  manifestId: string;
  constructionId: string;
  artifactId: string;
  timestamp: string;
  stages: StageResult[];
  verdict: GateVerdict;
  hash: string;
  identitySnapshot: IdentitySnapshot;
  totalDurationMs: number;
  fileCount: number;
}

export interface RepairInstruction {
  stage: VerificationStage;
  description: string;
  targetFiles: string[];
  suggestedAction: string;
}

export interface RepairDelta {
  deltaId: string;
  constructionId: string;
  manifestRef: string;
  timestamp: string;
  failedStages: VerificationStage[];
  repairs: RepairInstruction[];
  estimatedComplexity: RepairComplexity;
  hash: string;
}

export interface StageChecker {
  stage: VerificationStage;
  check(artifact: ConstructionArtifact): StageResult;
}

export interface GateDecision {
  constructionId: string;
  permitted: boolean;
  manifest: VerificationManifest;
  repairDelta: RepairDelta | null;
}

export const VERIFICATION_STAGE_ORDER: VerificationStage[] = [
  'identity_gate',
  'typecheck',
  'test',
  'contract_conformance',
  'boundary_check',
  'evidence_validation',
];

export const CONSTRUCTION_PHASE_ORDER: ConstructionPhase[] = [
  'intent',
  'spec',
  'scaffold',
  'implement',
  'test',
  'validate',
  'register',
];
