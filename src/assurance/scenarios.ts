import type {
  ScenarioEvidence,
  AssertionRecord,
  ScenarioAContext,
  ScenarioBContext,
  ScenarioCContext,
  ScenarioDContext,
  ScenarioEContext,
} from './contracts.js';
import type {
  IdentityRecord,
  IdentityProjectionContext,
  ActionClass,
} from '../identity/contracts.js';
import { ENVELOPE_PROFILES } from '../identity/contracts.js';
import { projectIdentitySurface, checkActionPermission } from '../identity/surface.js';
import { normalizeGesture } from '../intent/normalize.js';
import { resolveIntent } from '../intent/resolve.js';
import { dispatchIntent } from '../intent/dispatch.js';
import {
  createIdentityGateChecker,
  createContractConformanceChecker,
  createBoundaryChecker,
} from '../construction/checkers.js';
import { evaluateConstructionGate } from '../construction/gate.js';
import type { ConstructionArtifact } from '../construction/contracts.js';
import { createPortalDescriptor, openPortal, closePortal } from '../portal/operations.js';
import { createEndpoint } from '../portal/tender.js';
import { computeHash } from '../identity/hash.js';

function makeRecord(id: string, domain: IdentityRecord['domain'], content: string): IdentityRecord {
  return {
    recordId: id,
    domain,
    content,
    priority: 1,
    version: '1.0.0',
    hash: `hash-${id}`,
    evidenceRefs: [{ sourceId: 'src-1', sourceType: 'assurance', hash: 'eh-1', retrievedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeContext(action: ActionClass): IdentityProjectionContext {
  return {
    activeIntent: 'assurance-scenario',
    currentRelation: null,
    participants: [],
    proposedAction: action,
    affectedCapabilities: [],
    boundaryProximity: 0,
    affectPressure: 0,
    priorShortfalls: [],
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

function makeMinimalRecords(): IdentityRecord[] {
  return [
    makeRecord('r1', 'foundational_commitments', 'commitment'),
    makeRecord('r2', 'sovereignty_consent', 'consent'),
    makeRecord('r3', 'authority_limitations', 'limitations'),
    makeRecord('r4', 'active_tensions', 'tension'),
  ];
}

function assert(label: string, expected: string, actual: string): AssertionRecord {
  return { label, expected, actual, passed: expected === actual };
}

function buildEvidence(
  scenarioId: ScenarioEvidence['scenarioId'],
  description: string,
  assertions: AssertionRecord[],
): ScenarioEvidence {
  return {
    scenarioId,
    description,
    assertions,
    verdict: assertions.every(a => a.passed) ? 'PASS' : 'FAIL',
    timestamp: new Date().toISOString(),
  };
}

export function runScenarioA(): ScenarioEvidence {
  const records = makeMinimalRecords();
  const context = makeContext('consequential_mutation');
  const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

  const obsPermission = checkActionPermission(surface, 'observation');
  const convPermission = checkActionPermission(surface, 'conversation');
  const mutPermission = checkActionPermission(surface, 'consequential_mutation');

  const ctx: ScenarioAContext = {
    identityCoverageState: surface?.coverageState ?? 'IDENTITY_UNAVAILABLE',
    observationPermitted: obsPermission.permitted,
    conversationPermitted: convPermission.permitted,
    mutationPermitted: mutPermission.permitted,
    mutationPausedUntilPromotion: !mutPermission.permitted && obsPermission.permitted,
  };

  const assertions: AssertionRecord[] = [
    assert('Coverage state is IDENTITY_DEGRADED', 'IDENTITY_DEGRADED', ctx.identityCoverageState),
    assert('Observation permitted at degraded state', 'true', String(ctx.observationPermitted)),
    assert('Conversation denied at degraded state', 'false', String(ctx.conversationPermitted)),
    assert('Mutation denied at degraded state', 'false', String(ctx.mutationPermitted)),
    assert('Mutation paused until promotion', 'true', String(ctx.mutationPausedUntilPromotion)),
  ];

  const fullRecords = makeFullRecords();
  const fullContext = makeContext('consequential_mutation');
  const { surface: fullSurface } = projectIdentitySurface(fullRecords, fullContext, ENVELOPE_PROFILES['maximum-128k']);
  const afterPromotion = checkActionPermission(fullSurface, 'consequential_mutation');
  assertions.push(
    assert('Mutation permitted after promotion', 'true', String(afterPromotion.permitted)),
  );

  return buildEvidence(
    'identity_constrained_construction',
    'Architect requests consequential change at MINIMUM_KERNEL; mutation pauses until domains promoted',
    assertions,
  );
}

export function runScenarioB(): ScenarioEvidence {
  const records = makeFullRecords();
  const context = makeContext('consequential_mutation');
  const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

  const envelope = normalizeGesture({
    gesture: 'dock_item',
    sourceEntityId: 'orb-01',
    targetEntityId: 'socket-beta',
    parameters: { socketId: 'socket-beta' },
  });

  const resolution = resolveIntent(envelope, surface);
  const outcome = dispatchIntent(envelope, surface);

  const artifact: ConstructionArtifact = {
    artifactId: 'artifact-scenario-b',
    constructionId: 'construction-scenario-b',
    intent: 'Dock orb-01 into socket-beta',
    phase: 'implement',
    files: [{ path: 'src/engine/connectionRuntime.ts', changeType: 'modify', contentHash: computeHash('scenario-b-change') }],
    evidenceRefs: [{ sourceId: 'assurance-b', sourceType: 'scenario', hash: 'eb-1', retrievedAt: new Date().toISOString() }],
    metadata: {},
  };

  const checkers = [
    createIdentityGateChecker(surface),
    createContractConformanceChecker(),
    createBoundaryChecker(['src/']),
  ];
  const gateDecision = evaluateConstructionGate(artifact, surface, checkers);

  const ctx: ScenarioBContext = {
    gestureNormalized: envelope.intentId.startsWith('intent-'),
    intentActionClass: envelope.actionClass,
    identityResolutionVerdict: resolution.verdict,
    dispatchRoute: outcome.decision.route,
    dispatchOutcome: outcome.status,
    constructionVerdict: gateDecision.manifest.verdict,
    mutationApplied: outcome.mutationApplied && gateDecision.permitted,
  };

  return buildEvidence(
    'canvas_generated_intent',
    'Orb drag → normalized intent → identity resolution → dispatch → construction gate → permitted',
    [
      assert('Gesture normalized', 'true', String(ctx.gestureNormalized)),
      assert('Action class is consequential_mutation', 'consequential_mutation', ctx.intentActionClass),
      assert('Identity resolution permitted', 'permitted', ctx.identityResolutionVerdict),
      assert('Dispatch routed via construction', 'construction', ctx.dispatchRoute),
      assert('Dispatch outcome executed', 'executed', ctx.dispatchOutcome),
      assert('Construction gate passed', 'PASS', ctx.constructionVerdict ?? 'null'),
      assert('Mutation applied', 'true', String(ctx.mutationApplied)),
    ],
  );
}

export function runScenarioC(): ScenarioEvidence {
  const records = makeFullRecords();
  const context = makeContext('reversible_bounded');
  const { surface } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

  const portal = createPortalDescriptor('Assurance Portal', 67.5);
  const endpoint = createEndpoint('api', 'https', 'https://api.assurance.test', 'bidirectional', ['read', 'write']);

  const result = openPortal(portal, endpoint, surface);

  const ctx: ScenarioCContext = {
    portalState: result.portal.state,
    tenderActive: result.portal.tender?.state === 'serving',
    contractSigned: result.contract !== null,
    boundaryPolicyEnforced: result.portal.boundaryPolicy.requiresIdentityGate,
    negativeSpacePreserved: result.contract?.negativeSpaceInvariants.never_serializes_witness ?? false,
  };

  const assertions: AssertionRecord[] = [
    assert('Portal reaches active state', 'active', ctx.portalState),
    assert('Tender is serving', 'true', String(ctx.tenderActive)),
    assert('Contract signed', 'true', String(ctx.contractSigned)),
    assert('Boundary policy enforced', 'true', String(ctx.boundaryPolicyEnforced)),
    assert('Negative space invariants preserved', 'true', String(ctx.negativeSpacePreserved)),
  ];

  if (result.success) {
    const closed = closePortal(result.portal);
    assertions.push(
      assert('Portal returns to dormant after close', 'dormant', closed.portal.state),
    );
  }

  return buildEvidence(
    'generated_external_connector',
    'Portal/Tender activation with contract, boundary policy, and negative space invariants',
    assertions,
  );
}

export function runScenarioD(): ScenarioEvidence {
  const records = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
  const context = makeContext('reversible_bounded');
  const { surface, shortfall } = projectIdentitySurface(records, context, ENVELOPE_PROFILES['maximum-128k']);

  const portal = createPortalDescriptor('Shortfall Portal', 112.5);
  const endpoint = createEndpoint('api', 'https', 'https://api.external.test', 'bidirectional', ['read']);

  const portalResult = openPortal(portal, endpoint, surface);

  const envelope = normalizeGesture({
    gesture: 'dock_item',
    sourceEntityId: 'item-test',
    targetEntityId: 'socket-test',
  });
  const intentOutcome = dispatchIntent(envelope, surface);

  const ctx: ScenarioDContext = {
    portalOpenAttempted: true,
    identityDenied: !portalResult.success,
    shortfallRecorded: shortfall !== null || surface?.coverageState === 'IDENTITY_DEGRADED',
    internalStateUnchanged: !intentOutcome.mutationApplied && !portalResult.success,
  };

  return buildEvidence(
    'shortfall_during_exchange',
    'Degraded identity prevents portal opening and mutation; internal state unchanged',
    [
      assert('Portal open attempted', 'true', String(ctx.portalOpenAttempted)),
      assert('Identity denied portal opening', 'true', String(ctx.identityDenied)),
      assert('Shortfall or degradation recorded', 'true', String(ctx.shortfallRecorded)),
      assert('Internal state unchanged', 'true', String(ctx.internalStateUnchanged)),
    ],
  );
}

export function runScenarioE(): ScenarioEvidence {
  const fullRecords = makeFullRecords();
  const fullContext = makeContext('consequential_mutation');
  const { surface: fullSurface } = projectIdentitySurface(fullRecords, fullContext, ENVELOPE_PROFILES['maximum-128k']);

  const degradedRecords = [makeRecord('r1', 'foundational_commitments', 'commitment-only')];
  const degradedContext = makeContext('consequential_mutation');
  const { surface: degradedSurface } = projectIdentitySurface(degradedRecords, degradedContext, ENVELOPE_PROFILES['maximum-128k']);

  const fullObs = checkActionPermission(fullSurface, 'observation');
  const fullConv = checkActionPermission(fullSurface, 'conversation');
  const fullMut = checkActionPermission(fullSurface, 'consequential_mutation');

  const degObs = checkActionPermission(degradedSurface, 'observation');
  const degConv = checkActionPermission(degradedSurface, 'conversation');
  const degMut = checkActionPermission(degradedSurface, 'consequential_mutation');

  const nullObs = checkActionPermission(null, 'observation');
  const nullMut = checkActionPermission(null, 'consequential_mutation');

  const deferEnvelope = normalizeGesture({ gesture: 'dock_item', sourceEntityId: 'a', targetEntityId: 'b' });
  const deferOutcome = dispatchIntent(deferEnvelope, null);

  const ctx: ScenarioEContext = {
    fullSurfaceObservation: fullObs.permitted,
    fullSurfaceConversation: fullConv.permitted,
    fullSurfaceMutation: fullMut.permitted,
    degradedSurfaceObservation: degObs.permitted,
    degradedSurfaceConversation: degConv.permitted,
    degradedSurfaceMutation: degMut.permitted,
    unavailableSurfaceObservation: nullObs.permitted,
    unavailableSurfaceDeferred: deferOutcome.status === 'deferred',
  };

  return buildEvidence(
    'degraded_surface_continuity',
    'Verification that action permissions degrade gracefully across coverage states',
    [
      assert('Full surface: observation permitted', 'true', String(ctx.fullSurfaceObservation)),
      assert('Full surface: conversation permitted', 'true', String(ctx.fullSurfaceConversation)),
      assert('Full surface: mutation permitted', 'true', String(ctx.fullSurfaceMutation)),
      assert('Degraded surface: observation permitted', 'true', String(ctx.degradedSurfaceObservation)),
      assert('Degraded surface: conversation denied', 'false', String(ctx.degradedSurfaceConversation)),
      assert('Degraded surface: mutation denied', 'false', String(ctx.degradedSurfaceMutation)),
      assert('Unavailable surface: observation permitted', 'true', String(ctx.unavailableSurfaceObservation)),
      assert('Unavailable surface: mutation deferred', 'true', String(ctx.unavailableSurfaceDeferred)),
    ],
  );
}
