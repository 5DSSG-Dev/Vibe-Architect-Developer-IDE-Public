import assert from 'node:assert/strict';
import test from 'node:test';

import { getCapabilityProviders } from './capabilityRegistry';
import { registerCustomOrbManifest } from '../contracts/orbManifest';
import { getConnectionEvents } from '../contracts/connectionEvents';
import {
  computeContractChecksum,
  executeMeshHandshake,
  executeTetherHandshake,
  executeUmbilicalHandshake,
  getConnectionLifecycle,
  heartbeatCycle,
  severConnection,
  validateInvariants
} from './connectionRuntime';
import { getContract } from './contractStore';
import { ApothecaryItem, RelationContract, SocketBinding } from './relationEngine';
import { getAvailableBudget } from './resourceAllocator';

function item(id: string, overrides: Partial<ApothecaryItem> = {}): ApothecaryItem {
  const result: ApothecaryItem = {
    id,
    name: id,
    category: 'Orbs',
    trust: 'Canonical',
    description: 'test element',
    version: '1.0.0',
    memoryReq: 64,
    threadsReq: 1,
    capabilities: ['observe'],
    requirements: [],
    ...overrides
  };

  if (result.category === 'Orbs' && !Object.prototype.hasOwnProperty.call(overrides, 'umbilicalContractRef')) {
    return {
      ...result,
      umbilicalContractRef: registerCustomOrbManifest({
        id: result.id,
        name: result.name,
        version: result.version,
        memoryReq: result.memoryReq,
        threadsReq: result.threadsReq,
        capabilities: result.capabilities,
        requirements: result.requirements
      }, 'Interface')
    };
  }

  return result;
}

function socket(id = 'socket-1'): SocketBinding {
  return { id, name: id, angleDeg: 0, radius: 1, state: 'Vacant' };
}

