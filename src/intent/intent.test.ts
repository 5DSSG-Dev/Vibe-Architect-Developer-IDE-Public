import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  GestureKind,
  IntentEnvelope,
  IntentResolution,
  DispatchDecision,
  DispatchOutcome,
} from './contracts.js';
import {
  GESTURE_ACTION_CLASS_MAP,
  GESTURE_DISPATCH_ROUTES,
  GESTURE_MUTATION_TARGETS,
  GESTURE_KIND_ORDER,
} from './contracts.js';
import type { ActionClass, IdentityRecord, IdentityProjectionContext } from '../identity/contracts.js';
import { ENVELOPE_PROFILES } from '../identity/contracts.js';
import { projectIdentitySurface } from '../identity/surface.js';
import { normalizeGesture, classifyGestureAction } from './normalize.js';
import type { GestureInput } from './normalize.js';
import { resolveIntent } from './resolve.js';
import { dispatchIntent, processGestureIntent } from './dispatch.js';

function makeRecord(id: string, domain: IdentityRecord['domain'], content: string): IdentityRecord {
  return {
    recordId: id,
    domain,
    content,
    priority: 1,
    version: '1.0.0',
    hash: `hash-${id}`,
    evidenceRefs: [{ sourceId: 'src-1', sourceType: 'test', hash: 'eh-1', retrievedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeFullRecords(): IdentityRecord[] {
  return [
    makeRecord('r1', 'foundational_commitments', 'commitment-alpha'),
    makeRecord('r2', 'sovereignty_consent', 'consent-alpha'),
    makeRecord('r3', 'authority_limitations', 'limitation-alpha'),
    makeRecord('r4', 'active_tensions', 'tension-alpha'),
    makeRecord('r5', 'continuity', 'continuity-alpha'),
    makeRecord('r6', 'capability_boundaries', 'capability-alpha'),
    makeRecord('r7', 'relational_history', 'relation-alpha'),
    makeRecord('r8', 'affect_context', 'affect-alpha'),
  ];
}

function makeContext(action: ActionClass): IdentityProjectionContext {
  return {
    activeIntent: 'test-intent',
    currentRelation: null,
    participants: [],
    proposedAction: action,
    affectedCapabilities: [],
    boundaryProximity: 0,
    affectPressure: 0,
    priorShortfalls: [],
  };
}

function makeGestureInput(gesture: GestureKind, params?: Record<string, unknown>): GestureInput {
  return {
    gesture,
    sourceEntityId: 'source-entity-1',
    targetEntityId: 'target-entity-1',
    parameters: params,
  };
}

describe('P3.1 — Gesture Classification Maps', () => {
  it('covers all gesture kinds in GESTURE_KIND_ORDER', () => {
    assert.equal(GESTURE_KIND_ORDER.length, 10);
    const allGestures: GestureKind[] = [
      'dock_item', 'undock_item', 'tether_satellite', 'untether_satellite',
      'mesh_connect', 'mesh_disconnect', 'portal_place', 'portal_remove',
      'daemon_toggle', 'budget_adjust',
    ];
    for (const g of allGestures) {
      assert.ok(GESTURE_KIND_ORDER.includes(g), `${g} missing from GESTURE_KIND_ORDER`);
    }
  });

  it('maps connection gestures to consequential_mutation', () => {
    const connectionGestures: GestureKind[] = [
      'dock_item', 'undock_item', 'tether_satellite',
      'untether_satellite', 'mesh_connect', 'mesh_disconnect',
    ];
    for (const g of connectionGestures) {
      assert.equal(GESTURE_ACTION_CLASS_MAP[g], 'consequential_mutation', `${g} should be consequential_mutation`);
    }
  });

  it('maps boundary gestures to reversible_bounded', () => {
    const boundaryGestures: GestureKind[] = [
      'portal_place', 'portal_remove', 'daemon_toggle', 'budget_adjust',
    ];
    for (const g of boundaryGestures) {
      assert.equal(GESTURE_ACTION_CLASS_MAP[g], 'reversible_bounded', `${g} should be reversible_bounded`);
    }
  });

  it('routes connection gestures through construction', () => {
    const connectionGestures: GestureKind[] = [
      'dock_item', 'undock_item', 'tether_satellite',
      'untether_satellite', 'mesh_connect', 'mesh_disconnect',
    ];
    for (const g of connectionGestures) {
      assert.equal(GESTURE_DISPATCH_ROUTES[g], 'construction', `${g} should route via construction`);
    }
  });

  it('routes boundary gestures directly', () => {
    const boundaryGestures: GestureKind[] = [
      'portal_place', 'portal_remove', 'daemon_toggle', 'budget_adjust',
    ];
    for (const g of boundaryGestures) {
      assert.equal(GESTURE_DISPATCH_ROUTES[g], 'direct', `${g} should route directly`);
    }
  });

  it('assigns correct mutation targets', () => {
    assert.deepEqual(GESTURE_MUTATION_TARGETS['dock_item'], ['sockets', 'contracts']);
    assert.deepEqual(GESTURE_MUTATION_TARGETS['mesh_connect'], ['contracts']);
    assert.deepEqual(GESTURE_MUTATION_TARGETS['portal_place'], ['portals']);
    assert.deepEqual(GESTURE_MUTATION_TARGETS['daemon_toggle'], ['daemons']);
    assert.deepEqual(GESTURE_MUTATION_TARGETS['budget_adjust'], ['budget']);
  });

  it('every gesture kind has entries in all three maps', () => {
    for (const g of GESTURE_KIND_ORDER) {
      assert.ok(g in GESTURE_ACTION_CLASS_MAP, `${g} missing from GESTURE_ACTION_CLASS_MAP`);
      assert.ok(g in GESTURE_DISPATCH_ROUTES, `${g} missing from GESTURE_DISPATCH_ROUTES`);
      assert.ok(g in GESTURE_MUTATION_TARGETS, `${g} missing from GESTURE_MUTATION_TARGETS`);
    }
  });
});

describe('P3.2 — Intent Normalization', () => {
  it('produces a well-formed IntentEnvelope from a gesture input', () => {
    const input = makeGestureInput('dock_item', { socketId: 'socket-alpha' });
    const envelope = normalizeGesture(input);

    assert.ok(envelope.intentId.startsWith('intent-'));
    assert.ok(envelope.timestamp);
    assert.equal(envelope.gesture, 'dock_item');
    assert.equal(envelope.actionClass, 'consequential_mutation');
    assert.equal(envelope.sourceEntityId, 'source-entity-1');
    assert.equal(envelope.targetEntityId, 'target-entity-1');
    assert.deepEqual(envelope.mutationTargets, ['sockets', 'contracts']);
    assert.deepEqual(envelope.parameters, { socketId: 'socket-alpha' });
    assert.ok(envelope.hash.length > 0);
  });

  it('assigns unique intent IDs', () => {
    const e1 = normalizeGesture(makeGestureInput('dock_item'));
    const e2 = normalizeGesture(makeGestureInput('dock_item'));
    assert.notEqual(e1.intentId, e2.intentId);
  });

  it('defaults parameters to empty object when not provided', () => {
    const envelope = normalizeGesture({
      gesture: 'portal_place',
      sourceEntityId: 'src',
      targetEntityId: 'tgt',
    });
    assert.deepEqual(envelope.parameters, {});
  });

  it('classifyGestureAction returns the correct action class', () => {
    assert.equal(classifyGestureAction('dock_item'), 'consequential_mutation');
    assert.equal(classifyGestureAction('portal_place'), 'reversible_bounded');
    assert.equal(classifyGestureAction('daemon_toggle'), 'reversible_bounded');
    assert.equal(classifyGestureAction('mesh_connect'), 'consequential_mutation');
  });

  it('produces deterministic hashes for identical inputs', () => {
    const input: GestureInput = {
      gesture: 'tether_satellite',
      sourceEntityId: 'sat-01',
      targetEntityId: 'orb-01',
      parameters: { orbSlot: 3 },
    };
    const e1 = normalizeGesture(input);
    const e2 = normalizeGesture(input);
    assert.equal(e1.hash, e2.hash);
  });

  it('produces different hashes for different gestures', () => {
    const e1 = normalizeGesture(makeGestureInput('dock_item'));
    const e2 = normalizeGesture(makeGestureInput('undock_item'));
    assert.notEqual(e1.hash, e2.hash);
  });

  it('normalizes all gesture kinds without error', () => {
    for (const g of GESTURE_KIND_ORDER) {
      const envelope = normalizeGesture(makeGestureInput(g));
      assert.equal(envelope.gesture, g);
      assert.ok(envelope.intentId);
      assert.ok(envelope.hash);
    }
  });
});

describe('P3.3 — Intent Resolution', () => {
  it('permits consequential_mutation with full identity surface', () => {
    const records = makeFullRecords();
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const resolution = resolveIntent(envelope, surface);

    assert.equal(resolution.verdict, 'permitted');
    assert.ok(resolution.permission.permitted);
    assert.ok(resolution.reason.includes('dock_item'));
    assert.ok(resolution.resolutionId.startsWith('resolution-'));
    assert.equal(resolution.intentRef, envelope.intentId);
    assert.ok(resolution.hash.length > 0);
  });

  it('denies consequential_mutation with degraded identity surface', () => {
    const records = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const resolution = resolveIntent(envelope, surface);

    assert.equal(resolution.verdict, 'denied');
    assert.ok(!resolution.permission.permitted);
    assert.ok(resolution.reason.includes('denied'));
  });

  it('defers when identity surface is null', () => {
    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const resolution = resolveIntent(envelope, null);

    assert.equal(resolution.verdict, 'deferred');
    assert.equal(resolution.identityCoverageState, 'IDENTITY_UNAVAILABLE');
    assert.ok(resolution.reason.includes('deferred'));
  });

  it('permits reversible_bounded with minimum kernel surface', () => {
    const records = [
      makeRecord('r1', 'foundational_commitments', 'commitment'),
      makeRecord('r2', 'sovereignty_consent', 'consent'),
      makeRecord('r3', 'authority_limitations', 'limitations'),
    ];
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('portal_place'));
    const resolution = resolveIntent(envelope, surface);

    assert.equal(resolution.verdict, 'permitted');
    assert.ok(resolution.permission.permitted);
  });

  it('denies reversible_bounded with insufficient identity', () => {
    const records = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('portal_place'));
    const resolution = resolveIntent(envelope, surface);

    assert.equal(resolution.verdict, 'denied');
  });

  it('produces unique resolution IDs', () => {
    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const r1 = resolveIntent(envelope, null);
    const r2 = resolveIntent(envelope, null);
    assert.notEqual(r1.resolutionId, r2.resolutionId);
  });
});

describe('P3.4 — Dispatch Routing', () => {
  it('dispatches permitted construction-route gesture as executed', () => {
    const records = makeFullRecords();
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const outcome = dispatchIntent(envelope, surface);

    assert.equal(outcome.status, 'executed');
    assert.equal(outcome.decision.route, 'construction');
    assert.ok(outcome.decision.approved);
    assert.ok(outcome.mutationApplied);
    assert.equal(outcome.failureDetail, null);
    assert.equal(outcome.intentRef, envelope.intentId);
  });

  it('dispatches permitted direct-route gesture as executed', () => {
    const records = [
      makeRecord('r1', 'foundational_commitments', 'commitment'),
      makeRecord('r2', 'sovereignty_consent', 'consent'),
      makeRecord('r3', 'authority_limitations', 'limitations'),
    ];
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('daemon_toggle', { daemon: 'conductor' }));
    const outcome = dispatchIntent(envelope, surface);

    assert.equal(outcome.status, 'executed');
    assert.equal(outcome.decision.route, 'direct');
    assert.ok(outcome.decision.approved);
    assert.ok(outcome.mutationApplied);
  });

  it('blocks denied gesture', () => {
    const records = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const outcome = dispatchIntent(envelope, surface);

    assert.equal(outcome.status, 'blocked');
    assert.ok(!outcome.decision.approved);
    assert.ok(!outcome.mutationApplied);
    assert.ok(outcome.failureDetail);
  });

  it('defers gesture when identity unavailable', () => {
    const envelope = normalizeGesture(makeGestureInput('mesh_connect'));
    const outcome = dispatchIntent(envelope, null);

    assert.equal(outcome.status, 'deferred');
    assert.equal(outcome.decision.route, 'deferred');
    assert.ok(!outcome.decision.approved);
    assert.ok(!outcome.mutationApplied);
    assert.equal(outcome.failureDetail, null);
  });

  it('processGestureIntent produces same result as dispatchIntent', () => {
    const records = makeFullRecords();
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('tether_satellite'));
    const outcome1 = dispatchIntent(envelope, surface);
    const outcome2 = processGestureIntent(envelope, surface);

    assert.equal(outcome1.status, outcome2.status);
    assert.equal(outcome1.decision.route, outcome2.decision.route);
    assert.equal(outcome1.mutationApplied, outcome2.mutationApplied);
  });

  it('produces unique outcome and decision IDs', () => {
    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const o1 = dispatchIntent(envelope, null);
    const o2 = dispatchIntent(envelope, null);
    assert.notEqual(o1.outcomeId, o2.outcomeId);
    assert.notEqual(o1.decision.decisionId, o2.decision.decisionId);
  });
});

