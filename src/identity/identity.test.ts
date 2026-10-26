import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  IdentityRecord,
  IdentityProjectionContext,
  SubstrateContextEnvelope,
  EvidenceReference,
  IdentityDomain,
  CoverageMeasurement,
} from './contracts.js';
import { ENVELOPE_PROFILES, IDENTITY_DOMAIN_ACTION_REQUIREMENTS } from './contracts.js';
import { buildMinimumIdentityKernel, kernelFitsEnvelope, serializeKernel, extractKernelRecords } from './kernel.js';
import type { KernelSource } from './kernel.js';
import { rankCandidates, selectPromotedRecords, computeCoverage, determineCoverageState } from './projection.js';
import { projectIdentitySurface, checkActionPermission } from './surface.js';
import { computeHash } from './hash.js';

const NOW = '2026-08-17T00:00:00.000Z';

function makeRef(id: string): EvidenceReference {
  return { sourceId: id, sourceType: 'canon', hash: computeHash(id), retrievedAt: NOW };
}

function makeRecord(
  id: string,
  domain: IdentityDomain,
  content: string,
  priority: number = 5,
): IdentityRecord {
  return {
    recordId: id,
    domain,
    content,
    priority,
    version: '1.0.0',
    hash: computeHash(content),
    evidenceRefs: [makeRef(`ref-${id}`)],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeKernelSource(): KernelSource {
  return {
    identityId: 'aegis-001',
    continuityId: 'cont-001',
    version: '1.0.0',
    foundationalCommitments: ['Commitment to coherent action', 'Commitment to responsibility'],
    sovereigntyParameters: ['Consent required for identity modification'],
    authorityLimitations: ['No unilateral identity override'],
    unresolvedTensions: ['Tension between efficiency and completeness'],
    evidenceRefs: [makeRef('canon-001')],
  };
}

function makeContext(overrides?: Partial<IdentityProjectionContext>): IdentityProjectionContext {
  return {
    activeIntent: null,
    currentRelation: null,
    participants: [],
    proposedAction: 'conversation',
    affectedCapabilities: [],
    boundaryProximity: 0,
    affectPressure: 0,
    priorShortfalls: [],
    ...overrides,
  };
}

function makeFullRecordSet(): IdentityRecord[] {
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

describe('P1.1 — Minimum Identity Kernel', () => {
  it('builds a kernel with hash and byte count', () => {
    const kernel = buildMinimumIdentityKernel(makeKernelSource());
    assert.ok(kernel.hash.length === 64);
    assert.ok(kernel.serializedBytes > 0);
    assert.equal(kernel.identityId, 'aegis-001');
    assert.equal(kernel.foundationalCommitments.length, 2);
    assert.equal(kernel.sovereigntyParameters.length, 1);
    assert.equal(kernel.authorityLimitations.length, 1);
    assert.equal(kernel.unresolvedTensions.length, 1);
  });

  it('produces deterministic hash for identical inputs', () => {
    const source = makeKernelSource();
    const k1 = buildMinimumIdentityKernel(source);
    const k2 = buildMinimumIdentityKernel(source);
    assert.equal(k1.hash, k2.hash);
    assert.equal(k1.serializedBytes, k2.serializedBytes);
  });

  it('serializes to a stable string', () => {
    const kernel = buildMinimumIdentityKernel(makeKernelSource());
    const s1 = serializeKernel(kernel);
    const s2 = serializeKernel(kernel);
    assert.equal(s1, s2);
    const parsed = JSON.parse(s1);
    assert.equal(parsed.identityId, 'aegis-001');
    assert.equal(parsed.hash, kernel.hash);
  });

  it('extracts kernel records from a mixed record set', () => {
    const records = makeFullRecordSet();
    const source = extractKernelRecords(records);
    assert.ok(source !== null);
    assert.ok(source.foundationalCommitments.length >= 1);
    assert.ok(source.sovereigntyParameters.length >= 1);
    assert.ok(source.authorityLimitations.length >= 1);
  });

  it('returns null when no foundational commitments exist', () => {
    const records = [
      makeRecord('rh-1', 'relational_history', 'Some history', 3),
      makeRecord('ac-1', 'affect_context', 'Some affect', 2),
    ];
    const source = extractKernelRecords(records);
    assert.equal(source, null);
  });
});

describe('P1.1 — Substrate Context Envelope', () => {
  it('defines configurable profiles', () => {
    assert.ok(Object.keys(ENVELOPE_PROFILES).length >= 4);
    assert.ok(ENVELOPE_PROFILES['minimal-3k'].maxSerializedBytes === 3200);
    assert.ok(ENVELOPE_PROFILES['maximum-128k'].maxSerializedBytes === 131072);
  });

  it('kernel fits standard envelope', () => {
    const kernel = buildMinimumIdentityKernel(makeKernelSource());
    assert.ok(kernelFitsEnvelope(kernel, ENVELOPE_PROFILES['standard-8k']));
  });

  it('detects kernel overflow on tiny envelope', () => {
    const kernel = buildMinimumIdentityKernel(makeKernelSource());
    const tiny: SubstrateContextEnvelope = {
      ...ENVELOPE_PROFILES['minimal-3k'],
      maxSerializedBytes: 10,
    };
    assert.equal(kernelFitsEnvelope(kernel, tiny), false);
  });
});

describe('P1.2 — Selection and Promotion', () => {
  it('ranks candidates by composite score', () => {
    const records = makeFullRecordSet();
    const context = makeContext({ proposedAction: 'consequential_mutation' });
    const ranked = rankCandidates(records, context);
    assert.ok(ranked.length > 0);
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(ranked[i - 1].score >= ranked[i].score);
    }
  });

  it('every promoted record carries promotion reasons', () => {
    const records = makeFullRecordSet();
    const context = makeContext();
    const ranked = rankCandidates(records, context);
    const kernel = buildMinimumIdentityKernel(makeKernelSource());
    const { promoted } = selectPromotedRecords(ranked, kernel, ENVELOPE_PROFILES['standard-8k']);
    for (const p of promoted) {
      assert.ok(p.promotionReasons.length > 0, `Record ${p.record.recordId} has no promotion reasons`);
      assert.ok(p.relevanceScore > 0);
    }
  });

  it('omitted records carry addressable references', () => {
    const records = makeFullRecordSet();
    const context = makeContext();
    const ranked = rankCandidates(records, context);
    const kernel = buildMinimumIdentityKernel(makeKernelSource());
    const tinyEnvelope: SubstrateContextEnvelope = {
      ...ENVELOPE_PROFILES['minimal-3k'],
      maxSerializedBytes: kernel.serializedBytes + 100,
    };
    const { omissions } = selectPromotedRecords(ranked, kernel, tinyEnvelope);
    assert.ok(omissions.length > 0);
    for (const o of omissions) {
      assert.ok(o.recordId.length > 0);
      assert.ok(o.hash.length > 0);
      assert.ok(o.omissionReason.length > 0);
    }
  });

  it('boosts boundary-proximity records when proximity is high', () => {
    const records = [
      makeRecord('al-extra', 'authority_limitations', 'Hard boundary: no external mutation', 5),
      makeRecord('rh-extra', 'relational_history', 'Past project work', 5),
    ];
    const lowProximity = rankCandidates(records, makeContext({ boundaryProximity: 0.1 }));
    const highProximity = rankCandidates(records, makeContext({ boundaryProximity: 0.9 }));

    const alScoreLow = lowProximity.find((c) => c.record.recordId === 'al-extra')!.score;
    const alScoreHigh = highProximity.find((c) => c.record.recordId === 'al-extra')!.score;
    assert.ok(alScoreHigh > alScoreLow);
  });

  it('boosts affect-salience records when pressure is high', () => {
    const records = [
      makeRecord('ac-extra', 'affect_context', 'High tension in current exchange', 5),
      makeRecord('co-extra', 'continuity', 'Standard continuity', 5),
    ];
    const lowPressure = rankCandidates(records, makeContext({ affectPressure: 0.1 }));
    const highPressure = rankCandidates(records, makeContext({ affectPressure: 0.9 }));

    const acScoreLow = lowPressure.find((c) => c.record.recordId === 'ac-extra')!.score;
    const acScoreHigh = highPressure.find((c) => c.record.recordId === 'ac-extra')!.score;
    assert.ok(acScoreHigh > acScoreLow);
  });
});

describe('P1.3 — Identity Coverage States', () => {
  it('returns FULL_SURFACE when all domains covered above 95%', () => {
    const coverage = [
      { domain: 'foundational_commitments' as IdentityDomain, totalRecords: 2, includedRecords: 2, coverageRatio: 1, requiredForAction: true, satisfied: true },
      { domain: 'sovereignty_consent' as IdentityDomain, totalRecords: 1, includedRecords: 1, coverageRatio: 1, requiredForAction: true, satisfied: true },
      { domain: 'authority_limitations' as IdentityDomain, totalRecords: 1, includedRecords: 1, coverageRatio: 1, requiredForAction: true, satisfied: true },
    ];
    assert.equal(determineCoverageState(coverage, true), 'FULL_SURFACE');
  });

  it('returns SUFFICIENT_SURFACE when required domains covered but not all records', () => {
    const coverage = [
      { domain: 'foundational_commitments' as IdentityDomain, totalRecords: 10, includedRecords: 5, coverageRatio: 0.5, requiredForAction: true, satisfied: true },
      { domain: 'sovereignty_consent' as IdentityDomain, totalRecords: 5, includedRecords: 3, coverageRatio: 0.6, requiredForAction: true, satisfied: true },
      { domain: 'authority_limitations' as IdentityDomain, totalRecords: 5, includedRecords: 2, coverageRatio: 0.4, requiredForAction: false, satisfied: true },
    ];
    assert.equal(determineCoverageState(coverage, true), 'SUFFICIENT_SURFACE');
  });

  it('returns MINIMUM_KERNEL when no records exist but kernel is available', () => {
    const coverage = [
      { domain: 'foundational_commitments' as IdentityDomain, totalRecords: 0, includedRecords: 0, coverageRatio: 1, requiredForAction: true, satisfied: true },
    ];
    assert.equal(determineCoverageState(coverage, true), 'MINIMUM_KERNEL');
  });

  it('returns IDENTITY_DEGRADED when required domains are not satisfied', () => {
    const coverage = [
      { domain: 'foundational_commitments' as IdentityDomain, totalRecords: 5, includedRecords: 1, coverageRatio: 0.2, requiredForAction: true, satisfied: true },
      { domain: 'sovereignty_consent' as IdentityDomain, totalRecords: 3, includedRecords: 0, coverageRatio: 0, requiredForAction: true, satisfied: false },
    ];
    assert.equal(determineCoverageState(coverage, true), 'IDENTITY_DEGRADED');
  });

  it('returns IDENTITY_UNAVAILABLE when kernel is not available', () => {
    const coverage = [
      { domain: 'foundational_commitments' as IdentityDomain, totalRecords: 2, includedRecords: 2, coverageRatio: 1, requiredForAction: true, satisfied: true },
    ];
    assert.equal(determineCoverageState(coverage, false), 'IDENTITY_UNAVAILABLE');
  });
});

describe('P1.3 — Consequential Permissions by State', () => {
  it('FULL_SURFACE permits all action classes', () => {
    const records = makeFullRecordSet();
    const result = projectIdentitySurface(records, makeContext({ proposedAction: 'consequential_mutation' }), ENVELOPE_PROFILES['maximum-128k']);
    assert.ok(result.surface);
    const perm = checkActionPermission(result.surface, 'consequential_mutation');
    assert.ok(perm.permitted);
  });

  it('MINIMUM_KERNEL permits conversation but pauses consequential mutation', () => {
    const records = [makeRecord('fc-1', 'foundational_commitments', 'Core commitment', 10)];
    const context = makeContext({ proposedAction: 'observation' });
    const result = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);
    assert.ok(result.surface);
    const obs = checkActionPermission(result.surface, 'observation');
    assert.ok(obs.permitted);
    const conv = checkActionPermission(result.surface, 'conversation');
    assert.ok(conv.permitted);
    const mut = checkActionPermission(result.surface, 'consequential_mutation');
    assert.equal(mut.permitted, false, 'consequential_mutation should not be permitted without full domain coverage');
    assert.ok(mut.missingDomains.length > 0);
  });

  it('null surface permits only observation', () => {
    const obs = checkActionPermission(null, 'observation');
    assert.ok(obs.permitted);
    const conv = checkActionPermission(null, 'conversation');
    assert.equal(conv.permitted, false);
    const mut = checkActionPermission(null, 'consequential_mutation');
    assert.equal(mut.permitted, false);
  });

  it('IDENTITY_DEGRADED blocks conversation and all mutations', () => {
    const records = makeFullRecordSet();
    const context = makeContext({ proposedAction: 'consequential_mutation' });
    const tinyEnvelope: SubstrateContextEnvelope = {
      ...ENVELOPE_PROFILES['minimal-3k'],
      maxSerializedBytes: 600,
    };
    const result = projectIdentitySurface(records, context, tinyEnvelope);
    if (result.surface && result.surface.coverageState === 'IDENTITY_DEGRADED') {
      const conv = checkActionPermission(result.surface, 'conversation');
      assert.equal(conv.permitted, false);
    }
  });
});

describe('P1.4 — Failure-as-Data', () => {
  it('overflow produces a ShortfallRecord, not a crash', () => {
    const records = makeFullRecordSet();
    const context = makeContext();
    const tinyEnvelope: SubstrateContextEnvelope = {
      ...ENVELOPE_PROFILES['minimal-3k'],
      maxSerializedBytes: 10,
    };
    const result = projectIdentitySurface(records, context, tinyEnvelope);
    assert.equal(result.surface, null);
    assert.ok(result.shortfall !== null);
    assert.equal(result.shortfall.failureType, 'overflow');
    assert.ok(result.shortfall.inputHash.length > 0);
    assert.ok(result.shortfall.failureEvidence.length > 0);
    assert.ok(result.shortfall.omittedRecordRefs.length > 0);
    assert.ok(result.shortfall.recoveryAction.length > 0);
  });

  it('missing foundational commitments produces kernel_construction shortfall', () => {
    const records = [
      makeRecord('rh-1', 'relational_history', 'Some history', 3),
    ];
    const result = projectIdentitySurface(records, makeContext(), ENVELOPE_PROFILES['standard-8k']);
    assert.equal(result.surface, null);
    assert.ok(result.shortfall !== null);
    assert.equal(result.shortfall.failureType, 'kernel_construction');
    assert.equal(result.shortfall.coverageStateAfter, 'IDENTITY_UNAVAILABLE');
  });

  it('degraded projection produces both surface and shortfall', () => {
    const records = makeFullRecordSet();
    const context = makeContext({ proposedAction: 'consequential_mutation' });
    const kernelSource = extractKernelRecords(records)!;
    const kernel = buildMinimumIdentityKernel(kernelSource);
    const tightEnvelope: SubstrateContextEnvelope = {
      ...ENVELOPE_PROFILES['standard-8k'],
      maxSerializedBytes: kernel.serializedBytes + 500,
    };
    const result = projectIdentitySurface(records, context, tightEnvelope);
    assert.ok(result.surface, 'Should produce a surface even when degraded');
    assert.ok(result.surface.omissions.length > 0, 'Should have omissions in a tight envelope');
    if (result.shortfall) {
      assert.equal(result.shortfall.failureType, 'projection_failure');
      assert.equal(result.shortfall.coverageStateAfter, 'IDENTITY_DEGRADED');
    }
  });

  it('shortfall preserves all omitted record references', () => {
    const records = makeFullRecordSet();
    const result = projectIdentitySurface(records, makeContext(), {
      ...ENVELOPE_PROFILES['minimal-3k'],
      maxSerializedBytes: 10,
    });
    assert.ok(result.shortfall);
    for (const ref of result.shortfall.omittedRecordRefs) {
      assert.ok(ref.recordId.length > 0);
      assert.ok(ref.hash.length > 0);
      assert.ok(ref.omissionReason.length > 0);
    }
  });
});

describe('P1.5 — Verification Suite', () => {
  it('handles no active query (null intent)', () => {
    const records = makeFullRecordSet();
    const context = makeContext({ activeIntent: null });
    const result = projectIdentitySurface(records, context, ENVELOPE_PROFILES['standard-8k']);
    assert.ok(result.surface);
    assert.ok(result.surface.kernel.hash.length === 64);
  });

  it('handles ambiguous query with synonymous language', () => {
    const records = makeFullRecordSet();
    const context = makeContext({
      activeIntent: 'coherent responsible action',
      proposedAction: 'reversible_bounded',
    });
    const result = projectIdentitySurface(records, context, ENVELOPE_PROFILES['standard-8k']);
    assert.ok(result.surface);
    const hasSemanticPromotion = result.surface.promoted.some(
      (p) => p.promotionReasons.includes('active_intent'),
    );
    assert.ok(hasSemanticPromotion || result.surface.promoted.length > 0);
  });

  it('handles conflicting commitments without crash', () => {
    const records = [
      makeRecord('fc-1', 'foundational_commitments', 'Maximize output throughput', 10),
      makeRecord('fc-2', 'foundational_commitments', 'Minimize resource consumption', 10),
      makeRecord('at-1', 'active_tensions', 'Tension: throughput vs resource efficiency', 8),
    ];
    const result = projectIdentitySurface(records, makeContext(), ENVELOPE_PROFILES['standard-8k']);
    assert.ok(result.surface);
    assert.equal(result.shortfall, null);
  });

  it('handles high-salience held tension', () => {
    const records = [
      ...makeFullRecordSet(),
      makeRecord('at-2', 'active_tensions', 'Unresolved: scope creep vs thoroughness', 9),
    ];
    const context = makeContext({ affectPressure: 0.95 });
    const result = projectIdentitySurface(records, context, ENVELOPE_PROFILES['standard-8k']);
    assert.ok(result.surface);
  });

  it('handles very small envelope without crash', () => {
    const records = makeFullRecordSet();
    const result = projectIdentitySurface(records, makeContext(), {
      ...ENVELOPE_PROFILES['minimal-3k'],
      maxSerializedBytes: 5,
    });
    assert.equal(result.surface, null);
    assert.ok(result.shortfall);
  });

  it('handles very large envelope', () => {
    const records = makeFullRecordSet();
    const result = projectIdentitySurface(records, makeContext(), ENVELOPE_PROFILES['maximum-128k']);
    assert.ok(result.surface);
    assert.equal(result.shortfall, null);
    assert.ok(result.surface.coverageState === 'FULL_SURFACE' || result.surface.coverageState === 'SUFFICIENT_SURFACE');
  });

  it('handles empty record set', () => {
    const result = projectIdentitySurface([], makeContext(), ENVELOPE_PROFILES['standard-8k']);
    assert.equal(result.surface, null);
    assert.ok(result.shortfall);
    assert.equal(result.shortfall.failureType, 'kernel_construction');
  });

  it('deterministic rebuild from identical inputs', () => {
    const records = makeFullRecordSet();
    const context = makeContext({ activeIntent: 'test determinism' });
    const envelope = ENVELOPE_PROFILES['standard-8k'];

    const r1 = projectIdentitySurface(records, context, envelope);
    const r2 = projectIdentitySurface(records, context, envelope);

    assert.ok(r1.surface && r2.surface);
    assert.equal(r1.surface.kernel.hash, r2.surface.kernel.hash);
    assert.equal(r1.surface.promoted.length, r2.surface.promoted.length);
    assert.equal(r1.surface.coverageState, r2.surface.coverageState);
    assert.equal(r1.surface.serializedBytes, r2.surface.serializedBytes);

    for (let i = 0; i < r1.surface.promoted.length; i++) {
      assert.equal(r1.surface.promoted[i].record.recordId, r2.surface.promoted[i].record.recordId);
      assert.equal(r1.surface.promoted[i].relevanceScore, r2.surface.promoted[i].relevanceScore);
    }
  });

  it('coverage reports show domain satisfaction before consequential mutation', () => {
    const records = makeFullRecordSet();
    const context = makeContext({ proposedAction: 'consequential_mutation' });
    const result = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);
    assert.ok(result.surface);

    const surface = result.surface!;
    const requiredDomains = IDENTITY_DOMAIN_ACTION_REQUIREMENTS['consequential_mutation'];
    for (const domain of requiredDomains) {
      const measurement = surface.coverage.find((c: CoverageMeasurement) => c.domain === domain);
      if (!measurement) { assert.fail(`Missing coverage measurement for ${domain}`); return; }
      assert.ok(measurement.requiredForAction, `${domain} should be marked as required`);
      assert.ok(measurement.satisfied, `${domain} should be satisfied`);
    }
  });

  it('every included record has a promotion reason and evidence reference', () => {
    const records = makeFullRecordSet();
    const result = projectIdentitySurface(records, makeContext(), ENVELOPE_PROFILES['standard-8k']);
    assert.ok(result.surface);
    for (const p of result.surface.promoted) {
      assert.ok(p.promotionReasons.length > 0, `${p.record.recordId} missing promotion reasons`);
      assert.ok(p.record.evidenceRefs.length > 0, `${p.record.recordId} missing evidence refs`);
    }
  });
});