test('umbilical success signs a real deterministic SHA-256 contract and activates it', () => {
  const contract = executeUmbilicalHandshake(item('orb-hash'), socket('socket-hash'));

  assert.equal(contract.handshakeStatus, 'SUCCESS');
  assert.equal(contract.handshakeCompletedStep, 9);
  assert.match(contract.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(contract.checksum, computeContractChecksum(contract));
  assert.equal(getContract(contract.contractId), contract);
  assert.equal(getConnectionLifecycle(contract.contractId)?.state, 'ACTIVE');

  severConnection(contract.contractId, 'test cleanup', { fault: true });
});

test('umbilical budget failure stops at the failing step and leaks no state', () => {
  const before = getAvailableBudget();
  const element = item('orb-too-large', { memoryReq: before.memoryMB + 1 });
  const contract = executeUmbilicalHandshake(element, socket('socket-budget'));

  assert.equal(contract.handshakeStatus, 'FAILED');
  assert.equal(contract.handshakeCompletedStep, 7);
  assert.match(contract.failureReason ?? '', /out of memory .* Raise the memory in the CORE Matrix/);
  assert.equal(getContract(contract.contractId), undefined);
  assert.deepEqual(getAvailableBudget(), before);
  assert.deepEqual(getCapabilityProviders('observe').includes(element.id), false);
  assert.equal(getConnectionLifecycle(contract.contractId)?.state, 'SEVERED');
});

test('umbilical thread exhaustion fails specifically at processing validation', () => {
  const before = getAvailableBudget();
  const contract = executeUmbilicalHandshake(
    item('orb-too-many-threads', { memoryReq: 1, threadsReq: before.threads + 1 }),
    socket('socket-threads')
  );

  assert.equal(contract.handshakeStatus, 'FAILED');
  assert.equal(contract.handshakeCompletedStep, 8);
  assert.match(contract.failureReason ?? '', /out of threads .* Raise the threads in the CORE Matrix/);
  assert.deepEqual(getAvailableBudget(), before);
});

test('umbilical requirements are refused unless CORE capabilities are explicitly supplied', () => {
  const element = item('orb-requires-explicit-core', { requirements: ['invariant_guard'] });
  const refused = executeUmbilicalHandshake(element, socket('socket-explicit-refused'));
  assert.equal(refused.handshakeStatus, 'FAILED');
  assert.equal(refused.handshakeCompletedStep, 5);
  assert.match(refused.failureReason ?? '', /invariant_guard/);

  const accepted = executeUmbilicalHandshake(element, socket('socket-explicit-accepted'), {
    availableCapabilities: ['invariant_guard']
  });
  assert.equal(accepted.handshakeStatus, 'SUCCESS');
  severConnection(accepted.contractId, 'test cleanup', { fault: true });
});

test('umbilical uses the explicit CORE resource envelope for UI-originated contracts', () => {
  const before = getAvailableBudget();
  const contract = executeUmbilicalHandshake(
    item('orb-ui-envelope', { memoryReq: 256, threadsReq: 2 }),
    socket('socket-ui-envelope'),
    { availableResources: { memoryMB: 128, threads: 8, gpuEnabled: true } }
  );

  assert.equal(contract.handshakeStatus, 'FAILED');
  assert.equal(contract.handshakeCompletedStep, 7);
  assert.deepEqual(getAvailableBudget(), before);
});

test('a late invariant failure rolls back an acquired allocation', () => {
  const before = getAvailableBudget();
  const contract = executeUmbilicalHandshake(item('orb-bad-invariant'), socket('socket-invariant'), {
    invariants: { never_persists_prompts: false }
  });

  assert.equal(contract.handshakeStatus, 'FAILED');
  assert.equal(contract.handshakeCompletedStep, 9);
  assert.deepEqual(getAvailableBudget(), before);
  assert.equal(getContract(contract.contractId), undefined);
  assert.equal(getCapabilityProviders('observe').includes('orb-bad-invariant'), false);
});

test('immutable negative-space invariants require every canonical refusal', () => {
  const valid = executeMeshHandshake(
    item('sat-valid-a', { category: 'Satellites', capabilities: ['relay'] }),
    item('sat-valid-b', { category: 'Satellites', capabilities: ['relay'] }),
    ['relay']
  );
  assert.equal(validateInvariants(valid).valid, true);

  const tampered = {
    ...valid,
    negativeSpaceInvariants: { ...valid.negativeSpaceInvariants, never_serializes_witness: false }
  } as RelationContract;
  assert.equal(validateInvariants(tampered).valid, false);
  assert.deepEqual(validateInvariants(tampered).violations, ['never_serializes_witness']);
  severConnection(valid.contractId, 'test cleanup', { fault: true });
});

test('tether and mesh report their own deterministic failure step', () => {
  const tether = executeTetherHandshake(
    item('sat-demanding', { category: 'Satellites', requirements: ['write'], memoryReq: 128 }),
    item('host-limited', { capabilities: ['read'], memoryReq: 64 })
  );
  assert.equal(tether.handshakeStatus, 'FAILED');
  assert.equal(tether.handshakeCompletedStep, 3);

  const mesh = executeMeshHandshake(
    item('sat-a', { category: 'Satellites', capabilities: ['read'] }),
    item('sat-b', { category: 'Satellites', capabilities: ['write'] }),
    ['relay']
  );
  assert.equal(mesh.handshakeStatus, 'FAILED');
  assert.equal(mesh.handshakeCompletedStep, 2);

  const meshResources = executeMeshHandshake(
    item('sat-resource-a', { category: 'Satellites', capabilities: ['relay'] }),
    item('sat-resource-b', { category: 'Satellites', capabilities: ['relay'] }),
    ['relay'],
    { resourcesAvailable: false }
  );
  assert.equal(meshResources.handshakeStatus, 'FAILED');
  assert.equal(meshResources.handshakeCompletedStep, 3);
});

test('heartbeat degrades, recovers, and severs immediately on invariant violation', () => {
  const contract = executeUmbilicalHandshake(item('orb-heartbeat'), socket('socket-heartbeat'));

  assert.equal(heartbeatCycle(contract.contractId, { healthy: false }).state, 'DEGRADED');
  assert.equal(heartbeatCycle(contract.contractId, { healthy: true }).state, 'ACTIVE');
  contract.negativeSpaceInvariants.never_persists_prompts = false;
  assert.equal(heartbeatCycle(contract.contractId).state, 'SEVERED');
  assert.equal(getAvailableBudget().memoryMB, 8192);
  assert.equal(getContract(contract.contractId)?.handshakeStatus, 'FAILED');
});

test('graceful sever requires mutual consent and releases resources and capabilities', () => {
  const contract = executeUmbilicalHandshake(item('orb-sever'), socket('socket-sever'));
  const during = getAvailableBudget();

  assert.throws(() => severConnection(contract.contractId, 'one-sided request'), /mutual consent/i);
  assert.equal(getConnectionLifecycle(contract.contractId)?.state, 'ACTIVE');

  const lifecycle = severConnection(contract.contractId, 'mutual shutdown', {
    initiatorConsent: true,
    receptorConsent: true
  });
  assert.equal(lifecycle.state, 'SEVERED');
  assert.equal(getAvailableBudget().memoryMB, during.memoryMB + contract.allocatedMemoryMB);
  assert.equal(getCapabilityProviders('observe').includes('orb-sever'), false);
  assert.throws(() => heartbeatCycle(contract.contractId), /terminal/i);
});

test('a step-5 refusal names the missing capabilities as structured event data', () => {
  const before = getConnectionEvents().length;
  const element = item('orb-needs-pool', { requirements: ['capability_nobody_offers'] });
  const contract = executeUmbilicalHandshake(element, socket('socket-cap'), { availableCapabilities: [] });
  assert.equal(contract.handshakeStatus, 'FAILED');
  const refused = getConnectionEvents().slice(before).find((event) => event.kind === 'refused');
  assert.equal(refused?.reasonCode, 'CAPABILITY_UNSATISFIED');
  assert.deepEqual(refused?.missingCapabilities, ['capability_nobody_offers']);
});
