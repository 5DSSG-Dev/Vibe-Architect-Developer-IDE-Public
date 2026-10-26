import test from 'node:test';
import assert from 'node:assert/strict';
import { REPLAY_FIXTURE_EVENTS, REPLAY_FIXTURE_SNAPSHOT } from '../data/replayFixture.ts';
import { projectOperationEvents, projectPodTopology } from './adminProjection.ts';
import { createMessageFlowProjection, MESSAGE_FLOW_STAGE_POSITIONS } from './messageFlowProjection.ts';

test('projects satellites under their owning Orb and preserves domain identity', () => {
  const projection = projectPodTopology(REPLAY_FIXTURE_SNAPSHOT);
  const satellite = projection.topology.nodes.find((node) => node.kind === 'satellite');
  assert.equal(satellite?.parentId, 'orb:telemetry');
  assert.deepEqual(satellite?.position, projection.positions.get(satellite!.id));
  assert.equal(projection.componentKinds.get(REPLAY_FIXTURE_SNAPSHOT.pod.pod_id), 'pod');
});

test('maps operation routes deterministically through projected POD positions', () => {
  const scene = projectPodTopology(REPLAY_FIXTURE_SNAPSHOT);
  const first = projectOperationEvents(REPLAY_FIXTURE_EVENTS, scene);
  const second = projectOperationEvents(REPLAY_FIXTURE_EVENTS, scene);
  assert.deepEqual(first, second);
  assert.ok(first.every((operation) => operation.route.length > 0));
  assert.equal(first.length, new Set(REPLAY_FIXTURE_EVENTS.map((event) => event.operationId)).size);
});

test('drops an operation packet rather than shortening an invalid route', () => {
  const scene = projectPodTopology(REPLAY_FIXTURE_SNAPSHOT);
  const invalid = { ...REPLAY_FIXTURE_EVENTS[0], route: { ...REPLAY_FIXTURE_EVENTS[0].route, orderedRefs: [...REPLAY_FIXTURE_EVENTS[0].route.orderedRefs, { kind: 'orb' as const, id: 'missing' }] } };
  assert.equal(projectOperationEvents([invalid], scene).length, 0);
});

test('projects all sanitized message-flow stages without treating CORE presentation as canonical', () => {
  const projection = createMessageFlowProjection(REPLAY_FIXTURE_EVENTS);
  const prism = projection.transactions.find((transaction) => transaction.traceId === 'trace:prism-delivery');
  assert.deepEqual(prism?.route, [
    'sender_ingress', 'pim_in', 'irg', 'core_transit_projection', 'rbc', 'prism', 'pim_out', 'receiver_delivery',
  ]);
  assert.equal(prism?.stageObservedAtMs.length, prism?.route.length);
  assert.equal(prism?.exchangeDirection, 'human_to_ai');
  assert.equal(projection.stages.every((stage) => stage.canonical === false), true);
  const core = projection.stages.find((stage) => stage.id === 'core_transit_projection');
  assert.equal(core?.metadata?.routingAuthority, false);
  assert.equal(core?.metadata?.implementationState, 'presentation_only');
  const rbc = projection.stages.find((stage) => stage.id === 'rbc');
  assert.equal(rbc?.metadata?.routingAuthority, true);
});

test('keeps Prism and IDS mutually exclusive and represents lane 2 as a direct bypass', () => {
  const projection = createMessageFlowProjection(REPLAY_FIXTURE_EVENTS);
  const ids = projection.transactions.find((transaction) => transaction.traceId === 'trace:ids-shortfall-return');
  assert.equal(ids?.route.includes('prism'), false);
  assert.equal(ids?.route.includes('ids'), true);
  assert.equal(ids?.route[ids.route.length - 1], 'sender_return');
  assert.equal(ids?.visualRoute.includes('pim_out_sender_projection'), true);
  assert.equal(ids?.visualRoute.includes('pim_out_receiver_projection'), false);
  assert.equal(ids?.exchangeDirection, 'ai_to_human');
  const lane2 = projection.transactions.find((transaction) => transaction.traceId === 'trace:lane2-direct-ids');
  assert.deepEqual(lane2?.route, ['sender_ingress', 'pim_in', 'ids', 'pim_out', 'sender_return']);
  assert.equal(lane2?.visualRoute.includes('pim_out_sender_projection'), true);
  assert.equal(lane2?.route.includes('irg'), false);
  assert.equal(lane2?.route.includes('rbc'), false);
});

test('terminates pre-branch unavailable evidence at its declared bounded stage', () => {
  const projection = createMessageFlowProjection(REPLAY_FIXTURE_EVENTS);
  const unavailable = projection.transactions.find((transaction) => transaction.traceId === 'trace:upstream-unavailable');
  assert.deepEqual(unavailable?.route, ['sender_ingress', 'pim_in', 'unavailable']);
});

test('derives stage state from replay time without exposing future stages', () => {
  const early = createMessageFlowProjection(REPLAY_FIXTURE_EVENTS, undefined, Date.parse('2026-08-09T18:00:05.000Z'));
  assert.equal(early.stages.find((stage) => stage.id === 'pim_in')?.state, 'active');
  assert.equal(early.stages.find((stage) => stage.id === 'irg')?.state, 'idle');
  const middle = createMessageFlowProjection(REPLAY_FIXTURE_EVENTS, undefined, Date.parse('2026-08-09T18:00:11.000Z'));
  assert.equal(middle.stages.find((stage) => stage.id === 'rbc')?.state, 'active');
  assert.equal(middle.stages.find((stage) => stage.id === 'prism')?.state, 'idle');
  const late = createMessageFlowProjection(REPLAY_FIXTURE_EVENTS, undefined, Date.parse('2026-08-09T18:00:17.000Z'));
  assert.equal(late.stages.find((stage) => stage.id === 'receiver_delivery')?.state, 'active');
  assert.deepEqual(
    createMessageFlowProjection(REPLAY_FIXTURE_EVENTS, undefined, Date.parse('2026-08-09T18:00:11.000Z')),
    middle,
  );
});

test('keeps role endpoints inside the unobscured desktop composition', () => {
  for (const stage of ['sender_ingress', 'sender_return', 'receiver_delivery'] as const) {
    assert.ok(Math.abs(MESSAGE_FLOW_STAGE_POSITIONS[stage][0]) <= 6.1);
  }
  assert.ok(MESSAGE_FLOW_STAGE_POSITIONS.receiver_delivery[1] > 0);
  assert.ok(MESSAGE_FLOW_STAGE_POSITIONS.sender_return[1] < 0);
});
