import type { IdentityCoverageState } from '../identity/contracts.js';
import type { GateVerdict } from '../construction/contracts.js';
import type { OutcomeStatus } from '../intent/contracts.js';
import type { PortalState } from '../portal/contracts.js';

export type ScenarioId =
  | 'identity_constrained_construction'
  | 'canvas_generated_intent'
  | 'generated_external_connector'
  | 'shortfall_during_exchange'
  | 'degraded_surface_continuity';

export type AssuranceVerdict = 'PASS' | 'FAIL';

export interface ScenarioEvidence {
  scenarioId: ScenarioId;
  description: string;
  assertions: AssertionRecord[];
  verdict: AssuranceVerdict;
  timestamp: string;
}

export interface AssertionRecord {
  label: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface IntegratedAssuranceReport {
  reportId: string;
  timestamp: string;
  scenarios: ScenarioEvidence[];
  overallVerdict: AssuranceVerdict;
  passCount: number;
  failCount: number;
  totalAssertions: number;
}

export interface ScenarioAContext {
  identityCoverageState: IdentityCoverageState;
  observationPermitted: boolean;
  conversationPermitted: boolean;
  mutationPermitted: boolean;
  mutationPausedUntilPromotion: boolean;
}

export interface ScenarioBContext {
  gestureNormalized: boolean;
  intentActionClass: string;
  identityResolutionVerdict: string;
  dispatchRoute: string;
  dispatchOutcome: OutcomeStatus;
  constructionVerdict: GateVerdict | null;
  mutationApplied: boolean;
}

export interface ScenarioCContext {
  portalState: PortalState;
  tenderActive: boolean;
  contractSigned: boolean;
  boundaryPolicyEnforced: boolean;
  negativeSpacePreserved: boolean;
}

export interface ScenarioDContext {
  portalOpenAttempted: boolean;
  identityDenied: boolean;
  shortfallRecorded: boolean;
  internalStateUnchanged: boolean;
}

export interface ScenarioEContext {
  fullSurfaceObservation: boolean;
  fullSurfaceConversation: boolean;
  fullSurfaceMutation: boolean;
  degradedSurfaceObservation: boolean;
  degradedSurfaceConversation: boolean;
  degradedSurfaceMutation: boolean;
  unavailableSurfaceObservation: boolean;
  unavailableSurfaceDeferred: boolean;
}

export const SCENARIO_ORDER: ScenarioId[] = [
  'identity_constrained_construction',
  'canvas_generated_intent',
  'generated_external_connector',
  'shortfall_during_exchange',
  'degraded_surface_continuity',
];
