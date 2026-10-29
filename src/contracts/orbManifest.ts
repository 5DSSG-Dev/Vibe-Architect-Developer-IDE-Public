import { sha256Digest } from './canonicalDigest';
import { UMBILICAL_PROFILES, type UmbilicalProfileId } from './umbilicalStandards';

export interface OrbContractReference {
  readonly id: string;
  readonly version: string;
  readonly digest: string;
}

export interface OrbManifest {
  readonly id: string;
  readonly version: string;
  readonly orbId: string;
  readonly orbVersion: string;
  readonly functionName: string;
  readonly technicalName: string;
  readonly profileIds: readonly UmbilicalProfileId[];
  readonly protocolVersions: readonly string[];
  readonly capabilities: readonly string[];
  readonly requirements: readonly string[];
  readonly resources: {
    readonly memoryMB: number;
    readonly threads: number;
    readonly gpuRequired: boolean;
    readonly bandwidth: Readonly<Partial<Record<UmbilicalProfileId, { normal: number; peak: number; unit: 'CORE_BANDWIDTH_CREDIT' }>>>;
  };
}

export interface ManifestResolution {
  readonly ok: boolean;
  readonly manifest?: OrbManifest;
  readonly reason?: 'MISSING_REFERENCE' | 'UNKNOWN_CONTRACT' | 'STALE_VERSION' | 'DIGEST_MISMATCH' | 'INVALID_MANIFEST';
  readonly message?: string;
}

const manifestLibrary = new Map<string, OrbManifest>();
const builtInReferences = new Map<string, OrbContractReference>();
const contractKey = (id: string, version: string) => `${id}@${version}`;

export function manifestDigest(manifest: OrbManifest): string {
  return sha256Digest(manifest);
}

export function registerOrbManifest(manifest: OrbManifest): OrbContractReference {
  const key = contractKey(manifest.id, manifest.version);
  manifestLibrary.set(key, Object.freeze({
    ...manifest,
    profileIds: Object.freeze([...manifest.profileIds]),
    protocolVersions: Object.freeze([...manifest.protocolVersions]),
    capabilities: Object.freeze([...manifest.capabilities]),
    requirements: Object.freeze([...manifest.requirements]),
    resources: Object.freeze({ ...manifest.resources, bandwidth: Object.freeze({ ...manifest.resources.bandwidth }) })
  }));
  return Object.freeze({ id: manifest.id, version: manifest.version, digest: manifestDigest(manifest) });
}

export function resolveOrbManifest(reference: OrbContractReference | undefined): ManifestResolution {
  if (!reference || !reference.id || !reference.version || !reference.digest) {
    return { ok: false, reason: 'MISSING_REFERENCE', message: 'This Orb did not present a complete contract reference.' };
  }
  const manifest = manifestLibrary.get(contractKey(reference.id, reference.version));
  if (!manifest) {
    const knownId = Array.from(manifestLibrary.values()).some(entry => entry.id === reference.id);
    return knownId
      ? { ok: false, reason: 'STALE_VERSION', message: 'The contract version is no longer in the CORE library.' }
      : { ok: false, reason: 'UNKNOWN_CONTRACT', message: 'The CORE library does not recognize this contract.' };
  }
  if (manifestDigest(manifest) !== reference.digest) {
    return { ok: false, reason: 'DIGEST_MISMATCH', message: 'The contract reference does not match the CORE library copy.' };
  }
  if (!manifest.profileIds.length || !manifest.protocolVersions.length || !Number.isFinite(manifest.resources.memoryMB) || !Number.isFinite(manifest.resources.threads)) {
    return { ok: false, reason: 'INVALID_MANIFEST', message: 'The contract is missing a required profile, protocol, or resource value.' };
  }
  for (const profileId of manifest.profileIds) {
    const profile = UMBILICAL_PROFILES[profileId];
    const bandwidth = manifest.resources.bandwidth[profileId];
    if (!profile || !bandwidth || bandwidth.unit !== 'CORE_BANDWIDTH_CREDIT' || bandwidth.normal <= 0 || bandwidth.peak < bandwidth.normal) {
      return { ok: false, reason: 'INVALID_MANIFEST', message: `The ${profileId} resource envelope is incomplete or invalid.` };
    }
    if (manifest.resources.memoryMB < profile.minimumMemoryMB) {
      return { ok: false, reason: 'INVALID_MANIFEST', message: `The ${profileId} profile needs at least ${profile.minimumMemoryMB} MB of memory.` };
    }
  }
  return { ok: true, manifest };
}

const PROFILE_BY_ORB: Readonly<Record<string, UmbilicalProfileId>> = {
  'orb-http-gateway': 'Interface',
  'orb-auth-service': 'Record',
  'orb-database-engine': 'Record',
  'orb-task-scheduler': 'Pulse',
  'orb-event-bus': 'Pulse',
  'orb-file-storage': 'Archive'
};

export interface DefaultOrbSource {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly memoryReq: number;
  readonly threadsReq: number;
  readonly capabilities: readonly string[];
  readonly requirements: readonly string[];
}

export function registerDefaultOrbManifest(orb: DefaultOrbSource): OrbContractReference | undefined {
  const profileId = PROFILE_BY_ORB[orb.id];
  if (!profileId) return undefined;
  const profile = UMBILICAL_PROFILES[profileId];
  const functionNames: Readonly<Record<string, string>> = {
    'orb-http-gateway': 'Messenger', 'orb-auth-service': 'Gatekeeper', 'orb-database-engine': 'Memory',
    'orb-task-scheduler': 'Timekeeper', 'orb-event-bus': 'Signal', 'orb-file-storage': 'Library'
  };
  const manifest: OrbManifest = {
    id: `orb-contract/${orb.id}`,
    version: '1.0.0',
    orbId: orb.id,
    orbVersion: orb.version,
    functionName: functionNames[orb.id] ?? orb.name,
    technicalName: orb.name,
    profileIds: [profileId],
    protocolVersions: ['4D-VIBE-v1.0'],
    capabilities: [...orb.capabilities],
    requirements: [...orb.requirements],
    resources: {
      memoryMB: Math.max(orb.memoryReq, profile.minimumMemoryMB),
      threads: orb.threadsReq,
      gpuRequired: orb.requirements.some(requirement => requirement === 'gpu_acceleration' || requirement === 'gpu_enabled'),
      bandwidth: { [profileId]: { normal: profile.bandwidth.normal, peak: profile.bandwidth.peak, unit: profile.bandwidth.unit } }
    }
  };
  const reference = registerOrbManifest(manifest);
  builtInReferences.set(orb.id, reference);
  return reference;
}

export function getBuiltInOrbContractReference(orbId: string): OrbContractReference | undefined {
  const reference = builtInReferences.get(orbId);
  return reference ? Object.freeze({ ...reference }) : undefined;
}