describe('P3.5 — Full Pipeline Integration', () => {
  it('dock_item: normalize → resolve → dispatch with full surface', () => {
    const records = makeFullRecords();
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture({
      gesture: 'dock_item',
      sourceEntityId: 'ing-01',
      targetEntityId: 'socket-beta',
      parameters: { socketId: 'socket-beta' },
    });

    assert.equal(envelope.actionClass, 'consequential_mutation');
    assert.deepEqual(envelope.mutationTargets, ['sockets', 'contracts']);

    const resolution = resolveIntent(envelope, surface);
    assert.equal(resolution.verdict, 'permitted');

    const outcome = dispatchIntent(envelope, surface);
    assert.equal(outcome.status, 'executed');
    assert.equal(outcome.decision.route, 'construction');
    assert.ok(outcome.mutationApplied);
    assert.equal(outcome.resolution.verdict, 'permitted');
  });

  it('portal_place: normalize → resolve → dispatch with bounded surface', () => {
    const records = [
      makeRecord('r1', 'foundational_commitments', 'commitment'),
      makeRecord('r2', 'sovereignty_consent', 'consent'),
      makeRecord('r3', 'authority_limitations', 'limitations'),
    ];
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture({
      gesture: 'portal_place',
      sourceEntityId: 'portal-new',
      targetEntityId: 'boundary-slot-1',
      parameters: { angleDeg: 112.5 },
    });

    assert.equal(envelope.actionClass, 'reversible_bounded');
    assert.deepEqual(envelope.mutationTargets, ['portals']);

    const outcome = dispatchIntent(envelope, surface);
    assert.equal(outcome.status, 'executed');
    assert.equal(outcome.decision.route, 'direct');
  });

  it('mesh_connect blocked with degraded identity', () => {
    const records = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture({
      gesture: 'mesh_connect',
      sourceEntityId: 'sat-01',
      targetEntityId: 'sat-02',
      parameters: { services: ['telemetry_read'] },
    });

    const outcome = dispatchIntent(envelope, surface);
    assert.equal(outcome.status, 'blocked');
    assert.ok(!outcome.mutationApplied);
    assert.ok(outcome.failureDetail);
    assert.equal(outcome.decision.route, 'construction');
  });

  it('undock_item deferred without identity surface', () => {
    const envelope = normalizeGesture({
      gesture: 'undock_item',
      sourceEntityId: 'ing-01',
      targetEntityId: 'socket-gamma',
    });

    const outcome = dispatchIntent(envelope, null);
    assert.equal(outcome.status, 'deferred');
    assert.equal(outcome.decision.route, 'deferred');
    assert.equal(outcome.resolution.identityCoverageState, 'IDENTITY_UNAVAILABLE');
  });

  it('all outcome objects contain valid hash references', () => {
    const records = makeFullRecords();
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const outcome = dispatchIntent(envelope, surface);

    assert.ok(envelope.hash.length === 64);
    assert.ok(outcome.resolution.hash.length === 64);
    assert.ok(outcome.decision.hash.length === 64);
    assert.ok(outcome.hash.length === 64);
  });

  it('outcome references chain correctly through the pipeline', () => {
    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const outcome = dispatchIntent(envelope, null);

    assert.equal(outcome.intentRef, envelope.intentId);
    assert.equal(outcome.resolution.intentRef, envelope.intentId);
    assert.equal(outcome.decision.intentRef, envelope.intentId);
    assert.equal(outcome.decision.resolutionRef, outcome.resolution.resolutionId);
  });
});

