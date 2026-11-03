/** Unmounted adapter from the inactive synthesized PIM scanner to numeric RBC results. */
import { scanPimRegistry, pimSha256, type PimDirection, type PimRegistry, type PimScanLimits } from './pim-registry-core.js';
import type { GateCheck } from './marker-route.js';

export interface RegistryPimConfig {
  registry: PimRegistry | null;
  trust: { expectedRegistryHash: string; approvedActivationHash: string };
  limits: PimScanLimits;
  sourceMessageId: string;
  direction: PimDirection;
  originator: string;
  recipient: string;
  taskId: string;
  attemptId: string;
}

export function registryPimCheck(config: RegistryPimConfig): GateCheck {
  return (candidate) => {
    // The scanner validates the same budget; enforce it before computing its required digest.
    if (candidate.length > 65_536 || Buffer.byteLength(candidate, 'utf8') > config.limits.maxCandidateBytes) {
      throw new Error('pim_error:candidate_over_budget');
    }
    const scan = scanPimRegistry({
      candidate, candidateDigest: pimSha256(candidate), sourceMessageId: config.sourceMessageId,
      direction: config.direction, originator: config.originator, recipient: config.recipient,
      taskId: config.taskId, attemptId: config.attemptId,
    }, config.registry, config.trust, config.limits);
    if (scan.status === 'pim_error') throw new Error(`pim_error:${scan.code}`);
    if (scan.status === 'clean') return { result: 1 };
    return {
      result: 0,
      finding: {
        kind: scan.findings.some((item) => item.opaqueWithoutDecoder) ? 'unsure' : 'incoherence',
        reason: scan.findings.map((item) => `${item.categoryId}/${item.ruleId}`).join('; '),
        evidence: scan.findings.map((item) => item.original.excerpt).join('; '),
      },
    };
  };
}
