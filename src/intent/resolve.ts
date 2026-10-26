import type { IntentEnvelope, IntentResolution, ResolutionVerdict } from './contracts.js';
import type { AdaptiveIdentitySurface } from '../identity/contracts.js';
import { checkActionPermission } from '../identity/surface.js';
import { computeHash } from '../identity/hash.js';

let resolutionCounter = 0;

function nextResolutionId(): string {
  return `resolution-${Date.now()}-${++resolutionCounter}`;
}

export function resolveIntent(
  envelope: IntentEnvelope,
  surface: AdaptiveIdentitySurface | null,
): IntentResolution {
  const permission = checkActionPermission(surface, envelope.actionClass);
  const coverageState = surface?.coverageState ?? 'IDENTITY_UNAVAILABLE';

  let verdict: ResolutionVerdict;
  let reason: string;

  if (permission.permitted) {
    verdict = 'permitted';
    reason = `${envelope.gesture} permitted: ${permission.reason}`;
  } else if (coverageState === 'IDENTITY_UNAVAILABLE') {
    verdict = 'deferred';
    reason = `${envelope.gesture} deferred: identity surface unavailable`;
  } else {
    verdict = 'denied';
    reason = `${envelope.gesture} denied: ${permission.reason}`;
  }

  const resolutionData = {
    intentRef: envelope.intentId,
    verdict,
    permission,
    coverageState,
  };
  const hash = computeHash(JSON.stringify(resolutionData));

  return {
    resolutionId: nextResolutionId(),
    intentRef: envelope.intentId,
    timestamp: new Date().toISOString(),
    verdict,
    permission,
    identityCoverageState: coverageState,
    reason,
    hash,
  };
}
