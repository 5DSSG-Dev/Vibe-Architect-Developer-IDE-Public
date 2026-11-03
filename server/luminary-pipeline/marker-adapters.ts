/** Unmounted adapters for the current local PIM/IRG and an injected PTAG verdict. */
import { screenPim } from './pim.js';
import { IRG_THRESHOLD, SEVEN_VIRTUES, readIrg, validateReadings, validateThresholds, type IrgScorer, type IrgThreshold } from './irg.js';
import { examine, type GateCheck, type GateChecks, type RouteOutcome } from './marker-route.js';
import { projectValidatedPtagVerdict } from './ptag-validated-adapter.js';

export type PtagVerdict =
  | { decision: 'yes' }
  | { decision: 'no' | 'unsure'; reason: string; evidence?: string };
export type PtagCheck = (candidate: string) => Promise<unknown> | unknown;

function checkedThreshold(value: IrgThreshold): IrgThreshold {
  if (typeof value !== 'number') return validateThresholds(value);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('invalid_irg_threshold');
  return value;
}

function ptagResult(raw: unknown, candidate: string): unknown {
  const projected = projectValidatedPtagVerdict(raw, candidate);
  if (!projected) return null;
  try {
    const fields = Object.getOwnPropertyDescriptors(projected);
    const keys = Object.keys(fields);
    if (keys.some((key) => !['decision', 'reason', 'evidence'].includes(key))) return null;
    if (keys.some((key) => !('value' in fields[key]))) return null;
    const decision = fields.decision?.value;
    const reason = fields.reason?.value;
    const evidence = fields.evidence?.value;
    if (decision === 'yes' && keys.length === 1) return { result: 1 };
    if ((decision === 'no' || decision === 'unsure') && typeof reason === 'string' && reason.trim()
      && (evidence === undefined || typeof evidence === 'string')) {
      return { result: 0, finding: { kind: decision === 'no' ? 'incoherence' : 'unsure', reason, ...(evidence === undefined ? {} : { evidence }) } };
    }
  } catch { /* Malformed or proxy-backed verdicts fail closed below. */ }
  return null;
}

export interface CurrentGateAdapters {
  /** Optional independently configured scanner; legacy screenPim is the diagnostic default. */
  pim?: GateCheck;
  irgScorer: IrgScorer;
  ptag: PtagCheck;
  threshold?: IrgThreshold;
}

/** Uses current legacy PIM and IRG. PTAG remains injected and unmounted. */
export async function examineWithCurrentGates(candidate: string, adapters: CurrentGateAdapters): Promise<RouteOutcome> {
  const checks: GateChecks = {
    pim: adapters.pim ?? ((text) => {
      const findings = screenPim(text);
      return findings.length === 0 ? { result: 1 } : {
        result: 0,
        finding: { kind: 'incoherence', reason: findings.map((item) => `${item.category} (${item.patternId})`).join('; '), evidence: findings.map((item) => item.excerpt).join('; ') },
      };
    }),
    irg: async (text) => {
      const selected = adapters.threshold ?? IRG_THRESHOLD;
      const threshold = checkedThreshold(selected);
      const readings = validateReadings(await adapters.irgScorer(text, SEVEN_VIRTUES));
      const reading = readIrg(readings, threshold);
      return reading.coherent ? { result: 1 } : {
        result: 0,
        finding: { kind: 'incoherence', reason: `Below IRG threshold: ${reading.belowThreshold.join(', ')}`, evidence: reading.belowThreshold.map((virtue) => `${virtue}=${reading.readings[virtue]}`).join('; ') },
      };
    },
    ptag: async (text) => ptagResult(await adapters.ptag(text), text),
  };
  return examine(candidate, checks);
}
