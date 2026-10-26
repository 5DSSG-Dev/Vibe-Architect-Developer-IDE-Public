import type { ConstructionArtifact, StageChecker, StageResult } from './contracts.js';
import type { AdaptiveIdentitySurface } from '../identity/contracts.js';
import { checkActionPermission } from '../identity/surface.js';
import { computeHash } from '../identity/hash.js';

function makeResult(
  stage: StageResult['stage'],
  passed: boolean,
  evidence: string[],
  startTime: number,
  failureDetail: string | null = null,
): StageResult {
  return { stage, passed, evidence, durationMs: Date.now() - startTime, failureDetail };
}

export function createIdentityGateChecker(surface: AdaptiveIdentitySurface | null): StageChecker {
  return {
    stage: 'identity_gate',
    check(_artifact: ConstructionArtifact): StageResult {
      const start = Date.now();
      const permission = checkActionPermission(surface, 'consequential_mutation');

      if (permission.permitted) {
        return makeResult('identity_gate', true, [
          `Action permitted at ${surface!.coverageState}`,
          `Satisfied domains: ${permission.satisfiedDomains.join(', ')}`,
        ], start);
      }

      return makeResult('identity_gate', false, [
        `Permission denied: ${permission.reason}`,
        `Missing domains: ${permission.missingDomains.join(', ')}`,
      ], start, permission.reason);
    },
  };
}

export function createTypecheckChecker(typecheckPassed: boolean, diagnostics: string[] = []): StageChecker {
  return {
    stage: 'typecheck',
    check(_artifact: ConstructionArtifact): StageResult {
      const start = Date.now();
      if (typecheckPassed) {
        return makeResult('typecheck', true, ['tsc --noEmit: 0 errors'], start);
      }
      return makeResult('typecheck', false, diagnostics, start,
        `TypeScript compilation failed with ${diagnostics.length} diagnostic(s)`);
    },
  };
}

export function createTestChecker(testsPassed: boolean, testResults: string[] = []): StageChecker {
  return {
    stage: 'test',
    check(_artifact: ConstructionArtifact): StageResult {
      const start = Date.now();
      if (testsPassed) {
        return makeResult('test', true, testResults.length > 0 ? testResults : ['All tests passed'], start);
      }
      return makeResult('test', false, testResults, start,
        `Test suite failed: ${testResults.filter(r => r.includes('FAIL')).length} failure(s)`);
    },
  };
}

export function createContractConformanceChecker(): StageChecker {
  return {
    stage: 'contract_conformance',
    check(artifact: ConstructionArtifact): StageResult {
      const start = Date.now();
      const issues: string[] = [];

      if (!artifact.intent || artifact.intent.trim().length === 0) {
        issues.push('Construction artifact has no declared intent');
      }

      if (artifact.files.length === 0) {
        issues.push('Construction artifact contains no file changes');
      }

      for (const file of artifact.files) {
        if (!file.path || file.path.trim().length === 0) {
          issues.push('File change has empty path');
        }
        if (!file.contentHash || file.contentHash.length === 0) {
          issues.push(`File ${file.path} has no content hash`);
        }
      }

      if (issues.length === 0) {
        return makeResult('contract_conformance', true, [
          `${artifact.files.length} file(s) conform to construction contract`,
          `Intent declared: ${artifact.intent.substring(0, 80)}`,
        ], start);
      }

      return makeResult('contract_conformance', false, issues, start,
        `${issues.length} contract conformance issue(s)`);
    },
  };
}

export function createBoundaryChecker(allowedPaths: string[] = []): StageChecker {
  return {
    stage: 'boundary_check',
    check(artifact: ConstructionArtifact): StageResult {
      const start = Date.now();

      if (allowedPaths.length === 0) {
        return makeResult('boundary_check', true, [
          'No path boundaries configured — all paths permitted',
        ], start);
      }

      const violations: string[] = [];
      for (const file of artifact.files) {
        const withinBoundary = allowedPaths.some(allowed => file.path.startsWith(allowed));
        if (!withinBoundary) {
          violations.push(`${file.path} is outside allowed boundaries: ${allowedPaths.join(', ')}`);
        }
      }

      if (violations.length === 0) {
        return makeResult('boundary_check', true, [
          `All ${artifact.files.length} file(s) within allowed boundaries`,
        ], start);
      }

      return makeResult('boundary_check', false, violations, start,
        `${violations.length} boundary violation(s)`);
    },
  };
}

export function createEvidenceValidationChecker(): StageChecker {
  return {
    stage: 'evidence_validation',
    check(artifact: ConstructionArtifact): StageResult {
      const start = Date.now();

      if (artifact.evidenceRefs.length === 0) {
        return makeResult('evidence_validation', false,
          ['No evidence references provided for construction artifact'],
          start, 'Construction artifact lacks evidence references');
      }

      const issues: string[] = [];
      for (const ref of artifact.evidenceRefs) {
        if (!ref.sourceId || ref.sourceId.length === 0) {
          issues.push('Evidence reference has empty sourceId');
        }
        if (!ref.hash || ref.hash.length === 0) {
          issues.push(`Evidence ref ${ref.sourceId} has no hash`);
        }
      }

      if (issues.length === 0) {
        return makeResult('evidence_validation', true, [
          `${artifact.evidenceRefs.length} evidence reference(s) validated`,
        ], start);
      }

      return makeResult('evidence_validation', false, issues, start,
        `${issues.length} evidence validation issue(s)`);
    },
  };
}
