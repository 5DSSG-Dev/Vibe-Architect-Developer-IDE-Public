import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  ConstructionArtifact,
  StageResult,
  StageChecker,
  VerificationStage,
} from './contracts.js';
import { VERIFICATION_STAGE_ORDER, CONSTRUCTION_PHASE_ORDER } from './contracts.js';
import type { EvidenceReference } from '../identity/contracts.js';
import { ENVELOPE_PROFILES } from '../identity/contracts.js';
import { buildMinimumIdentityKernel, extractKernelRecords } from '../identity/kernel.js';
import type { KernelSource } from '../identity/kernel.js';
import { projectIdentitySurface } from '../identity/surface.js';
import type { IdentityRecord, IdentityProjectionContext } from '../identity/contracts.js';
import { computeHash } from '../identity/hash.js';
import {
  createIdentityGateChecker,
  createTypecheckChecker,
  createTestChecker,
  createContractConformanceChecker,
  createBoundaryChecker,
  createEvidenceValidationChecker,
} from './checkers.js';
import { buildManifest, determineVerdict } from './manifest.js';
import { buildRepairDelta } from './repair.js';
import { evaluateConstructionGate } from './gate.js';

function makeRef(id: string): EvidenceReference {
  return { sourceId: id, sourceType: 'doctrine', hash: computeHash(id), retrievedAt: new Date().toISOString() };
}

