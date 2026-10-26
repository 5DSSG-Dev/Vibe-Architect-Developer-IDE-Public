import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  PortalState,
  TenderState,
  ExternalEndpoint,
  PortalDescriptor,
  TenderSpec,
} from './contracts.js';
import {
  PORTAL_STATE_ORDER,
  TENDER_STATE_ORDER,
  VALID_PORTAL_TRANSITIONS,
  VALID_TENDER_TRANSITIONS,
} from './contracts.js';
import type { IdentityRecord, IdentityProjectionContext, ActionClass } from '../identity/contracts.js';
import { ENVELOPE_PROFILES } from '../identity/contracts.js';
import { projectIdentitySurface, checkActionPermission } from '../identity/surface.js';
import {
  createBoundaryPolicy,
  evaluateBoundaryPolicy,
} from './boundary.js';
import {
  isValidPortalTransition,
  isValidTenderTransition,
  transitionPortal,
  transitionTender,
} from './lifecycle.js';
import { createTender, createEndpoint } from './tender.js';
import {
  createPortalDescriptor,
  openPortal,
  closePortal,
  suspendPortal,
  resumePortal,
} from './operations.js';

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

function makeBoundedRecords(): IdentityRecord[] {
  return [
    makeRecord('r1', 'foundational_commitments', 'commitment'),
    makeRecord('r2', 'sovereignty_consent', 'consent'),
    makeRecord('r3', 'authority_limitations', 'limitations'),
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

function makeEndpoint(overrides?: Partial<ExternalEndpoint>): ExternalEndpoint {
  return createEndpoint(
    overrides?.serviceKind ?? 'api',
    overrides?.protocol ?? 'https',
    overrides?.address ?? 'https://api.example.com',
    overrides?.flowDirection ?? 'bidirectional',
    overrides?.capabilities ?? ['read', 'write'],
  );
}

function makePortal(name?: string, angleDeg?: number): PortalDescriptor {
  return createPortalDescriptor(name ?? 'Test Portal', angleDeg ?? 67.5);
}

describe('P4.1 — Portal & Tender State Definitions', () => {
  it('defines 5 portal states in order', () => {
    assert.equal(PORTAL_STATE_ORDER.length, 5);
    assert.deepEqual(PORTAL_STATE_ORDER, ['dormant', 'negotiating', 'active', 'suspended', 'severed']);
  });

  it('defines 5 tender states in order', () => {
    assert.equal(TENDER_STATE_ORDER.length, 5);
    assert.deepEqual(TENDER_STATE_ORDER, ['initializing', 'ready', 'serving', 'draining', 'terminated']);
  });

  it('every portal state has valid transitions defined', () => {
    for (const state of PORTAL_STATE_ORDER) {
      assert.ok(state in VALID_PORTAL_TRANSITIONS, `${state} missing from VALID_PORTAL_TRANSITIONS`);
      assert.ok(Array.isArray(VALID_PORTAL_TRANSITIONS[state]));
    }
  });

  it('every tender state has valid transitions defined', () => {
    for (const state of TENDER_STATE_ORDER) {
      assert.ok(state in VALID_TENDER_TRANSITIONS, `${state} missing from VALID_TENDER_TRANSITIONS`);
      assert.ok(Array.isArray(VALID_TENDER_TRANSITIONS[state]));
    }
  });

  it('dormant portal can only negotiate', () => {
    assert.deepEqual(VALID_PORTAL_TRANSITIONS['dormant'], ['negotiating']);
  });

  it('active portal can suspend or sever', () => {
    assert.deepEqual(VALID_PORTAL_TRANSITIONS['active'], ['suspended', 'severed']);
  });

  it('severed portal can only return to dormant', () => {
    assert.deepEqual(VALID_PORTAL_TRANSITIONS['severed'], ['dormant']);
  });

  it('suspended portal can resume to active or sever', () => {
    assert.deepEqual(VALID_PORTAL_TRANSITIONS['suspended'], ['active', 'severed']);
  });
});

describe('P4.2 — Boundary Policy', () => {
  it('creates policy with defaults', () => {
    const policy = createBoundaryPolicy();
    assert.ok(policy.policyId.startsWith('policy-'));
    assert.deepEqual(policy.allowedFlowDirections, ['inbound', 'outbound', 'bidirectional']);
    assert.deepEqual(policy.allowedServiceKinds, ['api', 'stream', 'storage', 'compute', 'monitor']);
    assert.equal(policy.maxPayloadBytes, 1048576);
    assert.ok(policy.requiresIdentityGate);
    assert.ok(policy.hash.length === 64);
  });

  it('creates policy with custom config', () => {
    const policy = createBoundaryPolicy({
      allowedFlowDirections: ['inbound'],
      allowedServiceKinds: ['api'],
      maxPayloadBytes: 512,
      requiresIdentityGate: false,
    });
    assert.deepEqual(policy.allowedFlowDirections, ['inbound']);
    assert.deepEqual(policy.allowedServiceKinds, ['api']);
    assert.equal(policy.maxPayloadBytes, 512);
    assert.ok(!policy.requiresIdentityGate);
  });

  it('evaluates boundary policy — permitted endpoint', () => {
    const policy = createBoundaryPolicy();
    const endpoint = makeEndpoint();
    const result = evaluateBoundaryPolicy(policy, endpoint, 1024);
    assert.ok(result.permitted);
    assert.equal(result.violations.length, 0);
  });

  it('evaluates boundary policy — disallowed flow direction', () => {
    const policy = createBoundaryPolicy({ allowedFlowDirections: ['inbound'] });
    const endpoint = makeEndpoint({ flowDirection: 'outbound' });
    const result = evaluateBoundaryPolicy(policy, endpoint, 0);
    assert.ok(!result.permitted);
    assert.equal(result.violations.length, 1);
    assert.ok(result.violations[0].includes('Flow direction'));
  });

  it('evaluates boundary policy — disallowed service kind', () => {
    const policy = createBoundaryPolicy({ allowedServiceKinds: ['api'] });
    const endpoint = makeEndpoint({ serviceKind: 'stream' });
    const result = evaluateBoundaryPolicy(policy, endpoint, 0);
    assert.ok(!result.permitted);
    assert.ok(result.violations[0].includes('Service kind'));
  });

  it('evaluates boundary policy — payload too large', () => {
    const policy = createBoundaryPolicy({ maxPayloadBytes: 100 });
    const endpoint = makeEndpoint();
    const result = evaluateBoundaryPolicy(policy, endpoint, 200);
    assert.ok(!result.permitted);
    assert.ok(result.violations[0].includes('Payload'));
  });

  it('evaluates boundary policy — multiple violations', () => {
    const policy = createBoundaryPolicy({
      allowedFlowDirections: ['inbound'],
      allowedServiceKinds: ['storage'],
      maxPayloadBytes: 10,
    });
    const endpoint = makeEndpoint({ flowDirection: 'outbound', serviceKind: 'api' });
    const result = evaluateBoundaryPolicy(policy, endpoint, 100);
    assert.ok(!result.permitted);
    assert.equal(result.violations.length, 3);
  });
});

describe('P4.3 — Portal Lifecycle State Machine', () => {
  it('validates correct portal transitions', () => {
    assert.ok(isValidPortalTransition('dormant', 'negotiating'));
    assert.ok(isValidPortalTransition('negotiating', 'active'));
    assert.ok(isValidPortalTransition('negotiating', 'severed'));
    assert.ok(isValidPortalTransition('active', 'suspended'));
    assert.ok(isValidPortalTransition('active', 'severed'));
    assert.ok(isValidPortalTransition('suspended', 'active'));
    assert.ok(isValidPortalTransition('suspended', 'severed'));
    assert.ok(isValidPortalTransition('severed', 'dormant'));
  });

  it('rejects invalid portal transitions', () => {
    assert.ok(!isValidPortalTransition('dormant', 'active'));
    assert.ok(!isValidPortalTransition('dormant', 'severed'));
    assert.ok(!isValidPortalTransition('active', 'dormant'));
    assert.ok(!isValidPortalTransition('active', 'negotiating'));
    assert.ok(!isValidPortalTransition('severed', 'active'));
  });

  it('validates correct tender transitions', () => {
    assert.ok(isValidTenderTransition('initializing', 'ready'));
    assert.ok(isValidTenderTransition('ready', 'serving'));
    assert.ok(isValidTenderTransition('serving', 'draining'));
    assert.ok(isValidTenderTransition('draining', 'terminated'));
    assert.ok(isValidTenderTransition('terminated', 'initializing'));
  });

  it('rejects invalid tender transitions', () => {
    assert.ok(!isValidTenderTransition('initializing', 'serving'));
    assert.ok(!isValidTenderTransition('ready', 'draining'));
    assert.ok(!isValidTenderTransition('draining', 'ready'));
    assert.ok(!isValidTenderTransition('terminated', 'serving'));
  });

  it('transitions portal from dormant to negotiating', () => {
    const portal = makePortal();
    const result = transitionPortal(portal, {
      targetState: 'negotiating',
      reason: 'Opening portal',
      permission: null,
    });
    assert.ok(result.success);
    assert.equal(result.portal.state, 'negotiating');
    assert.ok(result.transition);
    assert.equal(result.transition!.fromState, 'dormant');
    assert.equal(result.transition!.toState, 'negotiating');
    assert.ok(result.transition!.hash.length === 64);
  });

  it('rejects invalid portal transition', () => {
    const portal = makePortal();
    const result = transitionPortal(portal, {
      targetState: 'active',
      reason: 'Skip negotiation',
      permission: null,
    });
    assert.ok(!result.success);
    assert.ok(result.failureReason!.includes('Invalid transition'));
    assert.equal(result.transition, null);
  });

  it('rejects transition when identity permission denied', () => {
    const records = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const permission = checkActionPermission(surface, 'reversible_bounded');

    const result = transitionPortal(portal, {
      targetState: 'negotiating',
      reason: 'Opening portal',
      permission,
    });
    assert.ok(!result.success);
    assert.ok(result.failureReason!.includes('Identity permission denied'));
  });

  it('transitions tender through full lifecycle', () => {
    const endpoint = makeEndpoint();
    const tender = createTender('portal-1', endpoint);
    assert.equal(tender.state, 'initializing');

    const r1 = transitionTender(tender, 'ready');
    assert.ok(r1.success);
    assert.equal(r1.tender.state, 'ready');

    const r2 = transitionTender(r1.tender, 'serving');
    assert.ok(r2.success);
    assert.equal(r2.tender.state, 'serving');

    const r3 = transitionTender(r2.tender, 'draining');
    assert.ok(r3.success);
    assert.equal(r3.tender.state, 'draining');

    const r4 = transitionTender(r3.tender, 'terminated');
    assert.ok(r4.success);
    assert.equal(r4.tender.state, 'terminated');
  });
});

describe('P4.4 — Tender & Endpoint Creation', () => {
  it('creates an endpoint with all fields', () => {
    const endpoint = createEndpoint('api', 'https', 'https://api.example.com', 'bidirectional', ['read']);
    assert.ok(endpoint.endpointId.startsWith('endpoint-'));
    assert.equal(endpoint.serviceKind, 'api');
    assert.equal(endpoint.protocol, 'https');
    assert.equal(endpoint.address, 'https://api.example.com');
    assert.equal(endpoint.flowDirection, 'bidirectional');
    assert.deepEqual(endpoint.capabilities, ['read']);
    assert.ok(endpoint.hash.length === 64);
  });

  it('creates a tender with defaults', () => {
    const endpoint = makeEndpoint();
    const tender = createTender('portal-1', endpoint);
    assert.ok(tender.tenderId.startsWith('tender-'));
    assert.equal(tender.portalRef, 'portal-1');
    assert.equal(tender.state, 'initializing');
    assert.equal(tender.endpoint, endpoint);
    assert.equal(tender.bufferCapacity, 4096);
    assert.equal(tender.maxConcurrentFlows, 4);
    assert.equal(tender.healthCheckIntervalMs, 30000);
    assert.ok(tender.hash.length === 64);
  });

  it('creates a tender with custom config', () => {
    const endpoint = makeEndpoint();
    const tender = createTender('portal-2', endpoint, {
      bufferCapacity: 8192,
      maxConcurrentFlows: 8,
      healthCheckIntervalMs: 10000,
    });
    assert.equal(tender.bufferCapacity, 8192);
    assert.equal(tender.maxConcurrentFlows, 8);
    assert.equal(tender.healthCheckIntervalMs, 10000);
  });

  it('produces unique tender IDs', () => {
    const endpoint = makeEndpoint();
    const t1 = createTender('portal-1', endpoint);
    const t2 = createTender('portal-1', endpoint);
    assert.notEqual(t1.tenderId, t2.tenderId);
  });

  it('produces deterministic hashes for same input', () => {
    const e1 = createEndpoint('api', 'https', 'https://example.com', 'inbound', ['read']);
    const e2 = createEndpoint('api', 'https', 'https://example.com', 'inbound', ['read']);
    assert.equal(e1.hash, e2.hash);
  });
});

describe('P4.5 — Portal Operations Integration', () => {
  it('creates a portal descriptor in dormant state', () => {
    const portal = createPortalDescriptor('Prismatic Iris', 67.5);
    assert.ok(portal.portalId.startsWith('portal-'));
    assert.equal(portal.name, 'Prismatic Iris');
    assert.equal(portal.angleDeg, 67.5);
    assert.equal(portal.state, 'dormant');
    assert.equal(portal.tender, null);
    assert.ok(portal.boundaryPolicy.policyId.startsWith('policy-'));
    assert.ok(portal.hash.length === 64);
  });

  it('opens portal with full identity surface', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal('Test Portal', 67.5);
    const endpoint = makeEndpoint();
    const result = openPortal(portal, endpoint, surface);

    assert.ok(result.success);
    assert.equal(result.portal.state, 'active');
    assert.ok(result.portal.tender);
    assert.equal(result.portal.tender!.state, 'serving');
    assert.ok(result.contract);
    assert.equal(result.contract!.state, 'active');
    assert.ok(result.contract!.negativeSpaceInvariants.never_serializes_witness);
    assert.ok(result.contract!.negativeSpaceInvariants.never_persists_prompts);
    assert.ok(result.contract!.negativeSpaceInvariants.no_verdict_over_inner_life);
    assert.equal(result.failureReason, null);
  });

  it('opens portal with bounded identity surface', () => {
    const records = makeBoundedRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const result = openPortal(portal, endpoint, surface);

    assert.ok(result.success);
    assert.equal(result.portal.state, 'active');
  });

  it('rejects portal opening without identity surface', () => {
    const portal = makePortal();
    const endpoint = makeEndpoint();
    const result = openPortal(portal, endpoint, null);

    assert.ok(!result.success);
    assert.ok(result.failureReason!.includes('Identity permission denied'));
  });

  it('rejects portal opening with boundary violation', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = createPortalDescriptor('Restricted Portal', 67.5, {
      allowedServiceKinds: ['storage'],
    });
    const endpoint = makeEndpoint({ serviceKind: 'api' });
    const result = openPortal(portal, endpoint, surface);

    assert.ok(!result.success);
    assert.ok(result.failureReason!.includes('Service kind'));
  });

  it('closes an active portal', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const opened = openPortal(portal, endpoint, surface);
    assert.ok(opened.success);

    const closed = closePortal(opened.portal);
    assert.ok(closed.success);
    assert.equal(closed.portal.state, 'dormant');
    assert.equal(closed.portal.tender, null);
  });

  it('suspends an active portal', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const opened = openPortal(portal, endpoint, surface);
    assert.ok(opened.success);

    const suspended = suspendPortal(opened.portal, 'Health check failed');
    assert.ok(suspended.success);
    assert.equal(suspended.portal.state, 'suspended');
    assert.ok(suspended.transition);
    assert.equal(suspended.transition!.reason, 'Health check failed');
  });

  it('resumes a suspended portal with identity', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const opened = openPortal(portal, endpoint, surface);
    const suspended = suspendPortal(opened.portal, 'Maintenance');
    assert.ok(suspended.success);

    const resumed = resumePortal(suspended.portal, surface);
    assert.ok(resumed.success);
    assert.equal(resumed.portal.state, 'active');
  });

  it('cannot resume portal without identity', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const opened = openPortal(portal, endpoint, surface);
    const suspended = suspendPortal(opened.portal, 'Maintenance');

    const resumed = resumePortal(suspended.portal, null);
    assert.ok(!resumed.success);
    assert.ok(resumed.failureReason!.includes('Identity permission denied'));
  });
});

