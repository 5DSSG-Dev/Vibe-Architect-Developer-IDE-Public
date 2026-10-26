import type {
  VerificationManifest,
  StageResult,
  IdentitySnapshot,
  GateVerdict,
  ConstructionArtifact,
} from './contracts.js';
import { computeHash } from '../identity/hash.js';

let manifestCounter = 0;

function nextManifestId(): string {
  return `manifest-${Date.now()}-${++manifestCounter}`;
}

export function determineVerdict(stages: StageResult[]): GateVerdict {
  if (stages.length === 0) return 'FAIL';

  const allPassed = stages.every(s => s.passed);
  if (allPassed) return 'PASS';

  const anyPassed = stages.some(s => s.passed);
  if (anyPassed) return 'PARTIAL';

  return 'FAIL';
}

export function buildManifest(
  artifact: ConstructionArtifact,
  stages: StageResult[],
  identitySnapshot: IdentitySnapshot,
): VerificationManifest {
  const verdict = determineVerdict(stages);
  const totalDurationMs = stages.reduce((sum, s) => sum + s.durationMs, 0);

  const manifestData = {
    constructionId: artifact.constructionId,
    artifactId: artifact.artifactId,
    stages: stages.map(s => ({ stage: s.stage, passed: s.passed })),
    verdict,
  };
  const hash = computeHash(JSON.stringify(manifestData));

  return {
    manifestId: nextManifestId(),
    constructionId: artifact.constructionId,
    artifactId: artifact.artifactId,
    timestamp: new Date().toISOString(),
    stages,
    verdict,
    hash,
    identitySnapshot,
    totalDurationMs,
    fileCount: artifact.files.length,
  };
}
