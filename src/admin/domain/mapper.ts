import {
  type CanonicalEvidenceContract,
  type CanonicalOrbContract,
  type CanonicalOrbProjection,
  type CanonicalPodContract,
  type CanonicalPodProjection,
  type CanonicalUmbilicalContract,
  type CanonicalUmbilicalProjection,
  type ComponentStatusAxes,
  type PodTopologySnapshot,
  type PortalProjection,
  type PortalProjectionInput,
  type SafeEvidenceSummary,
  type SatelliteProjection,
  type SourceBoundary,
  type TenderProjection,
  TENSOR_CHANNELS,
  type TrustState,
} from './contracts.ts';

export interface SatelliteProjectionInput {
  satellite_id: string;
  parent_orb_id: string;
  name: string;
  capability: string;
  projectionKind: SatelliteProjection['projectionKind'];
  evidence: CanonicalEvidenceContract;
}

export interface TenderProjectionInput {
  tender_id: string;
  portal_id: string;
  safeguards: string[];
  evidence: CanonicalEvidenceContract;
}

export interface CanonicalTopologyInput {
  capturedAt: string;
  sourceBoundary: SourceBoundary;
  pod: CanonicalPodContract;
  orbs: CanonicalOrbContract[];
  umbilicals: CanonicalUmbilicalContract[];
  portals?: PortalProjectionInput[];
  satellites?: SatelliteProjectionInput[];
  tenders?: TenderProjectionInput[];
}

const SHA256_PATTERN = /\b[A-Fa-f0-9]{64}\b/g;
const OPAQUE_REF_PATTERN = /^(?:[A-Za-z][A-Za-z0-9_.-]*:)?[A-Za-z0-9][A-Za-z0-9_.:/-]{2,127}$/;