describe('P4.6 — Edge Cases & Contract Integrity', () => {
  it('portal contract preserves negative space invariants', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const result = openPortal(portal, endpoint, surface);

    assert.ok(result.contract);
    const inv = result.contract!.negativeSpaceInvariants;
    assert.ok(inv.never_serializes_witness);
    assert.ok(inv.never_persists_prompts);
    assert.ok(inv.no_verdict_over_inner_life);
  });

  it('portal contract references are consistent', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const result = openPortal(portal, endpoint, surface);

    assert.ok(result.contract);
    assert.equal(result.contract!.portalRef, result.portal.portalId);
    assert.equal(result.contract!.endpointRef, endpoint.endpointId);
    assert.equal(result.contract!.tenderRef, result.portal.tender!.tenderId);
    assert.equal(result.contract!.boundaryPolicyRef, result.portal.boundaryPolicy.policyId);
  });

  it('all artifacts have valid SHA-256 hashes', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const result = openPortal(portal, endpoint, surface);

    assert.ok(result.portal.hash.length === 64);
    assert.ok(result.portal.boundaryPolicy.hash.length === 64);
    assert.ok(result.portal.tender!.hash.length === 64);
    assert.ok(result.portal.tender!.endpoint.hash.length === 64);
    assert.ok(result.contract!.hash.length === 64);
  });

  it('cannot close a dormant portal directly', () => {
    const portal = makePortal();
    const result = closePortal(portal);
    assert.ok(!result.success);
    assert.ok(result.failureReason!.includes('Invalid transition'));
  });

  it('cannot suspend a dormant portal', () => {
    const portal = makePortal();
    const result = suspendPortal(portal, 'Should fail');
    assert.ok(!result.success);
    assert.ok(result.failureReason!.includes('Invalid transition'));
  });

  it('transition records capture identity permission when provided', () => {
    const records = makeFullRecords();
    const context = makeContext('reversible_bounded');
    const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

    const portal = makePortal();
    const endpoint = makeEndpoint();
    const result = openPortal(portal, endpoint, surface);

    assert.ok(result.transition);
    assert.ok(result.transition!.transitionId.startsWith('ptrans-'));
    assert.ok(result.transition!.hash.length === 64);
  });

  it('different portals produce different hashes', () => {
    const p1 = createPortalDescriptor('Portal A', 67.5);
    const p2 = createPortalDescriptor('Portal B', 112.5);
    assert.notEqual(p1.hash, p2.hash);
  });

  it('portal descriptor with custom boundary policy', () => {
    const portal = createPortalDescriptor('Strict Portal', 67.5, {
      allowedFlowDirections: ['inbound'],
      maxPayloadBytes: 256,
    });
    assert.deepEqual(portal.boundaryPolicy.allowedFlowDirections, ['inbound']);
    assert.equal(portal.boundaryPolicy.maxPayloadBytes, 256);
  });
});
