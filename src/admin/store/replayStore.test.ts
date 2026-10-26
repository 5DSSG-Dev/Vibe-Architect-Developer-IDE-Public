// @ts-nocheck -- executed directly with Node's TypeScript stripping; Node types are not a project dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REPLAY_FIXTURE_EVENTS, REPLAY_FIXTURE_SNAPSHOT } from '../data/replayFixture.ts';
import { createInitialReplayState, replayReducer } from './replayStore.ts';
import { selectComponentStatus, selectNeedsResynchronization } from './selectors.ts';

function loadedState() {
  return replayReducer(createInitialReplayState(), {
    type: 'LOAD_SNAPSHOT',
    snapshot: REPLAY_FIXTURE_SNAPSHOT,
  });
}

test('detects gaps, out-of-order recovery, and duplicates without duplicating state', () => {
  let state = loadedState();
  state = replayReducer(state, { type: 'INGEST_EVENT', event: REPLAY_FIXTURE_EVENTS[0] });
  state = replayReducer(state, { type: 'INGEST_EVENT', event: REPLAY_FIXTURE_EVENTS[2] });
  assert.equal(selectNeedsResynchronization(state), true);
  assert.deepEqual(state.missingSequenceRanges, [{ start: 2, end: 2 }]);
  assert.equal(state.missingSequenceCount, 1);
  state = replayReducer(state, { type: 'INGEST_EVENT', event: REPLAY_FIXTURE_EVENTS[1] });
  assert.equal(selectNeedsResynchronization(state), false);
  assert.equal(state.anomalies.some((anomaly) => anomaly.kind === 'out_of_order'), true);
  state = replayReducer(state, { type: 'INGEST_EVENT', event: REPLAY_FIXTURE_EVENTS[1] });
  assert.equal(state.events.length, 3);
  assert.equal(state.anomalies.at(-1).kind, 'duplicate_event');
});

test('rejects pathological sequence jumps without allocating a giant missing array', () => {
  let state = replayReducer(loadedState(), { type: 'INGEST_EVENT', event: REPLAY_FIXTURE_EVENTS[0] });
  const jumped = {
    ...REPLAY_FIXTURE_EVENTS[1],
    eventId: 'fixture-event-jump',
    sequence: 9_000_000,
  };
  state = replayReducer(state, { type: 'INGEST_EVENT', event: jumped });
  assert.equal(state.events.length, 1);
  assert.equal(state.missingSequenceRanges.length, 0);
  assert.equal(state.anomalies.at(-1).kind, 'invalid_event');
  assert.match(state.anomalies.at(-1).evidence.issues[0], /sequence jump/);
});

test('preserves invalid route evidence and does not shorten it into a valid route', () => {
  const invalid = structuredClone(REPLAY_FIXTURE_EVENTS[0]);
  invalid.eventId = 'fixture-event-invalid-route';
  invalid.sequence = 18;
  invalid.route.orderedRefs = [
    { kind: 'pod', id: REPLAY_FIXTURE_SNAPSHOT.pod.pod_id },
    { kind: 'satellite', id: REPLAY_FIXTURE_SNAPSHOT.satellites[0].satellite_id },
  ];
  invalid.routeRefs = invalid.route.orderedRefs.map((reference) => reference.id);
  let state = replayReducer(loadedState(), { type: 'INGEST_EVENT', event: invalid });
  assert.equal(state.events.length, 0);
  assert.equal(state.anomalies[0].kind, 'invalid_event');
  assert.deepEqual(state.anomalies[0].evidence.routeRefs, invalid.routeRefs);
  assert.match(state.anomalies[0].evidence.issues.join(' '), /transition/);
});

test('loading a different Pod, schema, or source boundary resets replay state', () => {
  let state = replayReducer(loadedState(), { type: 'INGEST_EVENTS', events: REPLAY_FIXTURE_EVENTS });
  const changed = structuredClone(REPLAY_FIXTURE_SNAPSHOT);
  changed.sourceBoundary = 'live';
  changed.pod.status.sourceBoundary = 'live';
  changed.orbs.forEach((item) => { item.status.sourceBoundary = 'live'; });
  changed.umbilicals.forEach((item) => { item.status.sourceBoundary = 'live'; });
  changed.satellites.forEach((item) => { item.status.sourceBoundary = 'live'; });
  changed.portals.forEach((item) => { item.status.sourceBoundary = 'live'; });
  changed.portals.forEach((item) => { if (item.tender) item.tender.status.sourceBoundary = 'live'; });
  state = replayReducer(state, { type: 'LOAD_SNAPSHOT', snapshot: changed });
  assert.equal(state.events.length, 0);
  assert.equal(state.cursor, undefined);
  assert.equal(state.topology.sourceBoundary, 'live');
});

