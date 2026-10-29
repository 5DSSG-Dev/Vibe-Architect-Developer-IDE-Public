export type GeometryType = 'sphere' | 'octahedron' | 'cube' | 'cylinder' | 'dodecahedron' | 'tetrahedron';
export type SatelliteClass = 'I/O' | 'Compute' | 'Storage' | 'Validation' | 'Security';
export type ElementCodeLanguage = 'TypeScript' | 'Python' | 'Rust' | 'JSON' | 'Stellar';
import type { ElementCategory } from '../contracts/elementSchema';
import type { OrbContractReference } from '../contracts/orbManifest';
import { getBuiltInOrbContractReference, registerDefaultOrbManifest } from '../contracts/orbManifest';
import type { UmbilicalProfileId } from '../contracts/umbilicalStandards';
import type { OrbManifest } from '../contracts/orbManifest';

export type CategoryType = ElementCategory;
export type TrustBadgeType = 'Canonical' | 'Validated' | 'Formulated' | 'Experimental' | 'Draft';
export type SocketState = 'Vacant' | 'Active' | 'Degraded' | 'Severed';

export interface ElementCodeFrame {
  language: ElementCodeLanguage;
  fileName: string;
  entrypoint: string;
  source: string;
  updatedAt: string;
}

export interface StellarPackageDescriptor {
  readonly profileId: 'stellar-lab-v0';
  readonly profileHash: string;
  readonly executionKind: 'LAB_SEMANTIC_SUBSET';
  readonly loweringTarget: 'UNASSIGNED_NATIVE_BACKEND';
  readonly sourceHash: string;
  readonly astHash: string;
  readonly glyphAuthorityHash: string;
  readonly officialGlyphCount: 34;
  readonly relicRefs: readonly { readonly id: string; readonly version: string; readonly contentHash: string }[];
  readonly packageHash: string;
}

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
  /**
   * Child satellite element ids bound to this host Orb (Orb -> Satellite tier).
   * Consumed by getElementChildren to drill into the next hierarchy level.
   */
  satellites?: string[];
  /**
   * Child actuator element ids bound to this Satellite (Satellite -> Actuator
   * tier). Consumed by getElementChildren to drill into the concrete operations.
   */
  actuators?: string[];
  /**
   * Pins this item to one specific .glb. When absent the model is chosen by
   * hashing the item id, which is fine for generated content but means the
   * card and the rendered object are only loosely coupled.
  */
  modelKey?: string;
  /** Editable source frame carried by the element wherever it appears. */
  codeFrame?: ElementCodeFrame;
  /** Compiler-owned provenance for the executable Stellar Lab subset. */
  stellarPackage?: StellarPackageDescriptor;
  /** Presented by this Orb when it is dropped onto a CORE Port. */
  umbilicalContractRef?: OrbContractReference;
  /** Explicit authoring choice used to create a CORE-library contract for a custom Orb. */
  umbilicalProfileId?: UmbilicalProfileId;
}

export interface SocketBinding {
  id: string;
  name: string;
  angleDeg: number;
  radius: number;
  state: SocketState;
  connectedItem?: ApothecaryItem;
  /** Satellites tethered to this socket's host Orb (CK-04 attachment stem). */
  attachedSatellites?: ApothecaryItem[];
  contractId?: string;
  /** The profile selected by CORE, persisted with the committed connection. */
  resolvedProfileId?: string;
  resolvedProfileVersion?: string;
  /** Omitted means this CORE Port supports every profile in its contract library. */
  supportedProfileIds?: string[];
}

/**
 * Advertised on dataTransfer at drag start. dataTransfer.getData() is blocked
 * during dragover for security, but `types` is readable — so the drag source
 * flags satellites with this MIME type to let the canvas offer Orb tethering
 * as a drop target instead of socket docking.
 */
export const SATELLITE_DRAG_TYPE = 'application/x-aegis-satellite';

/**
 * Advertised on dataTransfer at drag start for Orbs, mirroring
 * SATELLITE_DRAG_TYPE. Only an Orb carries the handshake code that lets it bind
 * to an Umbilical socket, so the canvas reads this type during dragover to offer
 * a vacant socket as a target for Orbs alone — no other element can handshake
 * with the POD.
 */
export const ORB_DRAG_TYPE = 'application/x-aegis-orb';

export function isSatelliteItem(item: ApothecaryItem): boolean {
  return item.category === 'Satellites' || !!item.satelliteClass;
}

