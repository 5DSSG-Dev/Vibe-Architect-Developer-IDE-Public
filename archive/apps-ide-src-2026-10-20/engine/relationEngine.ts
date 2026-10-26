export type GeometryType = 'sphere' | 'octahedron' | 'cube' | 'cylinder' | 'dodecahedron' | 'tetrahedron';
export type SatelliteClass = 'I/O' | 'Compute' | 'Storage' | 'Validation' | 'Security';
export type CategoryType = 'Ingredients' | 'Formulas' | 'Satellites' | 'Constellations';
export type TrustBadgeType = 'Canonical' | 'Validated' | 'Formulated' | 'Experimental' | 'Draft';
export type SocketState = 'Vacant' | 'Active' | 'Degraded' | 'Severed';

export interface ApothecaryItem {
  id: string;
  name: string;
  category: CategoryType;
  trust: TrustBadgeType;
  description: string;
  version: string;
  memoryReq: number; // in MB
  threadsReq: number;
  capabilities: string[];
  requirements: string[];
  geometryType?: GeometryType;
  satelliteClass?: SatelliteClass;
}

export interface SocketBinding {
  id: string;
  name: string;
  angleDeg: number;
  radius: number;
  state: SocketState;
  connectedItem?: ApothecaryItem;
  contractId?: string;
}

export interface NegativeSpaceInvariants {
  never_serializes_witness: boolean;
  never_persists_prompts: boolean;
  no_verdict_over_inner_life: boolean;
}

export interface RelationContract {
  contractId: string;
  timestamp: string;
  sourceItemId: string;
  sourceItemName: string;
  targetSocketId: string;
  targetSocketName: string;
  handshakeCompletedStep: number;
  handshakeStatus: 'SUCCESS' | 'IN_PROGRESS' | 'FAILED';
  negativeSpaceInvariants: NegativeSpaceInvariants;
  capabilitiesExchanged: string[];
  negotiatedProtocolVersion: string;
  allocatedMemoryMB: number;
  allocatedThreads: number;
  checksum: string;
}

export interface HardwareBudget {
  memoryMB: number;
  threads: number;
  gpuEnabled: boolean;
}

export interface ActiveDaemons {
  steward: boolean;
  advocate: boolean;
  temporal: boolean;
  conductor: boolean;
}

export interface CoreManifest {
  coreId: string;
  name: string;
  version: string;
  createdAt: string;
  formlessCoreState: 'UNSERIALIZED_PRISTINE';
  hardwareBudget: HardwareBudget;
  activeDaemons: ActiveDaemons;
  sockets: SocketBinding[];
  contracts: RelationContract[];
}

export const HANDSHAKE_STEPS = [
  { step: 1, key: 'orb_detected', label: '1. Orb Detected', desc: 'Sensing proximity of target interface' },
  { step: 2, key: 'umbilical_connection_established', label: '2. Umbilical Connection Established', desc: 'Physically docking physical tube & ring geometry' },
  { step: 3, key: 'protocol_negotiated', label: '3. Protocol Negotiated', desc: 'Handshaking v4D relational protocol spec' },
  { step: 4, key: 'direction_confirmed', label: '4. Direction Confirmed', desc: 'Validating bilateral data stream orientation' },
  { step: 5, key: 'capabilities_exchanged', label: '5. Capabilities Exchanged', desc: 'Exchanging available execution primitives' },
  { step: 6, key: 'requirements_transmitted', label: '6. Requirements Transmitted', desc: 'Checking hardware & memory constraint envelope' },
  { step: 7, key: 'memory_requirements_validated', label: '7. Memory Requirements Validated', desc: 'Allocating non-fragmented heap buffers' },
  { step: 8, key: 'processing_requirements_validated', label: '8. Processing Requirements Validated', desc: 'Verifying thread pool availability' },
  { step: 9, key: 'negative_space_verified', label: '9. Negative-Space Verified', desc: 'Asserting non-interfering witness boundary invariants' }
] as const;