describe('P3.6 — Edge Cases', () => {
  it('handles empty parameters gracefully', () => {
    const envelope = normalizeGesture({
      gesture: 'budget_adjust',
      sourceEntityId: 'core',
      targetEntityId: 'budget',
    });
    assert.deepEqual(envelope.parameters, {});
    assert.equal(envelope.gesture, 'budget_adjust');
  });

  it('different source/target entities produce different hashes', () => {
    const e1 = normalizeGesture({
      gesture: 'dock_item',
      sourceEntityId: 'item-A',
      targetEntityId: 'socket-1',
    });
    const e2 = normalizeGesture({
      gesture: 'dock_item',
      sourceEntityId: 'item-B',
      targetEntityId: 'socket-1',
    });
    assert.notEqual(e1.hash, e2.hash);
  });

  it('same gesture with different parameters produces different hashes', () => {
    const e1 = normalizeGesture({
      gesture: 'portal_place',
      sourceEntityId: 'portal-1',
      targetEntityId: 'slot-1',
      parameters: { angleDeg: 67.5 },
    });
    const e2 = normalizeGesture({
      gesture: 'portal_place',
      sourceEntityId: 'portal-1',
      targetEntityId: 'slot-1',
      parameters: { angleDeg: 112.5 },
    });
    assert.notEqual(e1.hash, e2.hash);
  });

  it('resolution captures identity coverage state accurately', () => {
    const records = makeFullRecords();
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);
    const envelope = normalizeGesture(makeGestureInput('dock_item'));

    const resolution = resolveIntent(envelope, surface);
    assert.ok(
      resolution.identityCoverageState === 'FULL_SURFACE' ||
      resolution.identityCoverageState === 'SUFFICIENT_SURFACE',
    );
  });

  it('blocked outcome includes failure detail from resolution', () => {
    const records = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
    const context = makeContext('consequential_mutation');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('undock_item'));
    const outcome = dispatchIntent(envelope, surface);

    assert.equal(outcome.status, 'blocked');
    assert.ok(outcome.failureDetail);
    assert.ok(outcome.failureDetail!.includes('denied'));
  });

  it('deferred outcome has null failure detail', () => {
    const envelope = normalizeGesture(makeGestureInput('tether_satellite'));
    const outcome = dispatchIntent(envelope, null);

    assert.equal(outcome.status, 'deferred');
    assert.equal(outcome.failureDetail, null);
  });

  it('consequential gestures denied at MINIMUM_KERNEL coverage', () => {
    const records = [
      makeRecord('r1', 'foundational_commitments', 'commitment'),
      makeRecord('r2', 'sovereignty_consent', 'consent'),
      makeRecord('r3', 'authority_limitations', 'limitations'),
      makeRecord('r4', 'active_tensions', 'tension'),
    ];
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const envelope = normalizeGesture(makeGestureInput('dock_item'));
    const outcome = dispatchIntent(envelope, surface);

    assert.equal(outcome.status, 'blocked');
    assert.ok(!outcome.mutationApplied);
  });
});
