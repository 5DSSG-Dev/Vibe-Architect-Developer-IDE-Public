export type {
  GestureKind,
  MutationTarget,
  ResolutionVerdict,
  DispatchRoute,
  OutcomeStatus,
  IntentEnvelope,
  IntentResolution,
  DispatchDecision,
  DispatchOutcome,
} from './contracts.js';

export {
  GESTURE_ACTION_CLASS_MAP,
  GESTURE_DISPATCH_ROUTES,
  GESTURE_MUTATION_TARGETS,
  GESTURE_KIND_ORDER,
} from './contracts.js';

export { normalizeGesture, classifyGestureAction } from './normalize.js';
export type { GestureInput } from './normalize.js';

export { resolveIntent } from './resolve.js';

export { dispatchIntent, processGestureIntent } from './dispatch.js';