export function getItem3DTaxonomy(item: ApothecaryItem): {
  geometryType: GeometryType;
  color: number;
  colorHex: string;
  satelliteClass?: SatelliteClass;
} {
  if (item.category === 'Satellites' || item.satelliteClass) {
    const sClass = item.satelliteClass || 'Compute';
    switch (sClass) {
      case 'I/O':
        return { geometryType: 'octahedron', color: 0x00f3ff, colorHex: '#00F3FF', satelliteClass: 'I/O' };
      case 'Compute':
        return { geometryType: 'cube', color: 0xffb000, colorHex: '#FFB000', satelliteClass: 'Compute' };
      case 'Storage':
        return { geometryType: 'cylinder', color: 0x00ff9d, colorHex: '#00FF9D', satelliteClass: 'Storage' };
      case 'Validation':
        return { geometryType: 'dodecahedron', color: 0xa855f7, colorHex: '#A855F7', satelliteClass: 'Validation' };
      case 'Security':
        return { geometryType: 'tetrahedron', color: 0xff2a6d, colorHex: '#FF2A6D', satelliteClass: 'Security' };
    }
  }

  // Orbs (Sphere with trust color)
  let color = 0x00ff9d;
  let colorHex = '#00FF9D';

  switch (item.trust) {
    case 'Canonical':
      color = 0x00ff9d; colorHex = '#00FF9D'; break;
    case 'Validated':
      color = 0x00f3ff; colorHex = '#00F3FF'; break;
    case 'Formulated':
      color = 0xa855f7; colorHex = '#A855F7'; break;
    case 'Experimental':
      color = 0xff2a6d; colorHex = '#FF2A6D'; break;
    case 'Draft':
      color = 0x94a3b8; colorHex = '#94A3B8'; break;
  }

  return { geometryType: 'sphere', color, colorHex };
}

export const DEFAULT_APOTHECARY_CATALOG: ApothecaryItem[] = [
  // Ingredients
  {
    id: 'ing-01',
    name: 'Quantum Telemetry Sensor',
    category: 'Ingredients',
    trust: 'Canonical',
    description: 'High-frequency spatial state observer capturing raw 4D positional metrics.',
    version: '1.4.0',
    memoryReq: 128,
    threadsReq: 1,
    capabilities: ['telemetry_read', 'spatial_stream'],
    requirements: ['memory_heap', 'single_thread'],
    geometryType: 'octahedron',
    satelliteClass: 'I/O'
  },
  {
    id: 'ing-02',
    name: 'Emissive Glass Shader',
    category: 'Ingredients',
    trust: 'Validated',
    description: 'Reflective physical material visualizer with dynamic index of refraction.',
    version: '2.1.0',
    memoryReq: 256,
    threadsReq: 2,
    capabilities: ['shader_render', 'refraction_sim'],
    requirements: ['gpu_acceleration'],
    geometryType: 'cube',
    satelliteClass: 'Compute'
  },
  // Formulas
  {
    id: 'form-01',
    name: 'Umbilical Handshake Engine',
    category: 'Formulas',
    trust: 'Canonical',
    description: 'Deterministic 9-stage relational agreement formula for non-destructive binding.',
    version: '4.0.0-rc1',
    memoryReq: 512,
    threadsReq: 2,
    capabilities: ['handshake_exec', 'contract_signing'],
    requirements: ['invariant_guard'],
    geometryType: 'sphere'
  },
  {
    id: 'form-02',
    name: 'Affective Witness Evaluator',
    category: 'Formulas',
    trust: 'Formulated',
    description: 'Evaluates emotional resonance vectors without persisting user prompt data.',
    version: '0.9.4',
    memoryReq: 384,
    threadsReq: 1,
    capabilities: ['affective_metrics'],
    requirements: ['never_persists_prompts'],
    geometryType: 'sphere'
  },
  // Satellites
  {
    id: 'sat-01',
    name: 'Temporal Tick Daemon',
    category: 'Satellites',
    trust: 'Canonical',
    description: 'High-precision microsecond clock emitter governing CORE tick synchronization.',
    version: '3.2.1',
    memoryReq: 64,
    threadsReq: 1,
    capabilities: ['tick_clock', 'pulse_emitter'],
    requirements: ['realtime_priority'],
    geometryType: 'cylinder',
    satelliteClass: 'Storage'
  },
  {
    id: 'sat-02',
    name: 'Neural Intent Advocate',
    category: 'Satellites',
    trust: 'Validated',
    description: 'Autonomous co-pilot satellite suggesting composition patterns in real time.',
    version: '1.8.2',
    memoryReq: 768,
    threadsReq: 4,
    capabilities: ['intent_synthesis', 'pattern_matching'],
    requirements: ['high_memory'],
    geometryType: 'dodecahedron',
    satelliteClass: 'Validation'
  },
  {
    id: 'sat-03',
    name: 'Containment Guard Satellite',
    category: 'Satellites',
    trust: 'Canonical',
    description: 'Fault isolation boundary monitor keeping satellite crashes inside containment.',
    version: '2.0.0',
    memoryReq: 256,
    threadsReq: 1,
    capabilities: ['fault_containment', 'boundary_isolation'],
    requirements: ['sandbox_runtime'],
    geometryType: 'tetrahedron',
    satelliteClass: 'Security'
  },
  // Constellations
  {
    id: 'const-01',
    name: 'Aegis Hyper-Mesh Matrix',
    category: 'Constellations',
    trust: 'Experimental',
    description: 'Full multi-orb constellation topology for distributed pod computing.',
    version: '0.5.0-beta',
    memoryReq: 2048,
    threadsReq: 8,
    capabilities: ['mesh_routing', 'distributed_pod'],
    requirements: ['multi_core', 'gpu_enabled'],
    geometryType: 'sphere'
  }
];

