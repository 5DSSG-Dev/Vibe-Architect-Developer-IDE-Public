import type { ApothecaryItem, NegativeSpaceInvariants, RelationContract, SocketBinding } from './relationEngine';
import { allocateFromBudget, getAvailableBudget, releaseAllocation } from './resourceAllocator';
import { getContract, signContract, voidContract } from './contractStore';
import { registerCapabilities, unregisterCapabilities } from './capabilityRegistry';

const PROTOCOL_VERSION = '4D-VIBE-v1.0';
const INVARIANT_NAMES = [
  'never_serializes_witness',
  'never_persists_prompts',
  'no_verdict_over_inner_life',
  'no_unilateral_disconnection',
  'no_capability_without_contract'
] as const;

type InvariantName = (typeof INVARIANT_NAMES)[number];
type RuntimeInvariants = NegativeSpaceInvariants & Record<InvariantName, boolean>;
type ConnectionState = 'PROPOSED' | 'HANDSHAKING' | 'ACTIVE' | 'DEGRADED' | 'SUSPENDED' | 'SEVERED';

export interface HandshakeOptions {
  detected?: boolean;
  structuralConnectionEstablished?: boolean;
  protocolSupported?: boolean;
  directionAccepted?: boolean;
  availableCapabilities?: string[];
  availableResources?: { memoryMB: number; threads: number; gpuEnabled: boolean };
  receptorAccepted?: boolean;
  resourcesAvailable?: boolean;
  invariants?: Partial<Record<InvariantName, boolean>>;
}

export interface ConnectionLifecycle {
  contractId: string;
  state: ConnectionState;
  lastHeartbeatAt?: string;
  missedHeartbeats: number;
  reason?: string;
}

export interface HeartbeatResult extends ConnectionLifecycle {
  invariantsValid: boolean;
}

export interface InvariantReport {
  valid: boolean;
  violations: InvariantName[];
}

type RuntimeContract = RelationContract;

const lifecycleLedger = new Map<string, ConnectionLifecycle>();
let contractSequence = 0;

function canonicalInvariants(overrides: HandshakeOptions['invariants'] = {}): RuntimeInvariants {
  return {
    never_serializes_witness: overrides.never_serializes_witness ?? true,
    never_persists_prompts: overrides.never_persists_prompts ?? true,
    no_verdict_over_inner_life: overrides.no_verdict_over_inner_life ?? true,
    no_unilateral_disconnection: overrides.no_unilateral_disconnection ?? true,
    no_capability_without_contract: overrides.no_capability_without_contract ?? true
  };
}

