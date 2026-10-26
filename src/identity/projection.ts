import type {
  IdentityRecord,
  IdentityProjectionContext,
  PromotedRecord,
  PromotionReason,
  OmissionReference,
  SubstrateContextEnvelope,
  MinimumIdentityKernel,
  IdentityDomain,
} from './contracts.js';
import { computeHash } from './hash.js';

interface ScoredCandidate {
  record: IdentityRecord;
  reasons: PromotionReason[];
  score: number;
}

function scoreDomainRelevance(
  record: IdentityRecord,
  context: IdentityProjectionContext,
): { score: number; reasons: PromotionReason[] } {
  let score = 0;
  const reasons: PromotionReason[] = [];

  score += record.priority * 10;
  reasons.push('canonical_priority');

  if (context.activeIntent) {
    const intentTerms = context.activeIntent.toLowerCase().split(/\s+/);
    const contentLower = record.content.toLowerCase();
    const matches = intentTerms.filter((t) => contentLower.includes(t)).length;
    if (matches > 0) {
      score += matches * 5;
      reasons.push('active_intent');
    }
  }

  if (context.proposedAction === 'consequential_mutation') {
    if (
      record.domain === 'foundational_commitments' ||
      record.domain === 'authority_limitations' ||
      record.domain === 'sovereignty_consent'
    ) {
      score += 20;
      reasons.push('proposed_action');
    }
  }

  if (context.boundaryProximity > 0.7) {
    if (record.domain === 'authority_limitations' || record.domain === 'capability_boundaries') {
      score += 15;
      reasons.push('boundary_proximity');
    }
  }

  if (context.affectPressure > 0.5) {
    if (record.domain === 'affect_context' || record.domain === 'active_tensions') {
      score += context.affectPressure * 10;
      reasons.push('affect_salience');
    }
  }

  if (context.participants.length > 0) {
    if (record.domain === 'relational_history') {
      score += 8;
      reasons.push('relation_participant');
    }
  }

  if (context.priorShortfalls.length > 0) {
    const contentLower = record.content.toLowerCase();
    const linked = context.priorShortfalls.some((s) => contentLower.includes(s.toLowerCase()));
    if (linked) {
      score += 12;
      reasons.push('shortfall_linkage');
    }
  }

  const recency = Date.now() - new Date(record.updatedAt).getTime();
  const recencyDays = recency / (1000 * 60 * 60 * 24);
  if (recencyDays < 7) {
    score += 5;
    reasons.push('temporal_relevance');
  } else if (recencyDays < 30) {
    score += 2;
    reasons.push('temporal_relevance');
  }

  return { score, reasons };
}

export function rankCandidates(
  records: IdentityRecord[],
  context: IdentityProjectionContext,
): ScoredCandidate[] {
  return records
    .map((record) => {
      const { score, reasons } = scoreDomainRelevance(record, context);
      return { record, reasons, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function selectPromotedRecords(
  candidates: ScoredCandidate[],
  kernel: MinimumIdentityKernel,
  envelope: SubstrateContextEnvelope,
): { promoted: PromotedRecord[]; omissions: OmissionReference[] } {
  const promoted: PromotedRecord[] = [];
  const omissions: OmissionReference[] = [];
  let usedBytes = kernel.serializedBytes;

  for (const candidate of candidates) {
    const recordBytes = new TextEncoder().encode(JSON.stringify(candidate.record)).byteLength;

    if (usedBytes + recordBytes <= envelope.maxSerializedBytes) {
      promoted.push({
        record: candidate.record,
        promotionReasons: candidate.reasons,
        relevanceScore: candidate.score,
      });
      usedBytes += recordBytes;
    } else {
      omissions.push({
        recordId: candidate.record.recordId,
        domain: candidate.record.domain,
        hash: candidate.record.hash,
        omissionReason: `Exceeded envelope capacity (${usedBytes + recordBytes} > ${envelope.maxSerializedBytes} bytes)`,
      });
    }
  }

  return { promoted, omissions };
}

export function computeCoverage(
  allRecords: IdentityRecord[],
  promoted: PromotedRecord[],
  kernelCoveredIds: Set<string>,
  requiredDomains: IdentityDomain[],
): import('./contracts.js').CoverageMeasurement[] {
  const domains: IdentityDomain[] = [
    'foundational_commitments',
    'sovereignty_consent',
    'authority_limitations',
    'active_tensions',
    'continuity',
    'affect_context',
    'relational_history',
    'capability_boundaries',
  ];

  return domains.map((domain) => {
    const total = allRecords.filter((r) => r.domain === domain).length;
    const kernelIncluded = allRecords.filter((r) => r.domain === domain && kernelCoveredIds.has(r.recordId)).length;
    const promotedIncluded = promoted.filter((p) => p.record.domain === domain).length;
    const included = kernelIncluded + promotedIncluded;
    const required = requiredDomains.includes(domain);

    return {
      domain,
      totalRecords: total,
      includedRecords: included,
      coverageRatio: total > 0 ? included / total : 1,
      requiredForAction: required,
      satisfied: !required || included > 0,
    };
  });
}

export function determineCoverageState(
  coverage: import('./contracts.js').CoverageMeasurement[],
  kernelAvailable: boolean,
): import('./contracts.js').IdentityCoverageState {
  if (!kernelAvailable) return 'IDENTITY_UNAVAILABLE';

  const allSatisfied = coverage.every((c) => c.satisfied);
  const totalRecords = coverage.reduce((sum, c) => sum + c.totalRecords, 0);
  const includedRecords = coverage.reduce((sum, c) => sum + c.includedRecords, 0);

  if (totalRecords === 0) return 'MINIMUM_KERNEL';

  const overallCoverage = includedRecords / totalRecords;

  if (overallCoverage >= 0.95 && allSatisfied) return 'FULL_SURFACE';
  if (allSatisfied) return 'SUFFICIENT_SURFACE';
  if (overallCoverage > 0) return 'IDENTITY_DEGRADED';
  return 'MINIMUM_KERNEL';
}
