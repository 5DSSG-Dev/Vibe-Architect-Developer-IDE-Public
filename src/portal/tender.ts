import type { TenderSpec, ExternalEndpoint } from './contracts.js';
import { computeHash } from '../identity/hash.js';

let tenderCounter = 0;

function nextTenderId(): string {
  return `tender-${Date.now()}-${++tenderCounter}`;
}

export interface TenderConfig {
  bufferCapacity?: number;
  maxConcurrentFlows?: number;
  healthCheckIntervalMs?: number;
}

const DEFAULT_TENDER_CONFIG: Required<TenderConfig> = {
  bufferCapacity: 4096,
  maxConcurrentFlows: 4,
  healthCheckIntervalMs: 30000,
};

export function createTender(
  portalRef: string,
  endpoint: ExternalEndpoint,
  config?: TenderConfig,
): TenderSpec {
  const merged = { ...DEFAULT_TENDER_CONFIG, ...config };

  const tenderData = {
    portalRef,
    endpoint: endpoint.endpointId,
    bufferCapacity: merged.bufferCapacity,
    maxConcurrentFlows: merged.maxConcurrentFlows,
    healthCheckIntervalMs: merged.healthCheckIntervalMs,
  };
  const hash = computeHash(JSON.stringify(tenderData));

  return {
    tenderId: nextTenderId(),
    portalRef,
    state: 'initializing',
    endpoint,
    bufferCapacity: merged.bufferCapacity,
    maxConcurrentFlows: merged.maxConcurrentFlows,
    healthCheckIntervalMs: merged.healthCheckIntervalMs,
    hash,
  };
}

export function createEndpoint(
  serviceKind: ExternalEndpoint['serviceKind'],
  protocol: string,
  address: string,
  flowDirection: ExternalEndpoint['flowDirection'],
  capabilities: string[],
): ExternalEndpoint {
  const endpointData = { serviceKind, protocol, address, flowDirection, capabilities };
  const hash = computeHash(JSON.stringify(endpointData));

  return {
    endpointId: `endpoint-${Date.now()}-${++tenderCounter}`,
    serviceKind,
    protocol,
    address,
    flowDirection,
    capabilities,
    hash,
  };
}
