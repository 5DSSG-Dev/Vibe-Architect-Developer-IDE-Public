import { CoreManifest, HardwareBudget } from './relationEngine';

// Platform-substrate primitives the CORE Umbilical always provides to any docked
// element. These are the non-resource "requirements" the Apothecary catalog draws
// on (network/storage/clock/secrets/composition wiring). The Capabilities Exchange
// (handshake step 5) matches an element's `requirements` against this set plus the
// resource-gated primitives below and any capabilities inherited from Active orbs;
// they are substrate services, distinct from the higher-level `capabilities` orbs
// offer one another. Kept as the single source of truth so newly catalogued
// elements that need a substrate primitive dock without a spurious Shortfall.
export const CORE_SUBSTRATE_PRIMITIVES = [
  'network_access', 'network_listener', 'network_fabric',
  'clock_source', 'log_sink', 'env_access',
  'persistent_volume', 'durable_state', 'db_connection',
  'secret_store', 'signing_key', 'schema_registry',
  'shared_counter', 'ordered_composition',
  'source_connector', 'sink_connector'
] as const;

// Trust / sandbox invariants the CORE always upholds, independent of budget.
export const CORE_TRUST_CAPABILITIES = [
  'invariant_guard', 'never_persists_prompts', 'sandbox_runtime'
] as const;

// Resources still free after subtracting what the currently docked orbs occupy.
// Pure over the manifest; never mutates it.
export function getAvailableCoreResources(manifest: CoreManifest): HardwareBudget {
  const occupied = manifest.sockets.reduce(
    (total, socket) => ({
      memoryMB: total.memoryMB + (socket.connectedItem?.memoryReq ?? 0),
      threads: total.threads + (socket.connectedItem?.threadsReq ?? 0)
    }),
    { memoryMB: 0, threads: 0 }
  );
  return {
    memoryMB: Math.max(0, manifest.hardwareBudget.memoryMB - occupied.memoryMB),
    threads: Math.max(0, manifest.hardwareBudget.threads - occupied.threads),
    gpuEnabled: manifest.hardwareBudget.gpuEnabled
  };
}

// The full set of execution primitives + capabilities the CORE can offer over the
// Umbilical right now: the trust invariants and substrate services it always
// provides, the resource-gated primitives it can still afford, and every
// capability inherited from the orbs already Active on it. This is the `available`
// side of the step-5 Capabilities Exchange.
export function getCoreRuntimeCapabilities(manifest: CoreManifest): string[] {
  const available = getAvailableCoreResources(manifest);
  const capabilities = new Set<string>([
    ...CORE_TRUST_CAPABILITIES,
    ...CORE_SUBSTRATE_PRIMITIVES
  ]);
  // Resource-gated primitives — a starved CORE cannot offer these, so the
  // Capabilities Exchange still fails honestly when the budget is exhausted.
  if (available.memoryMB > 0) capabilities.add('memory_heap');
  if (available.memoryMB >= 768) capabilities.add('high_memory');
  if (available.threads > 0) {
    capabilities.add('single_thread');
    capabilities.add('cpu_time');
    capabilities.add('thread_pool');
  }
  if (available.threads >= 2) capabilities.add('multi_core');
  if (available.gpuEnabled) {
    capabilities.add('gpu_acceleration');
    capabilities.add('gpu_enabled');
  }
  for (const socket of manifest.sockets) {
    if (socket.state === 'Active') socket.connectedItem?.capabilities.forEach(capability => capabilities.add(capability));
  }
  return [...capabilities];
}
