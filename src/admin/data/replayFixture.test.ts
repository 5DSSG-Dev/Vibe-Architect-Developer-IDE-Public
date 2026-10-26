// @ts-nocheck -- executed directly with Node's TypeScript stripping; Node types are not a project dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { operationProgressAt, stableVisualSeed } from '../domain/determinism.ts';
import { REPLAY_FIXTURE_DURATION_MS, REPLAY_FIXTURE_EVENTS } from './replayFixture.ts';

test('compact fixture duration matches its deterministic service-flow evidence', () => {
  const span = Date.parse(REPLAY_FIXTURE_EVENTS.at(-1).observedAt)
    - Date.parse(REPLAY_FIXTURE_EVENTS[0].observedAt);
  assert.equal(REPLAY_FIXTURE_DURATION_MS, 54_000);
  assert.equal(span, 52_000);
  assert.equal(REPLAY_FIXTURE_EVENTS.length, 24);
  assert.equal(REPLAY_FIXTURE_EVENTS.some((event) => event.status === 'contained'), true);
  assert.equal(REPLAY_FIXTURE_EVENTS.some((event) => event.status === 'degraded'), true);
  assert.equal(REPLAY_FIXTURE_EVENTS.some((event) => event.componentRef.kind === 'portal'), true);
  assert.deepEqual([...new Set(REPLAY_FIXTURE_EVENTS.map((event) => event.messageFlow?.traceId))].sort(), [
    'trace:ids-shortfall-return',
    'trace:lane2-direct-ids',
    'trace:prism-delivery',
    'trace:upstream-unavailable',
  ]);
});

test('visual seeds and progress depend only on stable IDs and replay time', () => {
  const event = REPLAY_FIXTURE_EVENTS[0];
  assert.deepEqual(stableVisualSeed(event.eventId), stableVisualSeed(event.eventId));
  assert.equal(
    operationProgressAt(Date.parse(event.observedAt) + 500, event, 2_000),
    operationProgressAt(Date.parse(event.observedAt) + 500, event, 2_000),
  );
});
