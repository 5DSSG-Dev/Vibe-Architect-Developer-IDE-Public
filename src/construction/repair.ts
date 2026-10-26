import type {
  RepairDelta,
  RepairInstruction,
  RepairComplexity,
  StageResult,
  VerificationManifest,
  ConstructionArtifact,
  VerificationStage,
} from './contracts.js';
import { computeHash } from '../identity/hash.js';

let deltaCounter = 0;

function nextDeltaId(): string {
  return `delta-${Date.now()}-${++deltaCounter}`;
}

function estimateComplexity(failedStages: StageResult[]): RepairComplexity {
  if (failedStages.some(s => s.stage === 'identity_gate')) return 'significant';
  if (failedStages.length >= 3) return 'significant';
  if (failedStages.length >= 2) return 'moderate';
  return 'trivial';
}

function buildRepairInstruction(stage: StageResult, artifact: ConstructionArtifact): RepairInstruction {
  const targetFiles = artifact.files.map(f => f.path);

  switch (stage.stage) {
    case 'identity_gate':
      return {
        stage: 'identity_gate',
        description: 'Identity surface does not permit consequential mutation',
        targetFiles: [],
        suggestedAction: 'Provide identity records covering required domains before attempting construction',
      };
    case 'typecheck':
      return {
        stage: 'typecheck',
        description: stage.failureDetail ?? 'TypeScript compilation errors',
        targetFiles,
        suggestedAction: 'Fix type errors reported by tsc --noEmit',
      };
    case 'test':
      return {
        stage: 'test',
        description: stage.failureDetail ?? 'Test failures',
        targetFiles,
        suggestedAction: 'Fix failing tests or update test expectations',
      };
    case 'contract_conformance':
      return {
        stage: 'contract_conformance',
        description: stage.failureDetail ?? 'Contract conformance issues',
        targetFiles,
        suggestedAction: 'Ensure artifact has declared intent, non-empty files, and valid content hashes',
      };
    case 'boundary_check':
      return {
        stage: 'boundary_check',
        description: stage.failureDetail ?? 'Boundary violations',
        targetFiles: artifact.files.map(f => f.path),
        suggestedAction: 'Restrict file changes to allowed path boundaries',
      };
    case 'evidence_validation':
      return {
        stage: 'evidence_validation',
        description: stage.failureDetail ?? 'Evidence validation failures',
        targetFiles: [],
        suggestedAction: 'Provide valid evidence references with sourceId and hash for all construction artifacts',
      };
  }
}

export function buildRepairDelta(
  manifest: VerificationManifest,
  artifact: ConstructionArtifact,
): RepairDelta | null {
  const failedStages = manifest.stages.filter(s => !s.passed);
  if (failedStages.length === 0) return null;

  const repairs = failedStages.map(s => buildRepairInstruction(s, artifact));
  const failedStageNames: VerificationStage[] = failedStages.map(s => s.stage);
  const complexity = estimateComplexity(failedStages);

  const deltaData = {
    constructionId: manifest.constructionId,
    manifestRef: manifest.manifestId,
    failedStages: failedStageNames,
    repairs,
  };
  const hash = computeHash(JSON.stringify(deltaData));

  return {
    deltaId: nextDeltaId(),
    constructionId: manifest.constructionId,
    manifestRef: manifest.manifestId,
    timestamp: new Date().toISOString(),
    failedStages: failedStageNames,
    repairs,
    estimatedComplexity: complexity,
    hash,
  };
}