function sourceLabel(source: string): string {
  const normalized = source.replace(/\\/g, '/');
  const leaf = normalized.split('/').filter(Boolean).pop();
  return leaf && !leaf.includes('?') ? leaf.slice(0, 80) : 'redacted-source';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function sanitizeEvidence(evidence: CanonicalEvidenceContract): SafeEvidenceSummary {
  const candidateRefs = [
    ...stringArray(evidence.evidence_refs),
    ...stringArray(evidence.record_ids),
    ...(typeof evidence.record_id === 'string' ? [evidence.record_id] : []),
  ];
  const candidateHashes = [
    evidence.source_hash,
    evidence.sha256,
    evidence.hash,
    evidence.orb_runtime_hash,
    evidence.contract_hash,
    ...stringArray(evidence.hashes),
  ].filter((value): value is string => typeof value === 'string');
  const hashes = [...new Set(candidateHashes.flatMap((value) => value.match(SHA256_PATTERN) ?? []))]
    .map((hash) => hash.toUpperCase());
  return {
    trustState: evidence.trust_state,
    observedAt: evidence.created_utc,
    sourceLabel: sourceLabel(evidence.source),
    evidenceRefs: [...new Set(candidateRefs.filter((ref) => OPAQUE_REF_PATTERN.test(ref)))].slice(0, 32),
    hashes: hashes.slice(0, 16),
  };
}

function evidenceAxis(trustState: TrustState): ComponentStatusAxes['evidence'] {
  return trustState;
}

function defaultStatus(
  sourceBoundary: SourceBoundary,
  trustState: TrustState,
  overrides: Partial<ComponentStatusAxes> = {},
): ComponentStatusAxes {
  return {
    contract: trustState === 'verified' ? 'valid' : 'provisional',
    attachment: 'not_applicable',
    activity: 'idle',
    evidence: evidenceAxis(trustState),
    health: 'nominal',
    sourceBoundary,
    ...overrides,
  };
}

export function mapCanonicalTopology(input: CanonicalTopologyInput): PodTopologySnapshot {
  const { pod, sourceBoundary } = input;
  const orbIds = new Set(input.orbs.map((orb) => orb.orb_id));
  const portalIds = new Set((input.portals ?? []).map((portal) => portal.portal_id));
  for (const attachment of pod.orbs) {
    if (!orbIds.has(attachment.orb_id)) {
      throw new Error(`Pod attachment references an undeclared Orb: ${attachment.orb_id}`);
    }
    const orb = input.orbs.find((candidate) => candidate.orb_id === attachment.orb_id)!;
    const umbilical = input.umbilicals.find((candidate) => candidate.umbilical_id === attachment.umbilical);
    if (!umbilical || umbilical.orb_id !== orb.orb_id || umbilical.pod_id !== pod.pod_id) {
      throw new Error(`Pod attachment does not resolve to its Orb and Umbilical: ${attachment.orb_id}`);
    }
    if (!orb.umbilicals.includes(umbilical.umbilical_id)) {
      throw new Error(`Orb does not declare the Pod attachment Umbilical: ${orb.orb_id}`);
    }
    const umbilicalVersion = typeof umbilical.invocation.orb_version === 'string'
      ? umbilical.invocation.orb_version
      : undefined;
    if (attachment.orb_version_pin && attachment.orb_version_pin !== orb.orb_version) {
      throw new Error(`Pod Orb version pin does not match the declared Orb: ${orb.orb_id}`);
    }
    if (umbilicalVersion && umbilicalVersion !== orb.orb_version) {
      throw new Error(`Umbilical Orb version pin does not match the declared Orb: ${orb.orb_id}`);
    }
    if (attachment.orb_version_pin && umbilicalVersion && attachment.orb_version_pin !== umbilicalVersion) {
      throw new Error(`Pod and Umbilical version pins disagree: ${orb.orb_id}`);
    }
  }
  const attachedOrbIds = new Set(pod.orbs.map((attachment) => attachment.orb_id));
  for (const orb of input.orbs) {
    if (!attachedOrbIds.has(orb.orb_id)) {
      throw new Error(`Orb is not declared by the Pod attachment list: ${orb.orb_id}`);
    }
  }
  for (const umbilical of input.umbilicals) {
    if (umbilical.pod_id !== pod.pod_id || !orbIds.has(umbilical.orb_id)) {
      throw new Error(`Umbilical relation is outside the declared Pod topology: ${umbilical.umbilical_id}`);
    }
    const attachment = pod.orbs.find((candidate) => (
      candidate.orb_id === umbilical.orb_id && candidate.umbilical === umbilical.umbilical_id
    ));
    if (!attachment) {
      throw new Error(`Umbilical is not declared by the Pod attachment list: ${umbilical.umbilical_id}`);
    }
  }
  for (const satellite of input.satellites ?? []) {
    if (!orbIds.has(satellite.parent_orb_id)) {
      throw new Error(`Satellite projection requires a declared parent Orb: ${satellite.satellite_id}`);
    }
  }
  for (const portal of input.portals ?? []) {
    if (portal.pod_id !== pod.pod_id) {
      throw new Error(`Portal declaration is outside the declared Pod: ${portal.portal_id}`);
    }
  }
  for (const tender of input.tenders ?? []) {
    if (!portalIds.has(tender.portal_id)) {
      throw new Error(`Tender projection requires a declared Portal: ${tender.tender_id}`);
    }
  }
  const podEvidence = sanitizeEvidence(pod.evidence);
  const projectedPod: CanonicalPodProjection = {
    canonical: true,
    schema_version: pod.schema_version,
    pod_id: pod.pod_id,
    peer_id: pod.peer_id,
    displayName: `CORE ${pod.peer_id}`,
    runtime: { ...pod.runtime },
    tensors: Object.fromEntries(TENSOR_CHANNELS.map((channel) => {
      const tensor = pod.tensors[channel];
      return [channel, {
        name: tensor.name,
        purpose: tensor.purpose,
        shape: [...tensor.shape] as [string, number, number],
        dtype: tensor.dtype,
        append_only: tensor.append_only,
      }];
    })) as CanonicalPodProjection['tensors'],
    orbIds: pod.orbs.map((attachment) => attachment.orb_id),
    orbAttachments: pod.orbs.map((attachment) => ({
      orb_id: attachment.orb_id,
      umbilical_id: attachment.umbilical,
      requiredForFullFunction: attachment.required_for_full_function,
      orb_version_pin: attachment.orb_version_pin,
    })),
    evidence: podEvidence,
    status: defaultStatus(sourceBoundary, podEvidence.trustState),
  };

  const orbs: CanonicalOrbProjection[] = input.orbs.map((orb) => {
    const evidence = sanitizeEvidence(orb.evidence);
    return {
      canonical: true,
      schema_version: orb.schema_version,
      orb_id: orb.orb_id,
      orb_version: orb.orb_version,
      pod_id: pod.pod_id,
      abilityName: orb.ability_name,
      purpose: orb.purpose,
      runtime: { language: orb.runtime.language, form: orb.runtime.form },
      capabilities: orb.capabilities.map((capability) => ({ ...capability })),
      umbilicalIds: [...orb.umbilicals],
      evidence,
      status: defaultStatus(sourceBoundary, evidence.trustState, { attachment: 'attached' }),
    };
  });

  const umbilicals: CanonicalUmbilicalProjection[] = input.umbilicals.map((umbilical) => {
    const syntheticEvidence: CanonicalEvidenceContract = {
      created_utc: input.capturedAt,
      source: `umbilical:${umbilical.umbilical_id}`,
      trust_state: umbilical.working_parameters.status,
      evidence_refs: stringArray(umbilical.evidence_contract.evidence_refs),
      hash: umbilical.invocation.orb_runtime_hash,
    };
    const evidence = sanitizeEvidence(syntheticEvidence);
    return {
      canonical: true,
      schema_version: umbilical.schema_version,
      umbilical_id: umbilical.umbilical_id,
      pod_id: umbilical.pod_id,
      orb_id: umbilical.orb_id,
      attachmentPoint: umbilical.attachment_point,
      runtime: { ...umbilical.runtime },
      orbVersionPin: typeof umbilical.invocation.orb_version === 'string'
        ? umbilical.invocation.orb_version
        : undefined,
      evidence,
      status: defaultStatus(sourceBoundary, evidence.trustState, { attachment: 'attached' }),
    };
  });

  const tendersByPortal = new Map<string, TenderProjection>();
  for (const tender of input.tenders ?? []) {
    const evidence = sanitizeEvidence(tender.evidence);
    tendersByPortal.set(tender.portal_id, {
      canonical: false,
      projectionKind: 'conceptual_tender',
      tender_id: tender.tender_id,
      portal_id: tender.portal_id,
      safeguards: [...tender.safeguards],
      evidence,
      status: defaultStatus(sourceBoundary, evidence.trustState),
    });
  }

  const portals: PortalProjection[] = (input.portals ?? []).map((portal) => {
    const evidence = sanitizeEvidence(portal.evidence);
    return {
      canonical: false,
      projectionKind: 'conceptual_portal',
      schema_version: portal.schema_version,
      portal_id: portal.portal_id,
      pod_id: portal.pod_id,
      name: portal.name,
      mode: portal.mode,
      enabled: portal.enabled,
      scope: portal.scope,
      boundary: portal.boundary,
      tender: tendersByPortal.get(portal.portal_id),
      evidence,
      status: defaultStatus(sourceBoundary, evidence.trustState, { attachment: portal.enabled ? 'attached' : 'detached' }),
    };
  });

  const satellites: SatelliteProjection[] = (input.satellites ?? []).map((satellite) => {
    const evidence = sanitizeEvidence(satellite.evidence);
    return {
      canonical: false,
      projectionKind: satellite.projectionKind,
      satellite_id: satellite.satellite_id,
      parent_orb_id: satellite.parent_orb_id,
      pod_id: pod.pod_id,
      name: satellite.name,
      capability: satellite.capability,
      evidence,
      status: defaultStatus(sourceBoundary, evidence.trustState, { attachment: 'attached' }),
    };
  });

  return {
    schemaVersion: '1.0.0',
    capturedAt: input.capturedAt,
    sourceBoundary,
    pod: projectedPod,
    orbs,
    umbilicals,
    satellites,
    portals,
  };
}
