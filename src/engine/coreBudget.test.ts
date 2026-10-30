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

test('a saved CORE on an earlier starting budget moves to today\'s; a hand-set budget is kept', () => {
  const old = { memoryMB: 4096, threads: 16, bandwidthCredits: 256, gpuEnabled: false };
  assert.deepEqual(upgradeStartingBudget(old), { ...old, memoryMB: 8192, threads: 32 });
  assert.deepEqual(upgradeStartingBudget({ ...old, threads: 8 }), { ...old, memoryMB: 8192, threads: 32 });
  const handSet = { memoryMB: 6144, threads: 16, bandwidthCredits: 256, gpuEnabled: true };
  assert.deepEqual(upgradeStartingBudget(handSet), handSet);
  assert.deepEqual(upgradeStartingBudget({ ...handSet, threads: 8 }), { ...handSet, threads: 16 });
});
