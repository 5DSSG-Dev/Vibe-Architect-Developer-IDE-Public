import type { IntentEnvelope, GestureKind } from './contracts.js';
import { GESTURE_ACTION_CLASS_MAP, GESTURE_MUTATION_TARGETS } from './contracts.js';
import { computeHash } from '../identity/hash.js';

let intentCounter = 0;

function nextIntentId(): string {
  return `intent-${Date.now()}-${++intentCounter}`;
}

export interface GestureInput {
  gesture: GestureKind;
  sourceEntityId: string;
  targetEntityId: string;
  parameters?: Record<string, unknown>;
}

export function normalizeGesture(input: GestureInput): IntentEnvelope {
  const actionClass = GESTURE_ACTION_CLASS_MAP[input.gesture];
  const mutationTargets = GESTURE_MUTATION_TARGETS[input.gesture];
  const parameters = input.parameters ?? {};

  const envelopeData = {
    gesture: input.gesture,
    actionClass,
    sourceEntityId: input.sourceEntityId,
    targetEntityId: input.targetEntityId,
    mutationTargets,
    parameters,
  };
  const hash = computeHash(JSON.stringify(envelopeData));

  return {
    intentId: nextIntentId(),
    timestamp: new Date().toISOString(),
    gesture: input.gesture,
    actionClass,
    sourceEntityId: input.sourceEntityId,
    targetEntityId: input.targetEntityId,
    mutationTargets,
    parameters,
    hash,
  };
}

export function classifyGestureAction(gesture: GestureKind): string {
  return GESTURE_ACTION_CLASS_MAP[gesture];
}
