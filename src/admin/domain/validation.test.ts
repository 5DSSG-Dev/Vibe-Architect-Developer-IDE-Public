// @ts-nocheck -- executed directly with Node's TypeScript stripping; Node types are not a project dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REPLAY_FIXTURE_EVENTS, REPLAY_FIXTURE_SNAPSHOT } from '../data/replayFixture.ts';
import {
  AdminRuntimeValidationError,
  validateOperationEvent,
  validatePodTopologySnapshot,
} from './validation.ts';

test('accepts the deterministic topology and operation contracts at runtime', () => {
  const snapshot = validatePodTopologySnapshot(structuredClone(REPLAY_FIXTURE_SNAPSHOT));
  for (const event of REPLAY_FIXTURE_EVENTS) {
    assert.equal(validateOperationEvent(structuredClone(event), snapshot).eventId, event.eventId);
  }
});

test('rejects invented canonical Portal state and mismatched three-way attachments', () => {
  const portal = structuredClone(REPLAY_FIXTURE_SNAPSHOT);
  portal.portals[0].canonical = true;
  assert.throws(() => validatePodTopologySnapshot(portal), /Invalid operations snapshot/);

  const attachment = structuredClone(REPLAY_FIXTURE_SNAPSHOT);
  attachment.pod.orbAttachments[0].umbilical_id = 'umbilical:validation';
  assert.throws(() => validatePodTopologySnapshot(attachment), /Invalid operations snapshot/);

  const version = structuredClone(REPLAY_FIXTURE_SNAPSHOT);
  version.pod.orbAttachments[0].orb_version_pin = '9.9.9';
  assert.throws(() => validatePodTopologySnapshot(version), /Invalid operations snapshot/);
});

test('rejects malformed collection entries and non-allowlisted evidence fields without a TypeError', () => {
  const malformed = structuredClone(REPLAY_FIXTURE_SNAPSHOT);
  malformed.orbs = [null];
  assert.throws(
    () => validatePodTopologySnapshot(malformed),
    (error) => error instanceof AdminRuntimeValidationError && error.issues.some((issue) => issue.includes('entries must be objects')),
  );

  const rawEvidence = structuredClone(REPLAY_FIXTURE_SNAPSHOT);
  rawEvidence.pod.evidence.prompt = 'must not enter browser state';
  assert.throws(
    () => validatePodTopologySnapshot(rawEvidence),
    (error) => error instanceof AdminRuntimeValidationError && error.issues.some((issue) => issue.includes('not browser-allowlisted')),
  );
});

test('rejects malformed times, enums, IDs, membership, and routeRefs disagreement', () => {
  const malformed = structuredClone(REPLAY_FIXTURE_EVENTS[0]);
  malformed.observedAt = 'not-a-time';
  malformed.phase = 'invented';
  malformed.eventId = 'bad id';
  assert.throws(
    () => validateOperationEvent(malformed, REPLAY_FIXTURE_SNAPSHOT),
    (error) => error instanceof AdminRuntimeValidationError && error.issues.length >= 3,
  );

  const foreign = structuredClone(REPLAY_FIXTURE_EVENTS[0]);
  foreign.eventId = 'fixture-event-foreign';
  foreign.componentRef.id = 'orb:foreign';
  foreign.routeRefs = [...foreign.routeRefs.slice(1), foreign.routeRefs[0]];
  assert.throws(
    () => validateOperationEvent(foreign, REPLAY_FIXTURE_SNAPSHOT),
    (error) => error instanceof AdminRuntimeValidationError
      && error.issues.some((issue) => issue.includes('active Pod topology'))
      && error.issues.some((issue) => issue.includes('exactly preserve')),
  );
});

test('rejects a Satellite routed directly from CORE and preserves the invalid route evidence', () => {
  const invalid = structuredClone(REPLAY_FIXTURE_EVENTS[4]);
  invalid.route.orderedRefs = [
    { kind: 'pod', id: REPLAY_FIXTURE_SNAPSHOT.pod.pod_id },
    { kind: 'satellite', id: REPLAY_FIXTURE_SNAPSHOT.satellites[0].satellite_id },
  ];
  invalid.routeRefs = invalid.route.orderedRefs.map((reference) => reference.id);
  assert.throws(
    () => validateOperationEvent(invalid, REPLAY_FIXTURE_SNAPSHOT),
    (error) => error instanceof AdminRuntimeValidationError
      && error.issues.some((issue) => issue.includes('transition'))
      && JSON.stringify(error.invalidEvent.routeRefs) === JSON.stringify(invalid.routeRefs),
  );
});

test('accepts sanitized message-flow evidence and rejects raw service details', () => {
  const valid = structuredClone(REPLAY_FIXTURE_EVENTS[0]);
  assert.equal(validateOperationEvent(valid, REPLAY_FIXTURE_SNAPSHOT).messageFlow?.canonical, false);

  const raw = structuredClone(REPLAY_FIXTURE_EVENTS[0]);
  raw.messageFlow.rawMessage = 'must not enter browser state';
  assert.throws(
    () => validateOperationEvent(raw, REPLAY_FIXTURE_SNAPSHOT),
    (error) => error instanceof AdminRuntimeValidationError
      && error.issues.some((issue) => issue.includes('sanitized service-flow contract')),
  );
});
