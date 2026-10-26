import type {
  ConstructionArtifact,
  StageChecker,
  GateDecision,
  IdentitySnapshot,
} from './contracts.js';
import type { AdaptiveIdentitySurface } from '../identity/contracts.js';
import { checkActionPermission } from '../identity/surface.js';
import { buildManifest } from './manifest.js';
import { buildRepairDelta } from './repair.js';

function snapshotIdentity(surface: AdaptiveIdentitySurface | null): IdentitySnapshot {
  const permission = checkActionPermission(surface, 'consequential_mutation');
  return {
    coverageState: surface?.coverageState ?? 'IDENTITY_UNAVAILABLE',
    permission,
    surfaceHash: surface?.kernel.hash ?? null,
  };
}

export function evaluateConstructionGate(
  artifact: ConstructionArtifact,
  surface: AdaptiveIdentitySurface | null,
  checkers: StageChecker[],
): GateDecision {
  const identitySnapshot = snapshotIdentity(surface);
  const stageResults = checkers.map(checker => checker.check(artifact));
  const manifest = buildManifest(artifact, stageResults, identitySnapshot);
  const repairDelta = buildRepairDelta(manifest, artifact);

  return {
    constructionId: artifact.constructionId,
    permitted: manifest.verdict === 'PASS',
    manifest,
    repairDelta,
  };
}