/**
 * True only for Orbs. Architectural invariant: an Umbilical handshake requires
 * the Orb handshake code, so only Orbs may dock to a socket / the POD. Satellites
 * tether to a host Orb; every other tier composes into an Orb rather than binding
 * to the POD directly.
 */
export function isOrbItem(item: ApothecaryItem): boolean {
  return item.category === 'Orbs';
}

export function isActuatorItem(item: ApothecaryItem): boolean {
  return item.category === 'Actuators';
}

/**
 * Returns the next tier down in the Orb -> Satellite -> Actuator hierarchy,
 * resolving child ids against the supplied catalog:
 *   - an Orb yields the ApothecaryItems named in `satellites` (falling back to
 *     any items carrying a satelliteClass when `satellites` is empty, so the
 *     older derive-from-capabilities behaviour still surfaces something);
 *   - a Satellite yields the ApothecaryItems named in `actuators`;
 *   - anything else yields [].
 */
export function getElementChildren(item: ApothecaryItem, catalog: ApothecaryItem[]): ApothecaryItem[] {
  const resolveIds = (ids?: string[]): ApothecaryItem[] =>
    (ids ?? [])
      .map((id) => catalog.find((c) => c.id === id))
      .filter((c): c is ApothecaryItem => Boolean(c));

  if (item.category === 'Orbs') {
    const linked = resolveIds(item.satellites);
    if (linked.length > 0) return linked;
    // Fallback: derive satellites from any catalog item flagged with a class.
    return catalog.filter((c) => Boolean(c.satelliteClass));
  }

  if (isSatelliteItem(item)) {
    return resolveIds(item.actuators);
  }

  return [];
}