function newContractId(prefix: string, sourceId: string, targetId: string): string {
  contractSequence += 1;
  return `${prefix}-${sourceId}-${targetId}-${Date.now()}-${contractSequence}`;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

/** Browser-safe, synchronous SHA-256 used so signing stays atomic and deterministic. */
function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);
  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  const w = new Uint32Array(64);
  const rotateRight = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) w[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(w[index - 15], 7) ^ rotateRight(w[index - 15], 18) ^ (w[index - 15] >>> 3);
      const s1 = rotateRight(w[index - 2], 17) ^ rotateRight(w[index - 2], 19) ^ (w[index - 2] >>> 10);
      w[index] = (w[index - 16] + s0 + w[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + choice + k[index] + w[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      hh = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  return Array.from(h, value => value.toString(16).padStart(8, '0')).join('');
}

export function computeContractChecksum(contract: RelationContract): string {
  const { checksum: _checksum, ...signedBody } = contract;
  return `sha256:${sha256Hex(stableSerialize(signedBody))}`;
}

function draftContract(
  prefix: string,
  source: ApothecaryItem,
  targetId: string,
  targetName: string,
  memoryMB: number,
  threads: number,
  capabilities: string[],
  invariants: RuntimeInvariants
): RuntimeContract {
  const contract: RuntimeContract = {
    contractId: newContractId(prefix, source.id, targetId),
    timestamp: new Date().toISOString(),
    sourceItemId: source.id,
    sourceItemName: source.name,
    targetSocketId: targetId,
    targetSocketName: targetName,
    handshakeCompletedStep: 0,
    handshakeStatus: 'IN_PROGRESS',
    negativeSpaceInvariants: invariants,
    capabilitiesExchanged: [...capabilities],
    negotiatedProtocolVersion: PROTOCOL_VERSION,
    allocatedMemoryMB: memoryMB,
    allocatedThreads: threads,
    checksum: ''
  };
  lifecycleLedger.set(contract.contractId, { contractId: contract.contractId, state: 'HANDSHAKING', missedHeartbeats: 0 });
  return contract;
}

function fail(contract: RuntimeContract, step: number, reason: string, allocated = false): RelationContract {
  if (allocated) releaseAllocation(contract.contractId);
  contract.handshakeCompletedStep = step;
  contract.handshakeStatus = 'FAILED';
  contract.failureReason = reason;
  contract.checksum = computeContractChecksum(contract);
  lifecycleLedger.set(contract.contractId, {
    contractId: contract.contractId,
    state: 'SEVERED',
    missedHeartbeats: 0,
    reason
  });
  return contract;
}

function activate(contract: RuntimeContract, finalStep: number, registerElement?: ApothecaryItem): RelationContract {
  contract.handshakeCompletedStep = finalStep;
  contract.handshakeStatus = 'SUCCESS';
  contract.checksum = computeContractChecksum(contract);
  signContract(contract);
  if (registerElement) registerCapabilities(registerElement.id, [...registerElement.capabilities]);
  lifecycleLedger.set(contract.contractId, {
    contractId: contract.contractId,
    state: 'ACTIVE',
    missedHeartbeats: 0,
    lastHeartbeatAt: contract.timestamp
  });
  return contract;
}

function missingRequirements(required: string[], available: string[]): string[] {
  return required.filter(requirement => !available.includes(requirement));
}

export function validateInvariants(contract: Pick<RelationContract, 'negativeSpaceInvariants'>): InvariantReport {
  const invariants = contract.negativeSpaceInvariants as Partial<Record<InvariantName, boolean>>;
  const violations = INVARIANT_NAMES.filter(name => invariants[name] !== true);
  return { valid: violations.length === 0, violations };
}

export function executeUmbilicalHandshake(
  element: ApothecaryItem,
  socket: SocketBinding,
  options: HandshakeOptions = {}
): RelationContract {
  const request = {
    memoryMB: element.memoryReq || 128,
    threads: element.threadsReq || 1,
    gpuAccess: element.requirements.some(requirement => requirement === 'gpu_acceleration' || requirement === 'gpu_enabled')
  };
  const available = options.availableCapabilities ?? [];
  const contract = draftContract('ctr', element, socket.id, socket.name, request.memoryMB, request.threads, element.capabilities, canonicalInvariants(options.invariants));

  if (options.detected === false) return fail(contract, 1, 'Element identity could not be established');
  contract.handshakeCompletedStep = 1;
  if (socket.state !== 'Vacant' || options.structuralConnectionEstablished === false) return fail(contract, 2, 'Umbilical structural connection could not be established');
  contract.handshakeCompletedStep = 2;
  if (options.protocolSupported === false) return fail(contract, 3, 'No mutually supported protocol');
  contract.handshakeCompletedStep = 3;
  if (options.directionAccepted === false) return fail(contract, 4, 'Connection direction was not accepted');
  contract.handshakeCompletedStep = 4;
  const missing = missingRequirements(element.requirements, available);
  if (missing.length > 0) return fail(contract, 5, `Unsatisfied capabilities: ${missing.join(', ')}`);
  contract.handshakeCompletedStep = 6;
  const runtimeBudget = getAvailableBudget();
  const availableBudget = options.availableResources
    ? {
        memoryMB: Math.min(runtimeBudget.memoryMB, options.availableResources.memoryMB),
        threads: Math.min(runtimeBudget.threads, options.availableResources.threads),
        gpuAccess: runtimeBudget.gpuAccess && options.availableResources.gpuEnabled
      }
    : runtimeBudget;
  if (request.memoryMB < 0 || request.memoryMB > availableBudget.memoryMB) {
    return fail(contract, 7, 'Memory requirement exceeds available CORE budget');
  }
  contract.handshakeCompletedStep = 7;
  if (request.threads < 0 || request.threads > availableBudget.threads || (request.gpuAccess && !availableBudget.gpuAccess) || options.resourcesAvailable === false) {
    return fail(contract, 8, request.gpuAccess && !availableBudget.gpuAccess
      ? 'GPU requirement exceeds available CORE budget'
      : 'Thread requirement exceeds available CORE budget');
  }
  if (!allocateFromBudget(contract.contractId, request)) return fail(contract, 8, 'Resource allocation was refused');
  contract.handshakeCompletedStep = 8;
  const invariantReport = validateInvariants(contract);
  if (!invariantReport.valid || options.receptorAccepted === false) {
    return fail(contract, 9, !invariantReport.valid ? `Invariant violation: ${invariantReport.violations.join(', ')}` : 'Receptor rejected the contract', true);
  }
  return activate(contract, 9, element);
}

export function executeTetherHandshake(
  satellite: ApothecaryItem,
  hostOrb: ApothecaryItem,
  options: HandshakeOptions = {}
): RelationContract {
  const contract = draftContract('tether', satellite, hostOrb.id, hostOrb.name, satellite.memoryReq || 64, satellite.threadsReq || 1, satellite.capabilities, canonicalInvariants(options.invariants));
  if (options.detected === false) return fail(contract, 1, 'Satellite identity could not be established');
  contract.handshakeCompletedStep = 1;
  if (options.structuralConnectionEstablished === false) return fail(contract, 2, 'Tether structural connection could not be established');
  contract.handshakeCompletedStep = 2;
  const missing = missingRequirements(satellite.requirements, options.availableCapabilities ?? hostOrb.capabilities);
  if (missing.length > 0 || options.receptorAccepted === false) return fail(contract, 3, missing.length > 0 ? `Host cannot provide: ${missing.join(', ')}` : 'Host rejected the tether');
  contract.handshakeCompletedStep = 3;
  if (satellite.memoryReq > hostOrb.memoryReq || satellite.threadsReq > hostOrb.threadsReq || options.resourcesAvailable === false) return fail(contract, 4, 'Host resource envelope cannot satisfy Satellite');
  contract.handshakeCompletedStep = 4;
  const report = validateInvariants(contract);
  if (!report.valid) return fail(contract, 5, `Invariant violation: ${report.violations.join(', ')}`);
  return activate(contract, 5, satellite);
}

export function executeMeshHandshake(
  satA: ApothecaryItem,
  satB: ApothecaryItem,
  services: string[],
  options: HandshakeOptions = {}
): RelationContract {
  const contract = draftContract('mesh', satA, satB.id, satB.name, 0, 0, services, canonicalInvariants(options.invariants));
  if (options.detected === false) return fail(contract, 1, 'Mesh peer could not be discovered');
  contract.handshakeCompletedStep = 1;
  const unavailable = services.filter(service => !satA.capabilities.includes(service) || !satB.capabilities.includes(service));
  if (unavailable.length > 0 || options.receptorAccepted === false) return fail(contract, 2, unavailable.length > 0 ? `Mesh services unavailable: ${unavailable.join(', ')}` : 'Peer rejected the mesh');
  contract.handshakeCompletedStep = 2;
  if (options.resourcesAvailable === false) return fail(contract, 3, 'Mesh resource validation failed');
  contract.handshakeCompletedStep = 3;
  const report = validateInvariants(contract);
  if (!report.valid) return fail(contract, 4, `Invariant violation: ${report.violations.join(', ')}`);
  return activate(contract, 4);
}

export function getConnectionLifecycle(contractId: string): ConnectionLifecycle | undefined {
  const lifecycle = lifecycleLedger.get(contractId);
  return lifecycle ? { ...lifecycle } : undefined;
}

export function heartbeatCycle(contractOrId: RelationContract | string, health: { healthy?: boolean } = {}): HeartbeatResult {
  const contractId = typeof contractOrId === 'string' ? contractOrId : contractOrId.contractId;
  const contract = typeof contractOrId === 'string' ? getContract(contractId) : contractOrId;
  const lifecycle = lifecycleLedger.get(contractId);
  if (!contract || !lifecycle) throw new Error(`Unknown connection: ${contractId}`);
  if (lifecycle.state === 'SEVERED') throw new Error(`Connection ${contractId} is terminal and cannot heartbeat`);

  const report = validateInvariants(contract);
  if (!report.valid) {
    const severed = severConnection(contractId, `Invariant violation: ${report.violations.join(', ')}`, { fault: true });
    return { ...severed, invariantsValid: false };
  }

  const healthy = health.healthy !== false;
  const next: ConnectionLifecycle = {
    ...lifecycle,
    state: healthy ? 'ACTIVE' : 'DEGRADED',
    lastHeartbeatAt: new Date().toISOString(),
    missedHeartbeats: healthy ? 0 : lifecycle.missedHeartbeats + 1,
    reason: healthy ? undefined : 'Heartbeat health check failed'
  };
  lifecycleLedger.set(contractId, next);
  return { ...next, invariantsValid: true };
}

export function severConnection(
  contractId: string,
  reason: string,
  authorization: { initiatorConsent?: boolean; receptorConsent?: boolean; fault?: boolean } = {}
): ConnectionLifecycle {
  const lifecycle = lifecycleLedger.get(contractId);
  if (!lifecycle) throw new Error(`Unknown connection: ${contractId}`);
  if (lifecycle.state === 'SEVERED') return { ...lifecycle };
  if (!authorization.fault && !(authorization.initiatorConsent && authorization.receptorConsent)) {
    throw new Error('Graceful severance requires mutual consent or an explicit fault');
  }

  const contract = getContract(contractId);
  if (contract) {
    releaseAllocation(contractId);
    voidContract(contractId);
    const hasOtherActiveContract = Array.from(lifecycleLedger.entries()).some(([otherId, entry]) =>
      otherId !== contractId && entry.state !== 'SEVERED' && getContract(otherId)?.sourceItemId === contract.sourceItemId
    );
    if (!hasOtherActiveContract) unregisterCapabilities(contract.sourceItemId);
  }
  const severed: ConnectionLifecycle = { ...lifecycle, state: 'SEVERED', reason };
  lifecycleLedger.set(contractId, severed);
  return { ...severed };
}