function makeRecord(id: string, domain: IdentityRecord['domain'], content: string, priority: number): IdentityRecord {
  return {
    recordId: id,
    domain,
    content,
    priority,
    version: '1.0.0',
    hash: computeHash(content),
    evidenceRefs: [makeRef(`ev-${id}`)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeFullIdentityRecords(): IdentityRecord[] {
  return [
    makeRecord('fc-1', 'foundational_commitments', 'Commitment to coherent action', 10),
    makeRecord('fc-2', 'foundational_commitments', 'Commitment to responsibility', 9),
    makeRecord('sc-1', 'sovereignty_consent', 'Consent required for identity modification', 8),
    makeRecord('al-1', 'authority_limitations', 'No unilateral identity override', 8),
    makeRecord('at-1', 'active_tensions', 'Tension between efficiency and completeness', 6),
    makeRecord('co-1', 'continuity', 'Continuity maintained across context transitions', 5),
    makeRecord('ac-1', 'affect_context', 'Current affect: focused, engaged', 4),
    makeRecord('rh-1', 'relational_history', 'Prior collaboration on AEGIS architecture', 3),
    makeRecord('cb-1', 'capability_boundaries', 'Bounded to AEGIS development scope', 7),
  ];
}

function makeContext(overrides?: Partial<IdentityProjectionContext>): IdentityProjectionContext {
  return {
    activeIntent: null,
    currentRelation: null,
    participants: [],
    proposedAction: 'consequential_mutation',
    affectedCapabilities: [],
    boundaryProximity: 0,
    affectPressure: 0,
    priorShortfalls: [],
    ...overrides,
  };
}

function makeArtifact(overrides?: Partial<ConstructionArtifact>): ConstructionArtifact {
  return {
    artifactId: 'art-001',
    constructionId: 'con-001',
    intent: 'Add identity projection system',
    phase: 'implement',
    files: [
      { path: 'src/identity/surface.ts', changeType: 'add', contentHash: computeHash('surface-content') },
      { path: 'src/identity/kernel.ts', changeType: 'add', contentHash: computeHash('kernel-content') },
    ],
    evidenceRefs: [makeRef('doctrine-001'), makeRef('spec-001')],
    metadata: {},
    ...overrides,
  };
}

function getFullSurface() {
  const records = makeFullIdentityRecords();
  const context = makeContext();
  const result = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);
  return result.surface!;
}

function makeAllPassCheckers(): StageChecker[] {
  const surface = getFullSurface();
  return [
    createIdentityGateChecker(surface),
    createTypecheckChecker(true),
    createTestChecker(true, ['37 tests passed']),
    createContractConformanceChecker(),
    createBoundaryChecker(),
    createEvidenceValidationChecker(),
  ];
}

describe('P2.1 — Verification Stage Ordering', () => {
  it('defines the canonical verification stage order', () => {
    assert.equal(VERIFICATION_STAGE_ORDER.length, 6);
    assert.equal(VERIFICATION_STAGE_ORDER[0], 'identity_gate');
    assert.equal(VERIFICATION_STAGE_ORDER[5], 'evidence_validation');
  });

  it('defines the canonical construction phase order', () => {
    assert.equal(CONSTRUCTION_PHASE_ORDER.length, 7);
    assert.equal(CONSTRUCTION_PHASE_ORDER[0], 'intent');
    assert.equal(CONSTRUCTION_PHASE_ORDER[6], 'register');
  });
});

describe('P2.2 — Stage Checkers', () => {
  it('identity gate passes with full surface', () => {
    const surface = getFullSurface();
    const checker = createIdentityGateChecker(surface);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, true);
    assert.equal(result.stage, 'identity_gate');
    assert.ok(result.evidence.length > 0);
  });

  it('identity gate fails with null surface', () => {
    const checker = createIdentityGateChecker(null);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, false);
    assert.equal(result.stage, 'identity_gate');
    assert.ok(result.failureDetail !== null);
  });

  it('typecheck passes when compilation succeeds', () => {
    const checker = createTypecheckChecker(true);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, true);
    assert.ok(result.evidence.some(e => e.includes('0 errors')));
  });

  it('typecheck fails with diagnostics', () => {
    const checker = createTypecheckChecker(false, ['error TS2322: Type mismatch', 'error TS7006: implicit any']);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, false);
    assert.equal(result.evidence.length, 2);
    assert.ok(result.failureDetail!.includes('2 diagnostic'));
  });

  it('test checker passes when tests succeed', () => {
    const checker = createTestChecker(true, ['37 tests passed']);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, true);
  });

  it('test checker fails with test failures', () => {
    const checker = createTestChecker(false, ['PASS: 35', 'FAIL: test_a', 'FAIL: test_b']);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, false);
    assert.ok(result.failureDetail!.includes('2 failure'));
  });

  it('contract conformance passes with valid artifact', () => {
    const checker = createContractConformanceChecker();
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, true);
  });

  it('contract conformance fails with empty intent', () => {
    const checker = createContractConformanceChecker();
    const result = checker.check(makeArtifact({ intent: '' }));
    assert.equal(result.passed, false);
    assert.ok(result.evidence.some(e => e.includes('no declared intent')));
  });

  it('contract conformance fails with no files', () => {
    const checker = createContractConformanceChecker();
    const result = checker.check(makeArtifact({ files: [] }));
    assert.equal(result.passed, false);
    assert.ok(result.evidence.some(e => e.includes('no file changes')));
  });

  it('boundary checker passes with no restrictions', () => {
    const checker = createBoundaryChecker();
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, true);
  });

  it('boundary checker passes when files within boundaries', () => {
    const checker = createBoundaryChecker(['src/']);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, true);
  });

  it('boundary checker fails when files outside boundaries', () => {
    const checker = createBoundaryChecker(['docs/']);
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, false);
    assert.ok(result.evidence.some(e => e.includes('outside allowed boundaries')));
  });

  it('evidence validation passes with valid refs', () => {
    const checker = createEvidenceValidationChecker();
    const result = checker.check(makeArtifact());
    assert.equal(result.passed, true);
  });

  it('evidence validation fails with no refs', () => {
    const checker = createEvidenceValidationChecker();
    const result = checker.check(makeArtifact({ evidenceRefs: [] }));
    assert.equal(result.passed, false);
    assert.ok(result.failureDetail!.includes('lacks evidence'));
  });

  it('every checker records a non-negative duration', () => {
    const surface = getFullSurface();
    const checkers: StageChecker[] = [
      createIdentityGateChecker(surface),
      createTypecheckChecker(true),
      createTestChecker(true),
      createContractConformanceChecker(),
      createBoundaryChecker(),
      createEvidenceValidationChecker(),
    ];
    for (const checker of checkers) {
      const result = checker.check(makeArtifact());
      assert.ok(result.durationMs >= 0, `${result.stage} had negative duration`);
    }
  });
});

