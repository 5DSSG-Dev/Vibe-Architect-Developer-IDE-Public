// The Architect -> Luminary gate (STP-0005 P1, plan rev16 F1). Governance in both
// directions: every message the Architect sends meets the same checks a Luminary reply
// does, in order, and the first check that flags it sends it straight to IDS:
//
//   structural gate -> PIM -> IRG (only if PIM found nothing) -- coherent --> Luminary
//          \             \          \- incoherent -> IDS -> back to the Architect
//           \             \- PIM catch -----------^   (never scored by IRG)
//            \- structural failure -> back to the Architect
//
// An incoherent message never reaches the Luminary: this gate runs before the Luminary
// response path is called, and the caller makes that call only on `coherent`. If the gauge
// fails on a message that reached IRG, nothing crosses (gauge_error, fail closed).

import { DEFAULT_MAX_CONTENT_BYTES } from '../luminary-governance.js';
import { buildIdsObservation, validateObservation, type IdsObservation } from './ids.js';
import { readIrg, SEVEN_VIRTUES, validateReadings, type IrgReading, type IrgThreshold, IRG_THRESHOLD } from './irg.js';
import type { Gauge, LineageEntry } from './pipeline.js';
import { screenPim } from './pim.js';
import { routeRbc } from './rbc.js';

export type ArchitectFlag = 'structural' | 'pim' | 'irg';

export interface ArchitectGateOptions {
  gauge: Gauge;
  threshold?: IrgThreshold;
  maxContentBytes?: number;
}

export type ArchitectGateResult =
  | { outcome: 'coherent'; lineage: LineageEntry[] }
  | { outcome: 'returned'; flaggedBy: ArchitectFlag; observation: IdsObservation; lineage: LineageEntry[] }
  | { outcome: 'gauge_error'; message: string; lineage: LineageEntry[] };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Check one Architect message. Makes no Luminary call; the gauge is the only model reached. */
export async function gateArchitectMessage(message: string, options: ArchitectGateOptions): Promise<ArchitectGateResult> {
  const threshold = options.threshold ?? options.gauge.thresholds ?? IRG_THRESHOLD;
  const maxBytes = options.maxContentBytes ?? DEFAULT_MAX_CONTENT_BYTES;
  const lineage: LineageEntry[] = [];
  const pass = 1;

  const bytes = Buffer.byteLength(message, 'utf8');
  if (message.trim().length === 0 || bytes > maxBytes) {
    lineage.push({ pass, stage: 'structural', ok: false });
    const observation: IdsObservation = {
      identify: message.trim().length === 0 ? 'The message is empty.' : `The message is ${bytes} bytes.`,
      define: [message.trim().length === 0 ? 'An empty message has nothing to send.' : `That is above the ${maxBytes}-byte limit.`],
      suggest: [],
    };
    return { outcome: 'returned', flaggedBy: 'structural', observation, lineage };
  }
  lineage.push({ pass, stage: 'structural', ok: true });

  const pimFindings = screenPim(message);
  lineage.push({ pass, stage: 'pim', findings: pimFindings });

  let irg: IrgReading | null = null;
  if (pimFindings.length === 0) {
    try {
      irg = readIrg(validateReadings(await options.gauge.read(message, SEVEN_VIRTUES)), threshold);
    } catch (error) {
      return { outcome: 'gauge_error', message: errorMessage(error, 'The gauge could not read the message.'), lineage };
    }
    lineage.push({ pass, stage: 'irg', coherent: irg.coherent, readings: irg.readings, belowThreshold: irg.belowThreshold, threshold: irg.threshold });
    const route = routeRbc(irg);
    lineage.push({ pass, stage: 'rbc', route });
    if (route === 'prism') {
      lineage.push({ pass, stage: 'prism' });
      return { outcome: 'coherent', lineage };
    }
  }

  // IDS response. P2 replaces this with the embedded model's Identify, Define and Suggest,
  // the IDS PIM and ids_error; until then an observer failure is still fail-closed.
  let observation: IdsObservation;
  try {
    if (options.gauge.observe) {
      const validated = validateObservation(await options.gauge.observe({ reply: message, pimFindings, irg }));
      if (!validated) throw new Error('Gauge observation is not a well-formed IDS observation.');
      observation = validated;
    } else {
      observation = buildIdsObservation({ reply: message, pimFindings, irg });
    }
  } catch (error) {
    return { outcome: 'gauge_error', message: errorMessage(error, 'The gauge could not produce an IDS observation.'), lineage };
  }
  lineage.push({ pass, stage: 'ids', observation });
  return { outcome: 'returned', flaggedBy: pimFindings.length > 0 ? 'pim' : 'irg', observation, lineage };
}
