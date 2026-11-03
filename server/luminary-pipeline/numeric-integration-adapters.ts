/** Unmounted composition of pinned PIM/IRG inputs and one-use PTAG attempts. */
import { randomUUID } from 'node:crypto';
import type { GovernedReply } from '../luminary-governance.js';
import { SEVEN_VIRTUES, validateThresholds, type IrgScorer, type IrgThreshold } from './irg.js';
import type { CurrentGateAdapters } from './marker-adapters.js';
import { registryPimCheck } from './pim-registry-adapter.js';
import type { PimDirection, PimRegistry, PimScanLimits } from './pim-registry-core.js';
import { createAttemptBoundPtagCheck, type PtagAttemptRequest, type TrustedPtagInputs } from './ptag-attempt-factory.js';

export interface NumericIntegrationInputs {
  registry: PimRegistry | null;
  trust: { expectedRegistryHash: string; approvedActivationHash: string };
  limits: PimScanLimits;
  source: { direction: PimDirection; originator: string; recipient: string; taskId: string };
  irgScorer: IrgScorer;
  threshold?: IrgThreshold;
  trustedPtagContext: (reply: GovernedReply, attempt: number) => TrustedPtagInputs;
  producePtag: (request: PtagAttemptRequest) => Promise<unknown> | unknown;
}

function plainOwnData(raw: unknown, keys: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Object.getPrototypeOf(raw) !== Object.prototype) throw new Error('integration_config_not_plain');
  const ownKeys = Reflect.ownKeys(raw);
  if (ownKeys.some((key) => typeof key !== 'string' || (!keys.includes(key) && !optional.includes(key)))) throw new Error('integration_config_extra_field');
  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || !('value' in descriptor)) throw new Error('integration_config_missing_or_accessor');
    snapshot[key] = descriptor.value;
  }
  for (const key of optional) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (descriptor) {
      if (!('value' in descriptor)) throw new Error('integration_config_missing_or_accessor');
      snapshot[key] = descriptor.value;
    }
  }
  return snapshot;
}

function captureThreshold(value: IrgThreshold | undefined): IrgThreshold | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('integration_threshold_invalid');
    return value;
  }
  return Object.freeze(validateThresholds(plainOwnData(value, SEVEN_VIRTUES)));
}

/** Construct once per governed loop. Registry mutations then fail its pinned hash check. */
export function createNumericIntegrationAdapters(inputs: NumericIntegrationInputs): (reply: GovernedReply, attempt: number) => CurrentGateAdapters {
  const root = plainOwnData(inputs, ['registry', 'trust', 'limits', 'source', 'irgScorer', 'trustedPtagContext', 'producePtag'], ['threshold']);
  const trust = Object.freeze(plainOwnData(root.trust, ['expectedRegistryHash', 'approvedActivationHash'])) as NumericIntegrationInputs['trust'];
  const limits = Object.freeze(plainOwnData(root.limits, ['maxCandidateBytes', 'maxRules', 'maxMatches', 'maxStaticWorkUnits'])) as unknown as PimScanLimits;
  const source = Object.freeze(plainOwnData(root.source, ['direction', 'originator', 'recipient', 'taskId'])) as unknown as NumericIntegrationInputs['source'];
  const registry = root.registry as PimRegistry | null;
  const irgScorer = root.irgScorer as IrgScorer;
  const trustedPtagContext = root.trustedPtagContext as NumericIntegrationInputs['trustedPtagContext'];
  const producePtag = root.producePtag as NumericIntegrationInputs['producePtag'];
  if (typeof irgScorer !== 'function' || typeof trustedPtagContext !== 'function' || typeof producePtag !== 'function') {
    throw new Error('integration_callback_invalid');
  }
  const threshold = captureThreshold(root.threshold as IrgThreshold | undefined);
  const runId = randomUUID();
  const issued = new Set<number>();
  return (reply, attempt) => {
    try {
      if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > 11) throw new Error('integration_attempt_invalid');
      if (issued.has(attempt)) throw new Error('integration_attempt_reused');
      issued.add(attempt);
      const attemptId = `attempt:${runId}:${attempt}`;
      return {
        pim: registryPimCheck({ registry, trust, limits, sourceMessageId: `message:${runId}:${attempt}`, attemptId, ...source }),
        irgScorer,
        ...(threshold === undefined ? {} : { threshold }),
        ptag: createAttemptBoundPtagCheck(reply.content, trustedPtagContext(reply, attempt), producePtag),
      };
    } catch (error) {
      // Let examine() create the candidate Marker before reporting setup failure.
      return { pim: () => { throw error; }, irgScorer, ptag: () => { throw error; } };
    }
  };
}
