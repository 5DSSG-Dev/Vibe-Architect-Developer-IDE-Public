import type {
  MinimumIdentityKernel,
  IdentityRecord,
  EvidenceReference,
  SubstrateContextEnvelope,
} from './contracts.js';
import { computeHash } from './hash.js';

export interface KernelSource {
  identityId: string;
  continuityId: string;
  version: string;
  foundationalCommitments: string[];
  sovereigntyParameters: string[];
  authorityLimitations: string[];
  unresolvedTensions: string[];
  evidenceRefs: EvidenceReference[];
}

export function buildMinimumIdentityKernel(source: KernelSource): MinimumIdentityKernel {
  const body = {
    identityId: source.identityId,
    continuityId: source.continuityId,
    version: source.version,
    foundationalCommitments: source.foundationalCommitments,
    sovereigntyParameters: source.sovereigntyParameters,
    authorityLimitations: source.authorityLimitations,
    unresolvedTensions: source.unresolvedTensions,
    evidenceRefs: source.evidenceRefs,
  };

  const serialized = JSON.stringify(body);
  const hash = computeHash(serialized);

  return {
    ...body,
    hash,
    serializedBytes: new TextEncoder().encode(serialized).byteLength,
  };
}

export function kernelFitsEnvelope(
  kernel: MinimumIdentityKernel,
  envelope: SubstrateContextEnvelope,
): boolean {
  return kernel.serializedBytes <= envelope.maxSerializedBytes;
}

export function serializeKernel(kernel: MinimumIdentityKernel): string {
  return JSON.stringify({
    identityId: kernel.identityId,
    continuityId: kernel.continuityId,
    version: kernel.version,
    hash: kernel.hash,
    foundationalCommitments: kernel.foundationalCommitments,
    sovereigntyParameters: kernel.sovereigntyParameters,
    authorityLimitations: kernel.authorityLimitations,
    unresolvedTensions: kernel.unresolvedTensions,
    evidenceRefs: kernel.evidenceRefs,
  });
}

export function extractKernelRecords(records: IdentityRecord[]): KernelSource | null {
  const commitments = records
    .filter((r) => r.domain === 'foundational_commitments')
    .sort((a, b) => b.priority - a.priority);
  const sovereignty = records
    .filter((r) => r.domain === 'sovereignty_consent')
    .sort((a, b) => b.priority - a.priority);
  const limitations = records
    .filter((r) => r.domain === 'authority_limitations')
    .sort((a, b) => b.priority - a.priority);
  const tensions = records
    .filter((r) => r.domain === 'active_tensions')
    .sort((a, b) => b.priority - a.priority);

  if (commitments.length === 0) return null;

  const allRefs: EvidenceReference[] = [];
  for (const r of [...commitments, ...sovereignty, ...limitations, ...tensions]) {
    for (const ref of r.evidenceRefs) {
      if (!allRefs.some((e) => e.sourceId === ref.sourceId)) {
        allRefs.push(ref);
      }
    }
  }

  return {
    identityId: commitments[0].recordId.split('/')[0] || 'identity-default',
    continuityId: `continuity-${Date.now()}`,
    version: commitments[0].version,
    foundationalCommitments: commitments.map((r) => r.content),
    sovereigntyParameters: sovereignty.map((r) => r.content),
    authorityLimitations: limitations.map((r) => r.content),
    unresolvedTensions: tensions.map((r) => r.content),
    evidenceRefs: allRefs,
  };
}
