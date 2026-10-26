// @ts-nocheck -- executed directly with Node's TypeScript stripping; Node types are not a project dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REPLAY_FIXTURE_SNAPSHOT } from '../data/replayFixture.ts';
import { mapCanonicalTopology } from './mapper.ts';

test('canonical mapper preserves POD vocabulary and marks projections explicitly', () => {
  const serialized = JSON.stringify(REPLAY_FIXTURE_SNAPSHOT);
  assert.equal(REPLAY_FIXTURE_SNAPSHOT.pod.pod_id, 'pod:service-operations-fixture');
  assert.equal(Object.hasOwn(REPLAY_FIXTURE_SNAPSHOT.pod, 'core_id'), false);
  assert.deepEqual(Object.keys(REPLAY_FIXTURE_SNAPSHOT.pod.tensors), ['PEER', 'PCT', 'NCT', 'SPINE']);
  assert.equal(REPLAY_FIXTURE_SNAPSHOT.satellites[0].canonical, false);
  assert.equal(REPLAY_FIXTURE_SNAPSHOT.satellites[0].parent_orb_id, 'orb:telemetry');
  assert.equal(REPLAY_FIXTURE_SNAPSHOT.portals[0].tender.canonical, false);
  assert.equal(REPLAY_FIXTURE_SNAPSHOT.portals[0].canonical, false);
  assert.equal(REPLAY_FIXTURE_SNAPSHOT.portals[0].projectionKind, 'conceptual_portal');
  assert.equal(serialized.includes('active_output_root'), false);
  assert.equal(serialized.includes('input_fixture'), false);
  assert.equal(serialized.includes('entrypoint'), false);
});

test('browser evidence contains allowlisted summaries only', () => {
  const evidence = REPLAY_FIXTURE_SNAPSHOT.pod.evidence;
  assert.deepEqual(Object.keys(evidence).sort(), [
    'evidenceRefs', 'hashes', 'observedAt', 'sourceLabel', 'trustState',
  ]);
  assert.equal(evidence.hashes[0], 'A'.repeat(64));
});

test('projection boundary refuses a Satellite without a declared parent Orb', () => {
  const topology = structuredClone(REPLAY_FIXTURE_SNAPSHOT);
  // The public snapshot is intentionally not accepted as canonical mapper input;
  // this assertion targets the mapper's explicit relational guard using a minimal invalid input.
  assert.throws(() => mapCanonicalTopology({
    capturedAt: topology.capturedAt,
    sourceBoundary: 'replay_fixture',
    pod: {
      schema_version: '1', pod_id: 'pod:x', peer_id: 'peer:x', runtime: { language: 'x', implementation: 'x' },
      tensor_spec: { spec_id: 'x', spec_path: 'x', active_output_root: 'x' },
      tensors: Object.fromEntries(['PEER', 'PCT', 'NCT', 'SPINE'].map((name) => [name, {
        name, purpose: 'x', storage: 'x', output: 'x', shape: ['record_count', 1, 1], dtype: 'x',
        axis_order: ['record', 'embedding', 'metadata'], append_only: true,
      }])),
      roles: {}, processor: { purpose: 'x', status: 'x' }, temporal_daemon: { purpose: 'x', status: 'x' },
      orbs: [], evidence: { created_utc: topology.capturedAt, source: 'x', trust_state: 'draft' },
    },
    orbs: [], umbilicals: [], satellites: [{
      satellite_id: 'satellite:orphan', parent_orb_id: 'orb:missing', name: 'Orphan', capability: 'none',
      projectionKind: 'fixture_satellite', evidence: { created_utc: topology.capturedAt, source: 'x', trust_state: 'draft' },
    }],
  }), /declared parent Orb/);
});