export const INITIAL_SOCKET_BINDINGS: SocketBinding[] = [
  { id: 'socket-alpha', name: 'Alpha Socket (North)', angleDeg: 0, radius: 4, state: 'Active', connectedItem: DEFAULT_APOTHECARY_CATALOG[2], contractId: 'ctr-alpha-99' },
  { id: 'socket-beta', name: 'Beta Socket (NE)', angleDeg: 45, radius: 4, state: 'Vacant' },
  { id: 'socket-gamma', name: 'Gamma Socket (East)', angleDeg: 90, radius: 4, state: 'Active', connectedItem: DEFAULT_APOTHECARY_CATALOG[0], contractId: 'ctr-gamma-102' },
  { id: 'socket-delta', name: 'Delta Socket (SE)', angleDeg: 135, radius: 4, state: 'Vacant' },
  { id: 'socket-epsilon', name: 'Epsilon Socket (South)', angleDeg: 180, radius: 4, state: 'Vacant' },
  { id: 'socket-zeta', name: 'Zeta Socket (SW)', angleDeg: 225, radius: 4, state: 'Vacant' },
  { id: 'socket-eta', name: 'Eta Socket (West)', angleDeg: 270, radius: 4, state: 'Vacant' },
  { id: 'socket-theta', name: 'Theta Socket (NW)', angleDeg: 315, radius: 4, state: 'Vacant' },
];

export function createInitialCoreManifest(): CoreManifest {
  const initialContracts: RelationContract[] = [
    {
      contractId: 'ctr-alpha-99',
      timestamp: new Date().toISOString(),
      sourceItemId: DEFAULT_APOTHECARY_CATALOG[2].id,
      sourceItemName: DEFAULT_APOTHECARY_CATALOG[2].name,
      targetSocketId: 'socket-alpha',
      targetSocketName: 'Alpha Socket (North)',
      handshakeCompletedStep: 9,
      handshakeStatus: 'SUCCESS',
      negativeSpaceInvariants: {
        never_serializes_witness: true,
        never_persists_prompts: true,
        no_verdict_over_inner_life: true
      },
      capabilitiesExchanged: DEFAULT_APOTHECARY_CATALOG[2].capabilities,
      negotiatedProtocolVersion: '4D-VIBE-v1.0',
      allocatedMemoryMB: 64,
      allocatedThreads: 1,
      checksum: 'sha256:7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c'
    },
    {
      contractId: 'ctr-gamma-102',
      timestamp: new Date().toISOString(),
      sourceItemId: DEFAULT_APOTHECARY_CATALOG[0].id,
      sourceItemName: DEFAULT_APOTHECARY_CATALOG[0].name,
      targetSocketId: 'socket-gamma',
      targetSocketName: 'Gamma Socket (East)',
      handshakeCompletedStep: 9,
      handshakeStatus: 'SUCCESS',
      negativeSpaceInvariants: {
        never_serializes_witness: true,
        never_persists_prompts: true,
        no_verdict_over_inner_life: true
      },
      capabilitiesExchanged: DEFAULT_APOTHECARY_CATALOG[0].capabilities,
      negotiatedProtocolVersion: '4D-VIBE-v1.0',
      allocatedMemoryMB: 128,
      allocatedThreads: 1,
      checksum: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d'
    }
  ];

  return {
    coreId: 'core-crystal-alpha-01',
    name: 'Aegis CORE Crystal',
    version: '1.0.0-RELATIONAL',
    createdAt: new Date().toISOString(),
    formlessCoreState: 'UNSERIALIZED_PRISTINE',
    hardwareBudget: {
      memoryMB: 4096,
      threads: 8,
      gpuEnabled: true
    },
    activeDaemons: {
      steward: true,
      advocate: true,
      temporal: true,
      conductor: true
    },
    sockets: INITIAL_SOCKET_BINDINGS,
    contracts: initialContracts
  };
}