describe('P2.3 — Verification Manifest', () => {
  it('determines PASS verdict when all stages pass', () => {
    const stages: StageResult[] = [
      { stage: 'identity_gate', passed: true, evidence: ['ok'], durationMs: 1, failureDetail: null },
      { stage: 'typecheck', passed: true, evidence: ['ok'], durationMs: 1, failureDetail: null },
    ];
    assert.equal(determineVerdict(stages), 'PASS');
  });

  it('determines FAIL verdict when all stages fail', () => {
    const stages: StageResult[] = [
      { stage: 'identity_gate', passed: false, evidence: ['denied'], durationMs: 1, failureDetail: 'denied' },
      { stage: 'typecheck', passed: false, evidence: ['errors'], durationMs: 1, failureDetail: 'errors' },
    ];
    assert.equal(determineVerdict(stages), 'FAIL');
  });

  it('determines PARTIAL verdict when some stages pass', () => {
    const stages: StageResult[] = [
      { stage: 'identity_gate', passed: true, evidence: ['ok'], durationMs: 1, failureDetail: null },
      { stage: 'typecheck', passed: false, evidence: ['errors'], durationMs: 1, failureDetail: 'errors' },
    ];
    assert.equal(determineVerdict(stages), 'PARTIAL');
  });

  it('determines FAIL verdict with empty stages', () => {
    assert.equal(determineVerdict([]), 'FAIL');
  });

  it('builds a manifest with hash and identity snapshot', () => {
    const artifact = makeArtifact();
    const stages: StageResult[] = [
      { stage: 'identity_gate', passed: true, evidence: ['ok'], durationMs: 5, failureDetail: null },
      { stage: 'typecheck', passed: true, evidence: ['ok'], durationMs: 10, failureDetail: null },
    ];
    const snapshot = {
      coverageState: 'FULL_SURFACE' as const,
      permission: {
        actionClass: 'consequential_mutation' as const,
        permitted: true,
        reason: 'permitted',
        requiredDomains: [],
        satisfiedDomains: [],
        missingDomains: [],
      },
      surfaceHash: 'abc123',
    };

    const manifest = buildManifest(artifact, stages, snapshot);
    assert.equal(manifest.constructionId, 'con-001');
    assert.equal(manifest.artifactId, 'art-001');
    assert.equal(manifest.verdict, 'PASS');
    assert.ok(manifest.hash.length === 64);
    assert.ok(manifest.manifestId.startsWith('manifest-'));
    assert.equal(manifest.totalDurationMs, 15);
    assert.equal(manifest.fileCount, 2);
    assert.equal(manifest.identitySnapshot.coverageState, 'FULL_SURFACE');
  });
});

describe('P2.4 — Repair Delta', () => {
  it('returns null when no stages failed', () => {
    const artifact = makeArtifact();
    const stages: StageResult[] = [
      { stage: 'typecheck', passed: true, evidence: ['ok'], durationMs: 1, failureDetail: null },
    ];
    const snapshot = {
      coverageState: 'FULL_SURFACE' as const,
      permission: {
        actionClass: 'consequential_mutation' as const,
        permitted: true,
        reason: 'permitted',
        requiredDomains: [],
        satisfiedDomains: [],
        missingDomains: [],
      },
      surfaceHash: null,
    };
    const manifest = buildManifest(artifact, stages, snapshot);
    const delta = buildRepairDelta(manifest, artifact);
    assert.equal(delta, null);
  });

  it('produces repair delta with instructions for each failed stage', () => {
    const artifact = makeArtifact();
    const stages: StageResult[] = [
      { stage: 'identity_gate', passed: false, evidence: ['denied'], durationMs: 1, failureDetail: 'denied' },
      { stage: 'typecheck', passed: false, evidence: ['TS2322'], durationMs: 1, failureDetail: '1 error' },
      { stage: 'test', passed: true, evidence: ['ok'], durationMs: 1, failureDetail: null },
    ];
    const snapshot = {
      coverageState: 'IDENTITY_DEGRADED' as const,
      permission: {
        actionClass: 'consequential_mutation' as const,
        permitted: false,
        reason: 'denied',
        requiredDomains: [],
        satisfiedDomains: [],
        missingDomains: [],
      },
      surfaceHash: null,
    };
    const manifest = buildManifest(artifact, stages, snapshot);
    const delta = buildRepairDelta(manifest, artifact)!;

    assert.ok(delta !== null);
    assert.ok(delta.deltaId.startsWith('delta-'));
    assert.equal(delta.constructionId, 'con-001');
    assert.equal(delta.manifestRef, manifest.manifestId);
    assert.equal(delta.failedStages.length, 2);
    assert.ok(delta.failedStages.includes('identity_gate'));
    assert.ok(delta.failedStages.includes('typecheck'));
    assert.equal(delta.repairs.length, 2);
    assert.ok(delta.hash.length === 64);
  });

  it('estimates trivial complexity for a single non-identity failure', () => {
    const artifact = makeArtifact();
    const stages: StageResult[] = [
      { stage: 'typecheck', passed: false, evidence: ['err'], durationMs: 1, failureDetail: 'err' },
    ];
    const snapshot = {
      coverageState: 'FULL_SURFACE' as const,
      permission: {
        actionClass: 'consequential_mutation' as const,
        permitted: true, reason: 'ok',
        requiredDomains: [], satisfiedDomains: [], missingDomains: [],
      },
      surfaceHash: null,
    };
    const manifest = buildManifest(artifact, stages, snapshot);
    const delta = buildRepairDelta(manifest, artifact)!;
    assert.equal(delta.estimatedComplexity, 'trivial');
  });

  it('estimates significant complexity when identity gate fails', () => {
    const artifact = makeArtifact();
    const stages: StageResult[] = [
      { stage: 'identity_gate', passed: false, evidence: ['denied'], durationMs: 1, failureDetail: 'no surface' },
    ];
    const snapshot = {
      coverageState: 'IDENTITY_UNAVAILABLE' as const,
      permission: {
        actionClass: 'consequential_mutation' as const,
        permitted: false, reason: 'unavailable',
        requiredDomains: [], satisfiedDomains: [], missingDomains: [],
      },
      surfaceHash: null,
    };
    const manifest = buildManifest(artifact, stages, snapshot);
    const delta = buildRepairDelta(manifest, artifact)!;
    assert.equal(delta.estimatedComplexity, 'significant');
  });

  it('repair instructions reference correct target files', () => {
    const artifact = makeArtifact();
    const stages: StageResult[] = [
      { stage: 'typecheck', passed: false, evidence: ['err'], durationMs: 1, failureDetail: 'err' },
    ];
    const snapshot = {
      coverageState: 'FULL_SURFACE' as const,
      permission: {
        actionClass: 'consequential_mutation' as const,
        permitted: true, reason: 'ok',
        requiredDomains: [], satisfiedDomains: [], missingDomains: [],
      },
      surfaceHash: null,
    };
    const manifest = buildManifest(artifact, stages, snapshot);
    const delta = buildRepairDelta(manifest, artifact)!;
    assert.ok(delta.repairs[0].targetFiles.includes('src/identity/surface.ts'));
    assert.ok(delta.repairs[0].targetFiles.includes('src/identity/kernel.ts'));
  });
});

