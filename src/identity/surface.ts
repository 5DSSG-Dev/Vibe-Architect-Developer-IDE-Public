import type {
  IdentityRecord,
  IdentityProjectionContext,
  SubstrateContextEnvelope,
  AdaptiveIdentitySurface,
  ActionPermission,
  ActionClass,
  ShortfallRecord,
  IdentityDomain,
  IDENTITY_DOMAIN_ACTION_REQUIREMENTS,
} from './contracts.js';
import { IDENTITY_DOMAIN_ACTION_REQUIREMENTS as ACTION_REQS } from './contracts.js';
import { buildMinimumIdentityKernel, extractKernelRecords, kernelFitsEnvelope } from './kernel.js';
import { rankCandidates, selectPromotedRecords, computeCoverage, determineCoverageState } from './projection.js';
import { computeHash } from './hash.js';

export interface ProjectionResult {
  surface: AdaptiveIdentitySurface | null;
  shortfall: ShortfallRecord | null;
}

let shortfallCounter = 0;

function nextShortfallId(): string {
  return `shortfall-${Date.now()}-${++shortfallCounter}`;
}

export function projectIdentitySurface(
  records: IdentityRecord[],
  context: IdentityProjectionContext,
  envelope: SubstrateContextEnvelope,
): ProjectionResult {
  const inputHash = computeHash(JSON.stringify({ records: records.map((r) => r.hash), context, envelope }));

  const kernelSource = extractKernelRecords(records);
  if (!kernelSource) {
    return {
      surface: null,
      shortfall: {
        shortfallId: nextShortfallId(),
        timestamp: new Date().toISOString(),
        inputHash,
        failureType: 'kernel_construction',
        failureEvidence: 'No foundational commitment records available to construct Minimum Identity Kernel',
        coverageStateBefore: 'IDENTITY_UNAVAILABLE',
        coverageStateAfter: 'IDENTITY_UNAVAILABLE',
        omittedRecordRefs: records.map((r) => ({
          recordId: r.recordId,
          domain: r.domain,
          hash: r.hash,
          omissionReason: 'Kernel construction failed — no foundational commitments',
        })),
        recoveryAction: 'Provide foundational commitment identity records',
      },
    };
  }

  const kernel = buildMinimumIdentityKernel(kernelSource);

  if (!kernelFitsEnvelope(kernel, envelope)) {
    return {
      surface: null,
      shortfall: {
        shortfallId: nextShortfallId(),
        timestamp: new Date().toISOString(),
        inputHash,
        failureType: 'overflow',
        failureEvidence: `Minimum Identity Kernel (${kernel.serializedBytes} bytes) exceeds envelope capacity (${envelope.maxSerializedBytes} bytes)`,
        coverageStateBefore: 'IDENTITY_UNAVAILABLE',
        coverageStateAfter: 'IDENTITY_UNAVAILABLE',
        omittedRecordRefs: records.map((r) => ({
          recordId: r.recordId,
          domain: r.domain,
          hash: r.hash,
          omissionReason: 'Kernel exceeds envelope — all records omitted',
        })),
        recoveryAction: 'Increase envelope capacity or reduce kernel size',
      },
    };
  }

  const kernelRecordIds = new Set<string>();
  for (const r of records) {
    if (
      r.domain === 'foundational_commitments' ||
      r.domain === 'sovereignty_consent' ||
      r.domain === 'authority_limitations' ||
      r.domain === 'active_tensions'
    ) {
      kernelRecordIds.add(r.recordId);
    }
  }

  const promotionCandidates = records.filter((r) => !kernelRecordIds.has(r.recordId));
  const ranked = rankCandidates(promotionCandidates, context);
  const { promoted, omissions } = selectPromotedRecords(ranked, kernel, envelope);

  const requiredDomains = ACTION_REQS[context.proposedAction];
  const coverage = computeCoverage(records, promoted, kernelRecordIds, requiredDomains);
  const coverageState = determineCoverageState(coverage, true);

  const surfaceBytes = kernel.serializedBytes +
    promoted.reduce((sum, p) => sum + new TextEncoder().encode(JSON.stringify(p.record)).byteLength, 0);

  const surface: AdaptiveIdentitySurface = {
    kernel,
    promoted,
    omissions,
    coverage,
    coverageState,
    serializedBytes: surfaceBytes,
    envelopeCapacity: envelope.maxSerializedBytes,
    projectionTimestamp: new Date().toISOString(),
  };

  if (coverageState === 'IDENTITY_DEGRADED') {
    return {
      surface,
      shortfall: {
        shortfallId: nextShortfallId(),
        timestamp: new Date().toISOString(),
        inputHash,
        failureType: 'projection_failure',
        failureEvidence: `Identity coverage degraded: required domains not fully covered for ${context.proposedAction}`,
        coverageStateBefore: 'FULL_SURFACE',
        coverageStateAfter: 'IDENTITY_DEGRADED',
        omittedRecordRefs: omissions,
        recoveryAction: 'Promote additional records for missing domains or reduce action class',
      },
    };
  }

  return { surface, shortfall: null };
}

export function checkActionPermission(
  surface: AdaptiveIdentitySurface | null,
  actionClass: ActionClass,
): ActionPermission {
  const requiredDomains = ACTION_REQS[actionClass];

  if (!surface) {
    return {
      actionClass,
      permitted: actionClass === 'observation',
      reason: actionClass === 'observation'
        ? 'Observation permitted without identity surface'
        : 'Identity surface unavailable',
      requiredDomains,
      satisfiedDomains: [],
      missingDomains: requiredDomains,
    };
  }

  const satisfiedDomains: IdentityDomain[] = [];
  const missingDomains: IdentityDomain[] = [];

  for (const domain of requiredDomains) {
    const measurement = surface.coverage.find((c) => c.domain === domain);
    if (measurement && measurement.includedRecords > 0) {
      satisfiedDomains.push(domain);
    } else {
      missingDomains.push(domain);
    }
  }

  const statePermissions: Record<string, Record<ActionClass, boolean>> = {
    FULL_SURFACE: { observation: true, conversation: true, reversible_bounded: true, consequential_mutation: true },
    SUFFICIENT_SURFACE: { observation: true, conversation: true, reversible_bounded: true, consequential_mutation: true },
    MINIMUM_KERNEL: { observation: true, conversation: true, reversible_bounded: false, consequential_mutation: false },
    IDENTITY_DEGRADED: { observation: true, conversation: false, reversible_bounded: false, consequential_mutation: false },
    IDENTITY_UNAVAILABLE: { observation: false, conversation: false, reversible_bounded: false, consequential_mutation: false },
  };

  const statePermitted = statePermissions[surface.coverageState]?.[actionClass] ?? false;
  const domainsPermitted = missingDomains.length === 0;
  const permitted = statePermitted && domainsPermitted;

  let reason: string;
  if (permitted) {
    reason = `${actionClass} permitted at ${surface.coverageState}`;
  } else if (!statePermitted) {
    reason = `${actionClass} not permitted at ${surface.coverageState}`;
  } else {
    reason = `Missing required identity domains: ${missingDomains.join(', ')}`;
  }

  return { actionClass, permitted, reason, requiredDomains, satisfiedDomains, missingDomains };
}
