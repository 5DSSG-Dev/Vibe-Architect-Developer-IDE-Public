import assert from 'node:assert/strict';
import test from 'node:test';

import { getBuiltInOrbContractReference, resolveOrbManifest } from '../contracts/orbManifest';
import { DEFAULT_APOTHECARY_CATALOG, DEFAULT_CORE_BUDGET, createInitialCoreManifest, isOrbItem, upgradeStartingBudget } from './relationEngine';

const SOCKETS = 8;

test('a new CORE has room for all 8 sockets, even with the heaviest sample Orb in each', () => {
  const orbs = DEFAULT_APOTHECARY_CATALOG.filter(isOrbItem);
  assert.ok(orbs.length > 0);
  for (const orb of orbs) {
    const resolution = resolveOrbManifest(getBuiltInOrbContractReference(orb.id));
    assert.ok(resolution.manifest, `${orb.name} has a manifest`);
    const { memoryMB, threads, bandwidth } = resolution.manifest.resources;
    const peak = Math.max(...Object.values(bandwidth).map((envelope) => envelope?.peak ?? 0));
    assert.ok(memoryMB * SOCKETS <= DEFAULT_CORE_BUDGET.memoryMB, `${orb.name}: memory`);
    assert.ok(threads * SOCKETS <= DEFAULT_CORE_BUDGET.threads, `${orb.name}: threads`);
    assert.ok(peak * SOCKETS <= (DEFAULT_CORE_BUDGET.bandwidthCredits ?? 0), `${orb.name}: bandwidth`);
  }
  assert.deepEqual(createInitialCoreManifest().hardwareBudget, DEFAULT_CORE_BUDGET);
});

test('a saved budget moves up only when it was an earlier starting budget; the Architect\'s choice is kept', () => {
  const legacy = { memoryMB: 4096, threads: 16, bandwidthCredits: 256, gpuEnabled: false };
  assert.deepEqual(upgradeStartingBudget(legacy), { ...legacy, memoryMB: 8192, threads: 32, origin: 'starting' });
  assert.deepEqual(upgradeStartingBudget({ ...legacy, threads: 8 }), { ...legacy, memoryMB: 8192, threads: 32, origin: 'starting' });

  // Chosen in the CORE Matrix, even when it matches an earlier starting budget.
  const chosen = { ...legacy, origin: 'architect' as const };
  assert.deepEqual(upgradeStartingBudget(chosen), chosen);
  assert.deepEqual(upgradeStartingBudget({ ...chosen, threads: 8 }), { ...chosen, threads: 8 });

  // Unmarked but not a starting budget: kept as it is, including 8 threads, and marked as chosen.
  const custom = { memoryMB: 6144, threads: 8, bandwidthCredits: 256, gpuEnabled: true };
  assert.deepEqual(upgradeStartingBudget(custom), { ...custom, origin: 'architect' });

  const current = createInitialCoreManifest().hardwareBudget;
  assert.deepEqual(upgradeStartingBudget(current), current);
});