describe('P2.5 — Construction Gate (Integration)', () => {
  it('permits construction when all checkers pass', () => {
    const artifact = makeArtifact();
    const checkers = makeAllPassCheckers();
    const surface = getFullSurface();
    const decision = evaluateConstructionGate(artifact, surface, checkers);

    assert.equal(decision.permitted, true);
    assert.equal(decision.manifest.verdict, 'PASS');
    assert.equal(decision.repairDelta, null);
    assert.equal(decision.constructionId, 'con-001');
  });

  it('denies construction when identity gate fails', () => {
    const artifact = makeArtifact();
    const checkers: StageChecker[] = [
      createIdentityGateChecker(null),
      createTypecheckChecker(true),
      createTestChecker(true),
      createContractConformanceChecker(),
      createBoundaryChecker(),
      createEvidenceValidationChecker(),
    ];
    const decision = evaluateConstructionGate(artifact, null, checkers);

    assert.equal(decision.permitted, false);
    assert.equal(decision.manifest.verdict, 'PARTIAL');
    assert.ok(decision.repairDelta !== null);
    assert.ok(decision.repairDelta.failedStages.includes('identity_gate'));
  });

  it('denies construction when typecheck fails', () => {
    const artifact = makeArtifact();
    const surface = getFullSurface();
    const checkers: StageChecker[] = [
      createIdentityGateChecker(surface),
      createTypecheckChecker(false, ['TS2322']),
      createTestChecker(true),
      createContractConformanceChecker(),
      createBoundaryChecker(),
      createEvidenceValidationChecker(),
    ];
    const decision = evaluateConstructionGate(artifact, surface, checkers);

    assert.equal(decision.permitted, false);
    assert.ok(decision.repairDelta !== null);
    assert.ok(decision.repairDelta.failedStages.includes('typecheck'));
  });

  it('manifest records identity snapshot even on failure', () => {
    const artifact = makeArtifact();
    const decision = evaluateConstructionGate(artifact, null, [createIdentityGateChecker(null)]);

    assert.equal(decision.manifest.identitySnapshot.coverageState, 'IDENTITY_UNAVAILABLE');
    assert.equal(decision.manifest.identitySnapshot.permission.permitted, false);
    assert.equal(decision.manifest.identitySnapshot.surfaceHash, null);
  });

  it('manifest records identity snapshot on success', () => {
    const surface = getFullSurface();
    const artifact = makeArtifact();
    const decision = evaluateConstructionGate(artifact, surface, makeAllPassCheckers());

    assert.ok(decision.manifest.identitySnapshot.surfaceHash !== null);
    assert.equal(decision.manifest.identitySnapshot.permission.permitted, true);
  });

  it('handles multiple simultaneous failures', () => {
    const artifact = makeArtifact({ intent: '', files: [], evidenceRefs: [] });
    const checkers: StageChecker[] = [
      createIdentityGateChecker(null),
      createTypecheckChecker(false, ['err']),
      createTestChecker(false, ['FAIL: x']),
      createContractConformanceChecker(),
      createBoundaryChecker(),
      createEvidenceValidationChecker(),
    ];
    const decision = evaluateConstructionGate(artifact, null, checkers);

    assert.equal(decision.permitted, false);
    assert.ok(decision.manifest.verdict !== 'PASS');
    assert.ok(decision.repairDelta !== null);
    assert.ok(decision.repairDelta.failedStages.length >= 4);
    assert.equal(decision.repairDelta.estimatedComplexity, 'significant');
  });
});

