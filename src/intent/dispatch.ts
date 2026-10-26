import type {
  IntentEnvelope,
  IntentResolution,
  DispatchDecision,
  DispatchOutcome,
  DispatchRoute,
  OutcomeStatus,
} from './contracts.js';
import { GESTURE_DISPATCH_ROUTES } from './contracts.js';
import type { AdaptiveIdentitySurface } from '../identity/contracts.js';
import { resolveIntent } from './resolve.js';
import { computeHash } from '../identity/hash.js';

let decisionCounter = 0;
let outcomeCounter = 0;

function nextDecisionId(): string {
  return `decision-${Date.now()}-${++decisionCounter}`;
}

function nextOutcomeId(): string {
  return `outcome-${Date.now()}-${++outcomeCounter}`;
}

function buildDecision(
  envelope: IntentEnvelope,
  resolution: IntentResolution,
): DispatchDecision {
  const route: DispatchRoute = resolution.verdict === 'deferred'
    ? 'deferred'
    : GESTURE_DISPATCH_ROUTES[envelope.gesture];

  const approved = resolution.verdict === 'permitted';
  const reason = approved
    ? `Routed via ${route}: ${resolution.reason}`
    : resolution.reason;

  const decisionData = {
    intentRef: envelope.intentId,
    resolutionRef: resolution.resolutionId,
    route,
    approved,
  };
  const hash = computeHash(JSON.stringify(decisionData));

  return {
    decisionId: nextDecisionId(),
    intentRef: envelope.intentId,
    resolutionRef: resolution.resolutionId,
    timestamp: new Date().toISOString(),
    route,
    approved,
    reason,
    hash,
  };
}

function deriveOutcomeStatus(decision: DispatchDecision): OutcomeStatus {
  if (decision.route === 'deferred') return 'deferred';
  if (!decision.approved) return 'blocked';
  return 'executed';
}

export function dispatchIntent(
  envelope: IntentEnvelope,
  surface: AdaptiveIdentitySurface | null,
): DispatchOutcome {
  const resolution = resolveIntent(envelope, surface);
  const decision = buildDecision(envelope, resolution);
  const status = deriveOutcomeStatus(decision);

  const outcomeData = {
    intentRef: envelope.intentId,
    decisionRef: decision.decisionId,
    status,
    mutationApplied: status === 'executed',
  };
  const hash = computeHash(JSON.stringify(outcomeData));

  return {
    outcomeId: nextOutcomeId(),
    intentRef: envelope.intentId,
    decisionRef: decision.decisionId,
    timestamp: new Date().toISOString(),
    status,
    resolution,
    decision,
    mutationApplied: status === 'executed',
    failureDetail: status === 'blocked' ? resolution.reason : null,
    hash,
  };
}

export function processGestureIntent(
  envelope: IntentEnvelope,
  surface: AdaptiveIdentitySurface | null,
): DispatchOutcome {
  return dispatchIntent(envelope, surface);
}
