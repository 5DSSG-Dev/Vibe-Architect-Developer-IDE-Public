import assert from 'node:assert/strict';
import test from 'node:test';

import { getAvailableCoreResources } from './coreCapabilities';
import { createInitialCoreManifest, planElementRemoval, removeElementFromManifest, type ApothecaryItem } from './relationEngine';

const satellite = (id: string): ApothecaryItem => ({
  id, name: id, category: 'Satellites', trust: 'Canonical', description: 'test', version: '1.0.0',
  memoryReq: 64, threadsReq: 1, capabilities: [], requirements: []
});

function manifestWithSatellites() {
  const manifest = createInitialCoreManifest();
  const docked = manifest.sockets.find((socket) => socket.connectedItem && socket.contractId);
  assert.ok(docked, 'the starting CORE has a docked Orb');
  docked.attachedSatellites = [satellite('sat-a'), satellite('sat-b')];
  return { manifest, socket: docked };
}

test('removing an Orb takes its tethered Satellites, frees its socket and gives its room back', () => {
  const { manifest, socket } = manifestWithSatellites();
  const orb = socket.connectedItem!;
  const plan = planElementRemoval(socket, orb.id);
  assert.deepEqual(plan?.removed.map((entry) => entry.id), [orb.id, 'sat-a', 'sat-b']);
  assert.equal(plan?.contractId, socket.contractId);

  const before = getAvailableCoreResources(manifest);
  const after = removeElementFromManifest(manifest, socket.id, orb.id);
  const freed = after.sockets.find((entry) => entry.id === socket.id)!;
  assert.equal(freed.state, 'Vacant');
  assert.equal(freed.connectedItem, undefined);
  assert.equal(freed.contractId, undefined);
  assert.equal(freed.attachedSatellites, undefined);
  assert.ok(getAvailableCoreResources(after).memoryMB > before.memoryMB);
  assert.ok(getAvailableCoreResources(after).threads > before.threads);
  assert.equal(manifest.sockets.find((entry) => entry.id === socket.id)?.connectedItem?.id, orb.id, 'the old manifest is unchanged');
});

test('removing a Satellite leaves its host Orb and the other Satellites in place', () => {
  const { manifest, socket } = manifestWithSatellites();
  assert.deepEqual(planElementRemoval(socket, 'sat-a'), { removed: [socket.attachedSatellites![0]] });
  const after = removeElementFromManifest(manifest, socket.id, 'sat-a');
  const host = after.sockets.find((entry) => entry.id === socket.id)!;
  assert.equal(host.connectedItem?.id, socket.connectedItem?.id);
  assert.equal(host.contractId, socket.contractId);
  assert.deepEqual(host.attachedSatellites?.map((entry) => entry.id), ['sat-b']);
});

test('an Element that is not placed at the socket offers no Remove and changes nothing', () => {
  const { manifest, socket } = manifestWithSatellites();
  assert.equal(planElementRemoval(socket, 'not-here'), undefined);
  assert.deepEqual(removeElementFromManifest(manifest, socket.id, 'not-here').sockets, manifest.sockets);
});