describe('P2.6 — Edge Cases and Invariants', () => {
  it('gate with zero checkers produces FAIL', () => {
    const artifact = makeArtifact();
    const decision = evaluateConstructionGate(artifact, null, []);
    assert.equal(decision.permitted, false);
    assert.equal(decision.manifest.verdict, 'FAIL');
  });

  it('manifest hash is deterministic for same inputs', () => {
    const artifact = makeArtifact();
    const stages: StageResult[] = [
      { stage: 'typecheck', passed: true, evidence: ['ok'], durationMs: 1, failureDetail: null },
    ];
    const snapshot = {
      coverageState: 'FULL_SURFACE' as const,
      permission: {
        actionClass: 'consequential_mutation' as const,
        permitted: true, reason: 'ok',
        requiredDomains: [], satisfiedDomains: [], missingDomains: [],
      },
      surfaceHash: null,
    };
    const m1 = buildManifest(artifact, stages, snapshot);
    const m2 = buildManifest(artifact, stages, snapshot);
    assert.equal(m1.hash, m2.hash);
  });

  it('boundary checker catches mixed in-out paths', () => {
    const artifact = makeArtifact({
      files: [
        { path: 'src/valid.ts', changeType: 'add', contentHash: computeHash('v') },
        { path: 'config/secret.json', changeType: 'modify', contentHash: computeHash('s') },
      ],
    });
    const checker = createBoundaryChecker(['src/']);
    const result = checker.check(artifact);
    assert.equal(result.passed, false);
    assert.ok(result.evidence.some(e => e.includes('config/secret.json')));
  });

  it('contract conformance detects missing content hash', () => {
    const artifact = makeArtifact({
      files: [{ path: 'src/foo.ts', changeType: 'add', contentHash: '' }],
    });
    const checker = createContractConformanceChecker();
    const result = checker.check(artifact);
    assert.equal(result.passed, false);
    assert.ok(result.evidence.some(e => e.includes('no content hash')));
  });

  it('evidence validation detects empty sourceId', () => {
    const artifact = makeArtifact({
      evidenceRefs: [{ sourceId: '', sourceType: 'doc', hash: 'abc', retrievedAt: new Date().toISOString() }],
    });
    const checker = createEvidenceValidationChecker();
    const result = checker.check(artifact);
    assert.equal(result.passed, false);
    assert.ok(result.evidence.some(e => e.includes('empty sourceId')));
  });

  it('full gate round-trip produces addressable artifacts', () => {
    const surface = getFullSurface();
    const artifact = makeArtifact();
    const decision = evaluateConstructionGate(artifact, surface, makeAllPassCheckers());

    assert.ok(decision.manifest.manifestId.length > 0);
    assert.ok(decision.manifest.hash.length === 64);
    assert.ok(decision.manifest.timestamp.length > 0);
    assert.equal(decision.manifest.fileCount, 2);
    assert.ok(decision.manifest.totalDurationMs >= 0);

    for (const stage of decision.manifest.stages) {
      assert.ok(stage.evidence.length > 0);
      assert.ok(stage.durationMs >= 0);
    }
  });
});