test('pause, seek, step, jump-to-live, and reset have explicit cursor behavior', () => {
  let state = replayReducer(loadedState(), { type: 'INGEST_EVENTS', events: REPLAY_FIXTURE_EVENTS });
  const cursor = state.cursor;
  state = replayReducer(state, { type: 'REWIND_REPLAY' });
  assert.equal(state.clock.playheadMs, state.clock.rangeStartMs);
  assert.equal(state.clock.followingLive, false);
  state = replayReducer(state, { type: 'STEP_EVENT', direction: 1 });
  assert.ok(state.clock.playheadMs > state.clock.rangeStartMs);
  state = replayReducer(state, { type: 'JUMP_TO_LIVE' });
  assert.equal(state.clock.playheadMs, state.clock.rangeEndMs);
  assert.deepEqual(state.cursor, cursor);
  state = replayReducer(state, { type: 'RESET_REPLAY' });
  assert.equal(state.events.length, 0);
  assert.equal(state.cursor, undefined);
  assert.equal(state.topology.pod.pod_id, REPLAY_FIXTURE_SNAPSHOT.pod.pod_id);
});

test('one replay clock steps backward and forward deterministically', () => {
  let state = replayReducer(loadedState(), { type: 'INGEST_EVENTS', events: REPLAY_FIXTURE_EVENTS });
  const eventTimes = [...new Set(REPLAY_FIXTURE_EVENTS.map((event) => Date.parse(event.observedAt)))].sort((a, b) => a - b);
  state = replayReducer(state, { type: 'SEEK', replayTimeMs: eventTimes[6] });
  state = replayReducer(state, { type: 'STEP_EVENT', direction: -1 });
  assert.equal(state.clock.playheadMs, eventTimes[5]);
  assert.equal(state.clock.paused, true);
  assert.equal(state.clock.followingLive, false);
  state = replayReducer(state, { type: 'STEP_EVENT', direction: 1 });
  assert.equal(state.clock.playheadMs, eventTimes[6]);
});

test('following-live TICK advances the same authoritative replay clock', () => {
  let state = replayReducer(loadedState(), { type: 'INGEST_EVENT', event: REPLAY_FIXTURE_EVENTS[0] });
  state = replayReducer(state, { type: 'JUMP_TO_LIVE' });
  const before = state.clock.playheadMs;
  state = replayReducer(state, { type: 'TICK', elapsedWallMs: 250 });
  assert.equal(state.clock.playheadMs, before + 250);
  state = replayReducer(state, { type: 'PAUSE_VIEW' });
  assert.equal(state.clock.playheadMs, state.clock.rangeEndMs);
  assert.equal(state.clock.followingLive, false);
});

test('IDS shortfall remains localized until sender-return evidence is observed', () => {
  const idsShortfallIndex = REPLAY_FIXTURE_EVENTS.findIndex((event) => (
    event.messageFlow?.traceId === 'trace:ids-shortfall-return' && event.messageFlow.stage === 'ids'
  ));
  let state = replayReducer(loadedState(), { type: 'INGEST_EVENTS', events: REPLAY_FIXTURE_EVENTS.slice(0, idsShortfallIndex + 1) });
  const idsOrb = REPLAY_FIXTURE_SNAPSHOT.orbs.find((orb) => orb.orb_id === 'orb:validation');
  assert.ok(idsOrb);
  const idsStatus = selectComponentStatus(state, 'orb', idsOrb.orb_id, idsOrb.status);
  const coreStatus = selectComponentStatus(state, 'pod', state.topology.pod.pod_id, state.topology.pod.status);
  assert.equal(idsStatus.health, 'contained');
  assert.equal(idsStatus.activity, 'fell_short');
  assert.equal(coreStatus.health, 'nominal');
  assert.equal(coreStatus.activity, 'running');
});
