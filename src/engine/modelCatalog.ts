import { ApothecaryItem, CategoryType } from './relationEngine';

/**
 * One Apothecary Cabinet entry per shipped .glb, so every model can be browsed,
 * opened in the builder and saved.
 *
 * Each entry pins its model with an explicit `modelKey`. The older hand-written
 * catalogue items resolve their model by hashing the item id, which meant the
 * card you clicked and the object that appeared were only loosely related.
 * Pinning removes that indirection: the name on the card is the file rendered.
 */
interface ModelDescriptor {
  key: string;
  name: string;
  category: CategoryType;
  description: string;
  trust?: ApothecaryItem['trust'];
}

const MODEL_DESCRIPTORS: ModelDescriptor[] = [
  // Mint image-to-model export. Keep the generated material intact: its color,
  // ORM and normal textures carry the recognizable shield artwork.
  { key: 'aegisShield', name: 'Prismatic AEGIS Shield Emblem', category: 'Ingredients', trust: 'Validated', description: 'Image-derived AEGIS shield emblem with its authored prismatic material and proportions preserved.' },

  // Cores
  { key: 'coreCrystal', name: 'CORE Seed Crystal', category: 'Cores', description: 'Central crystalline CORE: identity, orchestration and continuity around a formless center.' },
  { key: 'coreCaged', name: 'Caged CORE Crystal', category: 'Cores', description: 'CORE crystal bounded by a titanium containment cage.' },
  { key: 'coreCaged2', name: 'Caged CORE Crystal II', category: 'Cores', description: 'Alternate caged CORE crystal with a denser structural frame.' },
  { key: 'coreCluster', name: 'Crystal Cluster CORE', category: 'Cores', description: 'Multi-crystal CORE expressing distributed capability.' },
  { key: 'coreHaze', name: 'Energy Haze CORE', category: 'Cores', description: 'Diffuse energy-field CORE with no hard boundary.' },

  // Orbs (services / modules) — each shipped orb model mapped to a real service.
  { key: 'orb', name: 'HTTP API Gateway', category: 'Orbs', trust: 'Canonical', description: 'Front-door service terminating HTTP(S) and routing requests to backend services.' },
  { key: 'orb2', name: 'Auth & Session Service', category: 'Orbs', trust: 'Canonical', description: 'Issues and verifies user sessions and access tokens, enforcing per-request authorization.' },
  { key: 'orb3', name: 'Relational Database Engine', category: 'Orbs', trust: 'Canonical', description: 'Transactional relational store with query planning and connection pooling.' },
  { key: 'orb4', name: 'Task Scheduler', category: 'Orbs', trust: 'Validated', description: 'Runs cron-style and delayed jobs with run history and retry on failure.' },
  { key: 'orb5', name: 'Event Bus', category: 'Orbs', trust: 'Validated', description: 'Publish/subscribe broker fanning domain events out to subscribers by topic.' },
  { key: 'orb6', name: 'File Storage Service', category: 'Orbs', trust: 'Validated', description: 'Object storage for uploading, versioning and streaming binary blobs behind signed URLs.' },
  { key: 'orb27', name: 'Search & Indexing Service', category: 'Orbs', trust: 'Validated', description: 'Builds inverted indexes and serves full-text and faceted queries over documents.' },
  { key: 'orb28', name: 'Notification Service', category: 'Orbs', trust: 'Validated', description: 'Delivers email, push and webhook notifications with templating and delivery tracking.' },
  { key: 'orb29', name: 'Payment Processing Service', category: 'Orbs', trust: 'Formulated', description: 'Orchestrates charges, refunds and idempotent settlement against a payment provider.' },
  { key: 'orb90', name: 'Analytics Ingest Service', category: 'Orbs', trust: 'Validated', description: 'Collects and batches event telemetry into a durable pipeline for downstream analysis.' },
  { key: 'orbInteresting', name: 'Feature Flag Service', category: 'Orbs', trust: 'Experimental', description: 'Evaluates targeting rules to toggle features per user, environment and rollout cohort.' },

  // Formulas (composed pipelines)
  { key: 'formula1', name: 'Request/Response Pipeline', category: 'Formulas', description: 'Middleware chain threading a request through validation, auth, handler and serialization.' },
  { key: 'formula31', name: 'ETL Data Pipeline', category: 'Formulas', description: 'Extract-transform-load flow moving records from a source through reshaping into a sink.' },
  { key: 'formula32', name: 'CI Build & Test Pipeline', category: 'Formulas', description: 'Staged pipeline compiling, testing and packaging a build artifact from source.' },
  { key: 'formula33', name: 'Stream Processing Pipeline', category: 'Formulas', description: 'Windowed aggregation flow consuming an event stream and emitting derived metrics.' },

  // Satellites (capabilities bound to a host Orb)
  { key: 'satelite1', name: 'Structured Logger', category: 'Satellites', description: 'Host-bound I/O satellite emitting correlation-tagged structured log records to a sink.' },
  { key: 'satelite2', name: 'JSON Transformer', category: 'Satellites', description: 'Host-bound compute satellite mapping and reshaping JSON payloads between formats.' },
  { key: 'satelite3', name: 'Response Cache', category: 'Satellites', description: 'Host-bound storage satellite caching responses with TTL and key-based invalidation.' },
  { key: 'satelite4', name: 'Request Validator', category: 'Satellites', description: 'Host-bound validation satellite checking request payloads against a schema.' },
  { key: 'satelite5', name: 'Rate Limiter', category: 'Satellites', description: 'Host-bound security satellite enforcing per-client request quotas with backpressure.' },

  // Portals
  { key: 'portal', name: 'Prismatic Iris Portal', category: 'Portals', description: 'Shortfall-isolated gateway through the CORE boundary to external resources.' },
  { key: 'portalTender', name: 'Portal Tender', category: 'Portals', description: 'Articulated conduit connecting a Portal to an exterior service endpoint.' },

  // Umbilicals
  { key: 'umbilical', name: 'Umbilical Conduit', category: 'Umbilicals', description: 'Flexible CORE-to-Orb conduit carrying protocol, capability and data exchange.' },
  { key: 'umbilicalLong', name: 'Umbilical Conduit (Long)', category: 'Umbilicals', description: 'Extended-run CORE-to-Orb relational conduit.' },
  { key: 'umbilicalLong2', name: 'Umbilical Conduit (Slim)', category: 'Umbilicals', description: 'Narrow-gauge CORE-to-Orb relational conduit.' },
  { key: 'umbilicalShort', name: 'Umbilical Conduit (Short)', category: 'Umbilicals', description: 'Short-run CORE-to-Orb relational conduit.' },
  { key: 'umbilicalBroken', name: 'Severed Umbilical', category: 'Umbilicals', description: 'Broken conduit expressing a Severed Relation. A Condition, not a deficiency.' }
];

const SATELLITE_CLASS_BY_KEY: Record<string, ApothecaryItem['satelliteClass']> = {
  satelite1: 'I/O',
  satelite2: 'Compute',
  satelite3: 'Storage',
  satelite4: 'Validation',
  satelite5: 'Security'
};

/** Every shipped model as a catalogue item, pinned to its own .glb. */
export const MODEL_CATALOG: ApothecaryItem[] = MODEL_DESCRIPTORS.map((d) => ({
  id: `model-${d.key}`,
  name: d.name,
  category: d.category,
  trust: d.trust ?? 'Canonical',
  description: d.description,
  version: '1.0.0',
  memoryReq: 128,
  threadsReq: 1,
  capabilities: [],
  requirements: [],
  modelKey: d.key,
  satelliteClass: SATELLITE_CLASS_BY_KEY[d.key]
}));