export function fileSafeElementName(item: Pick<ApothecaryItem, 'id' | 'name'>): string {
  return (item.name || item.id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || item.id;
}

export function inferElementCodeLanguage(item: Pick<ApothecaryItem, 'category' | 'satelliteClass'>): ElementCodeLanguage {
  if (item.category === 'Formulas') return 'Python';
  if (item.category === 'Satellites' || item.satelliteClass) return 'TypeScript';
  if (item.category === 'Portals' || item.category === 'Umbilicals') return 'JSON';
  return 'TypeScript';
}

export function createDefaultElementCodeFrame(item: ApothecaryItem): ElementCodeFrame {
  const language = inferElementCodeLanguage(item);
  const safeName = fileSafeElementName(item);
  const capabilities = item.capabilities.length > 0 ? item.capabilities : ['identity_packet'];
  const requirements = item.requirements.length > 0 ? item.requirements : ['invariant_guard'];

  if (language === 'Python') {
    return {
      language,
      fileName: `${safeName}.py`,
      entrypoint: 'execute',
      updatedAt: new Date().toISOString(),
      source: [
        `# ${item.name}`,
        `# ${item.description}`,
        '',
        'def execute(context):',
        `    capabilities = ${JSON.stringify(capabilities)}`,
        `    requirements = ${JSON.stringify(requirements)}`,
        '    return {',
        `        "elementId": "${item.id}",`,
        '        "capabilities": capabilities,',
        '        "requirements": requirements,',
        '        "status": "ready"',
        '    }',
        ''
      ].join('\n')
    };
  }

  if (language === 'Rust') {
    return {
      language,
      fileName: `${safeName}.rs`,
      entrypoint: 'execute',
      updatedAt: new Date().toISOString(),
      source: [
        `// ${item.name}`,
        `// ${item.description}`,
        '',
        'pub fn execute() -> &' + 'static str {',
        '    "ready"',
        '}',
        ''
      ].join('\n')
    };
  }

  if (language === 'JSON') {
    return {
      language,
      fileName: `${safeName}.frame.json`,
      entrypoint: 'manifest',
      updatedAt: new Date().toISOString(),
      source: JSON.stringify(
        {
          elementId: item.id,
          name: item.name,
          category: item.category,
          capabilities,
          requirements,
          relationBoundary: item.category === 'Umbilicals' ? 'CORE_TO_ORB' : item.category
        },
        null,
        2
      )
    };
  }

  return {
    language,
    fileName: `${safeName}.ts`,
    entrypoint: 'execute',
    updatedAt: new Date().toISOString(),
    source: [
      `// ${item.name}`,
      `// ${item.description}`,
      '',
      'export async function execute(context: Record<string, unknown>) {',
      `  const capabilities = ${JSON.stringify(capabilities)};`,
      `  const requirements = ${JSON.stringify(requirements)};`,
      '',
      '  return {',
      `    elementId: '${item.id}',`,
      '    capabilities,',
      '    requirements,',
      '    context,',
      `    status: 'ready'`,
      '  };',
      '}',
      ''
    ].join('\n')
  };
}

export function ensureElementCodeFrame(item: ApothecaryItem): ApothecaryItem & { codeFrame: ElementCodeFrame } {
  const orbReference = item.category === 'Orbs'
    ? item.umbilicalContractRef ?? getBuiltInOrbContractReference(item.id)
    : undefined;
  if (item.codeFrame?.source) return { ...item, umbilicalContractRef: orbReference, codeFrame: item.codeFrame };
  return { ...item, umbilicalContractRef: orbReference, codeFrame: createDefaultElementCodeFrame(item) };
}

/** A Portal placed on the CORE boundary, with its Tender running outboard. */
export interface PortalPlacement {
  id: string;
  name: string;
  /** Degrees around Y. Offset 22.5 from the arms so a Portal never overlaps one. */
  angleDeg: number;
}

/** Boundary slots, all offset 22.5 degrees from the eight umbilical arms. */
export const PORTAL_SLOT_ANGLES = [67.5, 202.5, 112.5, 337.5, 157.5, 292.5, 22.5, 247.5];

export function nextFreePortalAngle(existing: PortalPlacement[]): number | null {
  const taken = new Set(existing.map((p) => p.angleDeg));
  return PORTAL_SLOT_ANGLES.find((a) => !taken.has(a)) ?? null;
}

export interface NegativeSpaceInvariants {
  never_serializes_witness: boolean;
  never_persists_prompts: boolean;
  no_verdict_over_inner_life: boolean;
  no_unilateral_disconnection: boolean;
  no_capability_without_contract: boolean;
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
  allocatedBandwidthNormalCredits?: number;
  allocatedBandwidthPeakCredits?: number;
  allocatedGpuAccess?: boolean;
  contractReference?: OrbContractReference;
  resolvedProfileId?: string;
  resolvedProfileVersion?: string;
  checksum: string;
  failureReason?: string;
}

export interface HardwareBudget {
  memoryMB: number;
  threads: number;
  /** Provisional CORE bandwidth credits, not a measured throughput claim. */
  bandwidthCredits?: number;
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
  portals: PortalPlacement[];
  contracts: RelationContract[];
  /** CORE-owned contract copies required to resolve custom Orb references after reload. */
  orbManifestLibrary?: OrbManifest[];
}

export const HANDSHAKE_STEPS = [
  { step: 1, key: 'orb_detected', label: '1. Orb Detected', desc: 'Sensing proximity of target interface' },
  { step: 2, key: 'umbilical_connection_established', label: '2. Umbilical Connection Established', desc: 'Physically docking physical tube & ring geometry' },
  { step: 3, key: 'protocol_negotiated', label: '3. Orb Contract Resolved', desc: 'The Orb presents its versioned contract reference; CORE verifies the matching profile in its library' },
  { step: 4, key: 'direction_confirmed', label: '4. Direction Confirmed', desc: 'Validating bilateral data stream orientation' },
  { step: 5, key: 'capabilities_exchanged', label: '5. Capabilities Exchanged', desc: 'Exchanging available execution primitives' },
  { step: 6, key: 'requirements_transmitted', label: '6. Requirements Transmitted', desc: 'Checking hardware & memory constraint envelope' },
  { step: 7, key: 'memory_requirements_validated', label: '7. Memory Requirements Validated', desc: 'Allocating non-fragmented heap buffers' },
  { step: 8, key: 'processing_requirements_validated', label: '8. Resources Reserved', desc: 'Reserving memory, bandwidth, threads and any required GPU access' },
  { step: 9, key: 'negative_space_verified', label: '9. Negative-Space Verified', desc: 'Asserting non-interfering witness boundary invariants' }
] as const;

export function getItem3DTaxonomy(item: ApothecaryItem): {
  geometryType: GeometryType;
  color: number;
  colorHex: string;
  satelliteClass?: SatelliteClass;
} {
  // Actuators are concrete operations bound under a Satellite. Render them as a
  // small warm-amber tetrahedron so the lowest tier reads distinctly.
  if (item.category === 'Actuators') {
    return { geometryType: 'tetrahedron', color: 0xffd166, colorHex: '#FFD166' };
  }

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

/**
 * The default element catalog, redesigned as genuinely useful, language-agnostic
 * software building blocks arranged in an Orb -> Satellite -> Actuator hierarchy:
 *   - Orbs are long-lived services / modules,
 *   - Satellites are capabilities bound to a host Orb,
 *   - Actuators are the concrete operations a Satellite drives.
 * Orbs reference their child satellite ids via `satellites`; Satellites reference
 * their child actuator ids via `actuators`. Every element remains Stellar-aligned
 * but DORMANT: no execution is enabled here, only descriptive composition data.
 *
 * NOTE: index [0] (HTTP API Gateway) and index [2] (Relational Database Engine)
 * are the two orbs docked by createInitialCoreManifest / INITIAL_SOCKET_BINDINGS,
 * so both must remain real, descriptively-named Orbs in these positions.
 */
export const DEFAULT_APOTHECARY_CATALOG: ApothecaryItem[] = [
  // ---- Orbs (services / modules) --------------------------------------------
  {
    id: 'orb-http-gateway',
    name: 'HTTP API Gateway',
    category: 'Orbs',
    trust: 'Canonical',
    description: 'Front-door service that terminates HTTP(S), routes requests to backends, and applies validation, rate limiting and access logging at the edge.',
    version: '2.3.0',
    memoryReq: 512,
    threadsReq: 4,
    capabilities: ['http_routing', 'tls_termination', 'reverse_proxy'],
    requirements: ['network_listener', 'thread_pool'],
    geometryType: 'sphere',
    satellites: ['sat-request-validator', 'sat-rate-limiter', 'sat-structured-logger']
  },
  {
    id: 'orb-auth-service',
    name: 'Auth & Session Service',
    category: 'Orbs',
    trust: 'Canonical',
    description: 'Issues and verifies user sessions and access tokens, manages login state, and enforces per-request authorization.',
    version: '1.9.1',
    memoryReq: 384,
    threadsReq: 2,
    capabilities: ['authentication', 'session_management', 'authorization'],
    requirements: ['secret_store', 'clock_source'],
    geometryType: 'sphere',
    satellites: ['sat-jwt-issuer', 'sat-rate-limiter']
  },
  {
    id: 'orb-database-engine',
    name: 'Relational Database Engine',
    category: 'Orbs',
    trust: 'Canonical',
    description: 'Transactional relational store with a query planner and connection pooling, serving durable reads and writes to other services.',
    version: '3.1.4',
    memoryReq: 1024,
    threadsReq: 4,
    capabilities: ['sql_query', 'transactions', 'connection_pooling'],
    requirements: ['persistent_volume', 'thread_pool'],
    geometryType: 'sphere',
    satellites: ['sat-query-planner', 'sat-response-cache']
  },
  {
    id: 'orb-task-scheduler',
    name: 'Task Scheduler',
    category: 'Orbs',
    trust: 'Validated',
    description: 'Runs cron-style and delayed jobs, tracks run history, and retries failed executions with backoff.',
    version: '1.4.2',
    memoryReq: 256,
    threadsReq: 2,
    capabilities: ['cron_scheduling', 'job_queue', 'retry_orchestration'],
    requirements: ['clock_source', 'durable_state'],
    geometryType: 'sphere',
    satellites: ['sat-structured-logger']
  },
  {
    id: 'orb-event-bus',
    name: 'Event Bus',
    category: 'Orbs',
    trust: 'Validated',
    description: 'Publish/subscribe message broker fanning domain events out to subscribers with topic routing and at-least-once delivery.',
    version: '2.0.3',
    memoryReq: 512,
    threadsReq: 4,
    capabilities: ['pub_sub', 'topic_routing', 'message_fanout'],
    requirements: ['durable_state', 'network_listener'],
    geometryType: 'sphere',
    satellites: ['sat-json-transformer', 'sat-structured-logger']
  },
  {
    id: 'orb-file-storage',
    name: 'File Storage Service',
    category: 'Orbs',
    trust: 'Validated',
    description: 'Object storage service for uploading, versioning and streaming binary blobs behind signed access URLs.',
    version: '1.6.0',
    memoryReq: 384,
    threadsReq: 2,
    capabilities: ['blob_storage', 'signed_urls', 'streaming_io'],
    requirements: ['persistent_volume'],
    geometryType: 'sphere',
    satellites: ['sat-response-cache']
  },

  // ---- Satellites (capabilities bound to a host Orb) ------------------------
  {
    id: 'sat-request-validator',
    name: 'Request Validator',
    category: 'Satellites',
    trust: 'Canonical',
    description: 'Validates incoming request bodies, headers and query params against a schema, rejecting malformed input before it reaches a handler.',
    version: '1.5.0',
    memoryReq: 128,
    threadsReq: 1,
    capabilities: ['schema_validation', 'input_sanitization'],
    requirements: ['schema_registry'],
    geometryType: 'dodecahedron',
    satelliteClass: 'Validation',
    actuators: ['act-payload-serializer']
  },
  {
    id: 'sat-rate-limiter',
    name: 'Rate Limiter',
    category: 'Satellites',
    trust: 'Canonical',
    description: 'Enforces per-client request quotas with a token-bucket window, shedding load and returning backpressure signals when limits are exceeded.',
    version: '1.2.1',
    memoryReq: 96,
    threadsReq: 1,
    capabilities: ['rate_limiting', 'quota_enforcement'],
    requirements: ['shared_counter'],
    geometryType: 'tetrahedron',
    satelliteClass: 'Security',
    actuators: ['act-retry-backoff-driver']
  },
  {
    id: 'sat-response-cache',
    name: 'Response Cache',
    category: 'Satellites',
    trust: 'Validated',
    description: 'Caches computed responses and query results with TTL and key-based invalidation to cut load on the host service.',
    version: '2.0.0',
    memoryReq: 256,
    threadsReq: 1,
    capabilities: ['caching', 'ttl_eviction', 'cache_invalidation'],
    requirements: ['memory_heap'],
    geometryType: 'cylinder',
    satelliteClass: 'Storage',
    actuators: ['act-payload-serializer']
  },
  {
    id: 'sat-json-transformer',
    name: 'JSON Transformer',
    category: 'Satellites',
    trust: 'Validated',
    description: 'Maps, filters and reshapes JSON payloads between wire formats and internal domain models.',
    version: '1.3.2',
    memoryReq: 128,
    threadsReq: 1,
    capabilities: ['json_mapping', 'payload_reshaping'],
    requirements: ['cpu_time'],
    geometryType: 'cube',
    satelliteClass: 'Compute',
    actuators: ['act-payload-serializer']
  },
  {
    id: 'sat-structured-logger',
    name: 'Structured Logger',
    category: 'Satellites',
    trust: 'Canonical',
    description: 'Emits structured, correlation-tagged log records to a sink for tracing requests across services.',
    version: '1.7.0',
    memoryReq: 64,
    threadsReq: 1,
    capabilities: ['structured_logging', 'trace_correlation'],
    requirements: ['log_sink'],
    geometryType: 'octahedron',
    satelliteClass: 'I/O',
    actuators: ['act-payload-serializer']
  },
  {
    id: 'sat-query-planner',
    name: 'Query Planner',
    category: 'Satellites',
    trust: 'Validated',
    description: 'Compiles and optimizes query plans before handing them to the storage engine for execution.',
    version: '1.1.0',
    memoryReq: 192,
    threadsReq: 1,
    capabilities: ['query_planning', 'cost_estimation'],
    requirements: ['cpu_time'],
    geometryType: 'cube',
    satelliteClass: 'Compute',
    actuators: ['act-sql-query-executor']
  },
  {
    id: 'sat-jwt-issuer',
    name: 'JWT Issuer',
    category: 'Satellites',
    trust: 'Canonical',
    description: 'Mints and verifies signed JSON Web Tokens carrying session claims for the auth service.',
    version: '1.4.0',
    memoryReq: 96,
    threadsReq: 1,
    capabilities: ['token_issuance', 'token_verification'],
    requirements: ['secret_store'],
    geometryType: 'tetrahedron',
    satelliteClass: 'Security',
    actuators: ['act-jwt-signer']
  },

  // ---- Actuators (concrete operations bound to a Satellite) -----------------
  {
    id: 'act-sql-query-executor',
    name: 'SQL Query Executor',
    category: 'Actuators',
    trust: 'Canonical',
    description: 'Executes a prepared SQL statement against a connection and streams the result rows back to its caller.',
    version: '1.0.3',
    memoryReq: 64,
    threadsReq: 1,
    capabilities: ['execute_sql', 'row_streaming'],
    requirements: ['db_connection']
  },
  {
    id: 'act-jwt-signer',
    name: 'JWT Signer',
    category: 'Actuators',
    trust: 'Canonical',
    description: 'Computes the cryptographic signature over a token payload using the active signing key.',
    version: '1.0.1',
    memoryReq: 48,
    threadsReq: 1,
    capabilities: ['sign_payload', 'key_selection'],
    requirements: ['signing_key']
  },
  {
    id: 'act-payload-serializer',
    name: 'Payload Serializer',
    category: 'Actuators',
    trust: 'Validated',
    description: 'Encodes and decodes structured values to and from a wire format (JSON/msgpack) with size limits.',
    version: '1.2.0',
    memoryReq: 48,
    threadsReq: 1,
    capabilities: ['serialize', 'deserialize'],
    requirements: ['cpu_time']
  },
  {
    id: 'act-retry-backoff-driver',
    name: 'Retry/Backoff Driver',
    category: 'Actuators',
    trust: 'Validated',
    description: 'Re-invokes a fallible operation on failure using exponential backoff with jitter and a bounded attempt count.',
    version: '1.1.0',
    memoryReq: 32,
    threadsReq: 1,
    capabilities: ['retry', 'exponential_backoff'],
    requirements: ['clock_source']
  },

  // ---- Ingredients (low-level primitives) -----------------------------------
  {
    id: 'ing-config-loader',
    name: 'Config & Secrets Loader',
    category: 'Ingredients',
    trust: 'Canonical',
    description: 'Loads typed configuration and secrets from the environment and a secret store, exposing them to a service at startup.',
    version: '1.3.0',
    memoryReq: 32,
    threadsReq: 1,
    capabilities: ['config_read', 'secret_resolution'],
    requirements: ['env_access', 'secret_store'],
    geometryType: 'octahedron',
    satelliteClass: 'I/O'
  },
  {
    id: 'ing-connection-pool',
    name: 'Connection Pool',
    category: 'Ingredients',
    trust: 'Validated',
    description: 'Maintains a bounded pool of reusable network/database connections, handing them out and reclaiming them under contention.',
    version: '2.0.1',
    memoryReq: 128,
    threadsReq: 1,
    capabilities: ['connection_reuse', 'pool_management'],
    requirements: ['network_access'],
    geometryType: 'cube',
    satelliteClass: 'Compute'
  },

  // ---- Formulas (composed pipelines) ----------------------------------------
  {
    id: 'form-request-pipeline',
    name: 'Request/Response Pipeline',
    category: 'Formulas',
    trust: 'Canonical',
    description: 'Composed middleware chain that threads a request through validation, auth, handler and serialization to produce a response.',
    version: '2.1.0',
    memoryReq: 256,
    threadsReq: 2,
    capabilities: ['middleware_chain', 'request_lifecycle'],
    requirements: ['ordered_composition'],
    geometryType: 'sphere'
  },
  {
    id: 'form-etl-pipeline',
    name: 'ETL Data Pipeline',
    category: 'Formulas',
    trust: 'Formulated',
    description: 'Extract-transform-load flow that pulls records from a source, reshapes them and writes them to a destination store.',
    version: '0.9.0',
    memoryReq: 384,
    threadsReq: 2,
    capabilities: ['extract', 'transform', 'load'],
    requirements: ['source_connector', 'sink_connector'],
    geometryType: 'sphere'
  },

  // ---- Constellations (multi-service topologies) ----------------------------
  {
    id: 'const-microservices-mesh',
    name: 'Microservices Mesh',
    category: 'Constellations',
    trust: 'Experimental',
    description: 'A full multi-Orb topology wiring gateway, auth, database, event bus and storage services into one deployable system.',
    version: '0.5.0-beta',
    memoryReq: 2048,
    threadsReq: 8,
    capabilities: ['service_discovery', 'mesh_routing', 'distributed_composition'],
    requirements: ['multi_core', 'network_fabric'],
    geometryType: 'sphere'
  }
];

// Built-in Orbs present a stable contract-library reference with their catalog
// entry. The CORE still resolves the canonical manifest independently.
for (const item of DEFAULT_APOTHECARY_CATALOG) {
  if (item.category === 'Orbs') item.umbilicalContractRef = registerDefaultOrbManifest(item);
}

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
        no_verdict_over_inner_life: true,
        no_unilateral_disconnection: true,
        no_capability_without_contract: true
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
        no_verdict_over_inner_life: true,
        no_unilateral_disconnection: true,
        no_capability_without_contract: true
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
      threads: 16,
      bandwidthCredits: 256,
      gpuEnabled: true
    },
    activeDaemons: {
      steward: true,
      advocate: true,
      temporal: true,
      conductor: true
    },
    sockets: INITIAL_SOCKET_BINDINGS,
    // No Portals until the Architect adds one from the Apothecary.
    portals: [],
    contracts: initialContracts
  };
}