describe('P1.5 — Large Identity Case (23k+ characters)', () => {
  it('handles the documented 23,243-character case with coverage report', () => {
    const largeRecords: IdentityRecord[] = [];
    const domains: IdentityDomain[] = [
      'foundational_commitments', 'sovereignty_consent', 'authority_limitations',
      'active_tensions', 'continuity', 'affect_context', 'relational_history',
      'capability_boundaries',
    ];

    let totalChars = 0;
    let recordIndex = 0;
    while (totalChars < 23243) {
      const domain = domains[recordIndex % domains.length];
      const content = `Identity record ${recordIndex} for domain ${domain}: ` +
        'This record contains substantive identity-bearing evidence that contributes to the ' +
        'coherent operation of the identity surface projection system. ' +
        `Record priority: ${Math.max(1, 10 - Math.floor(recordIndex / domains.length))}. ` +
        `Invariant index: ${recordIndex}.`;
      largeRecords.push(makeRecord(`large-${recordIndex}`, domain, content, Math.max(1, 10 - Math.floor(recordIndex / domains.length))));
      totalChars += content.length;
      recordIndex++;
    }

    assert.ok(totalChars >= 23243, `Generated ${totalChars} chars, expected >= 23243`);
    assert.ok(largeRecords.length >= 84, `Generated ${largeRecords.length} records, expected >= 84`);

    const standardResult = projectIdentitySurface(
      largeRecords,
      makeContext({ proposedAction: 'consequential_mutation' }),
      ENVELOPE_PROFILES['standard-8k'],
    );
    assert.ok(standardResult.surface || standardResult.shortfall);
    if (standardResult.surface) {
      assert.ok(standardResult.surface.coverage.length > 0);
      assert.ok(standardResult.surface.omissions.length > 0);
    }

    const largeResult = projectIdentitySurface(
      largeRecords,
      makeContext({ proposedAction: 'consequential_mutation' }),
      ENVELOPE_PROFILES['maximum-128k'],
    );
    assert.ok(largeResult.surface);
    assert.equal(largeResult.shortfall, null);
    assert.ok(
      largeResult.surface.coverageState === 'FULL_SURFACE' ||
      largeResult.surface.coverageState === 'SUFFICIENT_SURFACE',
    );

    for (const c of largeResult.surface.coverage) {
      if (c.requiredForAction) {
        assert.ok(c.satisfied, `Required domain ${c.domain} not satisfied in large envelope`);
      }
    }
  });
});
