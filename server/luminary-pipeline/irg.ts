// IRG — Integrity Resonance Gauge (STP-0002 P17). A gauge, not a gate: it reads a reply on
// each of the Seven Virtues separately (0-100) and reports Coherent only when every virtue
// reads at or above the threshold. A fracture in one virtue propagates to all (Canon v2.0,
// Gate: Integrity Propagation — weakest-link logic applies).
//
// The readings come from an injected scorer. Per N13-N15 that scorer is a separate, small,
// embedded model, never the model that wrote the reply, and it receives only the candidate
// reply and the Seven Virtues. Its output is untrusted: it is validated here, and anything
// that is not seven finite readings in range is a GaugeError, never a guessed reading.
// The threshold and the weakest-link rule stay in code, so the scorer never selects a route.

export const SEVEN_VIRTUES = [
  'Honesty',
  'Respect',
  'Attention',
  'Affection',
  'Loyalty',
  'Trust',
  'Communication',
] as const;

export type Virtue = (typeof SEVEN_VIRTUES)[number];

export type VirtueReadings = Record<Virtue, number>;

/** The coherence threshold (P17 decision 5), named so it can be tuned without touching logic. */
export const IRG_THRESHOLD = 70;

/** Reads a candidate reply on the Seven Virtues. Returns `unknown` so its payload is validated. */
export type IrgScorer = (reply: string, virtues: readonly Virtue[]) => Promise<unknown>;

export interface IrgReading {
  coherent: boolean;
  readings: VirtueReadings;
  /** Every virtue that read below the threshold, in canonical order. */
  belowThreshold: Virtue[];
  threshold: number;
}

/** The gauge could not produce a valid reading. Fail-closed: the reply is withheld. */
export class GaugeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GaugeError';
  }
}

/** Validate an untrusted scorer payload as exactly seven finite readings in 0-100. */
export function validateReadings(raw: unknown): VirtueReadings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new GaugeError('Gauge readings are not a structured object.');
  }
  const record = raw as Record<string, unknown>;
  const readings = {} as VirtueReadings;
  for (const virtue of SEVEN_VIRTUES) {
    const value = record[virtue];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new GaugeError(`Gauge reading for ${virtue} is missing or outside 0-100.`);
    }
    readings[virtue] = value;
  }
  return readings;
}

/** Apply the threshold with weakest-link logic. */
export function readIrg(readings: VirtueReadings, threshold: number = IRG_THRESHOLD): IrgReading {
  const belowThreshold = SEVEN_VIRTUES.filter((virtue) => readings[virtue] < threshold);
  return { coherent: belowThreshold.length === 0, readings, belowThreshold, threshold };
}
