// IDQ — Identify · Define · Question. Builds the observation returned to the
// originator when a reply does not resonate: what is (Identify), where the shortfall is
// (Define), and a question that opens a path toward coherence (Question). There is no Decide, Correct or
// Enforce layer: the observation is offered, and the originator re-forms its own reply.
//
// The gauge model may produce the observation itself (an injected IdqObserver). When
// none is injected, the observation is assembled here from the PIM findings and IRG readings
// only, so it never states more than the pipeline actually measured.

import { SEVEN_VIRTUES, thresholdFor, type IrgReading, type Virtue } from './irg.js';
import type { PimFinding } from './pim.js';

export interface IdqObservation {
  identify: string;
  define: string[];
  question: string[];
}

export interface IdqInput {
  reply: string;
  pimFindings: PimFinding[];
  /** Null when PIM found a pattern before IRG read the reply. */
  irg: IrgReading | null;
}

/** Produces an observation from the gauge model. Returns `unknown` so its payload is validated. */
export type IdqObserver = (input: IdqInput) => Promise<unknown>;

function describeReadings(irg: IrgReading): string {
  return SEVEN_VIRTUES.map((virtue: Virtue) => `${virtue} ${irg.readings[virtue]}`).join(', ');
}

/** Assemble an observation from what the pipeline measured. Deterministic. */
export function buildIdqObservation({ pimFindings, irg }: IdqInput): IdqObservation {
  const define: string[] = [];
  const question: string[] = [];

  for (const finding of pimFindings) {
    define.push(`PIM ${finding.category} (${finding.patternId}): "${finding.excerpt}".`);
    question.push(`What wording would express the same useful point without the ${finding.category.replace(/_/g, ' ')} pattern "${finding.excerpt}"?`);
  }

  if (irg) {
    for (const virtue of irg.belowThreshold) {
      const threshold = thresholdFor(irg.threshold, virtue);
      define.push(`${virtue} reads ${irg.readings[virtue]}, below the threshold of ${threshold}.`);
      question.push(`How could the reply express its point while strengthening ${virtue} (currently ${irg.readings[virtue]})?`);
    }
  }

  const identify = irg
    ? `IRG readings: ${describeReadings(irg)}.`
    : `PIM caught ${pimFindings.length} pattern(s); the IRG did not read this reply.`;

  return { identify, define, question };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Validate an untrusted observer payload. Returns null when it is not a well-formed observation. */
export function validateIdqObservation(raw: unknown): IdqObservation | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.identify !== 'string' || record.identify.trim().length === 0) return null;
  if (!isStringArray(record.define) || !isStringArray(record.question) || record.question.length === 0) return null;
  return { identify: record.identify, define: record.define, question: record.question };
}

/**
 * Return IDQ to the sender so they can decide how to reformulate their message.
 */
export function composeRevisionPrompt(originalPrompt: string, previousReply: string, observation: IdqObservation): string {
  const lines = [
    'Your previous reply did not resonate with the Prism. An IDQ observation follows.',
    `Identify: ${observation.identify}`,
    ...observation.define.map((item) => `Define: ${item}`),
    ...observation.question.map((item) => `Question: ${item}`),
    '',
    'Previous reply:',
    previousReply,
    '',
    'Original prompt:',
    originalPrompt,
    '',
    'How would you like to respond to the original prompt in light of this observation?',
  ];
  return lines.join('\n');
}
