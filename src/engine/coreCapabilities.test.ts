import assert from 'node:assert/strict';
import test from 'node:test';

import { getAvailableCoreResources, getCoreRuntimeCapabilities } from './coreCapabilities';
import { DEFAULT_APOTHECARY_CATALOG, createInitialCoreManifest, CoreManifest } from './relationEngine';

// A CORE at full budget with nothing docked, so occupancy is zero and the
// resource-gated primitives are all offered. Isolates the capability-vocabulary
// invariant from whatever the seed manifest happens to dock.
function healthyCore(): CoreManifest {
  const manifest = createInitialCoreManifest();
  return {
    ...manifest,
    sockets: manifest.sockets.map(socket => ({ ...socket, state: 'Vacant' as const, connectedItem: undefined }))
  };
}

test('a healthy CORE provides every requirement declared across the catalog (step-5 no false Shortfall)', () => {
  const provided = new Set(getCoreRuntimeCapabilities(healthyCore()));

  const missing = new Map<string, string[]>();
  for (const element of DEFAULT_APOTHECARY_CATALOG) {
    const unmet = element.requirements.filter(requirement => !provided.has(requirement));
    if (unmet.length > 0) missing.set(`${element.name} (${element.id})`, unmet);
  }

  assert.deepEqual(
    Object.fromEntries(missing),
    {},
    'These catalog elements would fail the Capabilities Exchange on a healthy CORE'
  );
});

test('every resource-gated primitive is available on a full-budget CORE', () => {
  const provided = new Set(getCoreRuntimeCapabilities(healthyCore()));
  for (const primitive of ['memory_heap', 'high_memory', 'single_thread', 'cpu_time', 'thread_pool', 'multi_core']) {
    assert.ok(provided.has(primitive), `expected full-budget CORE to offer ${primitive}`);
  }
});

test('a starved CORE honestly withholds resource-gated primitives but keeps substrate services', () => {
  const base = createInitialCoreManifest();
  const starved: CoreManifest = {
    ...base,
    hardwareBudget: { memoryMB: 0, threads: 0, gpuEnabled: false },
    sockets: base.sockets.map(socket => ({ ...socket, state: 'Vacant' as const, connectedItem: undefined }))
  };
  const available = getAvailableCoreResources(starved);
  assert.equal(available.memoryMB, 0);
  assert.equal(available.threads, 0);

  const provided = new Set(getCoreRuntimeCapabilities(starved));
  // Resource-gated primitives are withheld — the exchange fails honestly.
  for (const gated of ['memory_heap', 'cpu_time', 'thread_pool', 'multi_core', 'gpu_acceleration']) {
    assert.ok(!provided.has(gated), `starved CORE must not offer ${gated}`);
  }
  // Substrate services and trust invariants are always present.
  for (const always of ['network_listener', 'secret_store', 'clock_source', 'invariant_guard', 'sandbox_runtime']) {
    assert.ok(provided.has(always), `substrate service ${always} must survive starvation`);
  }
});
