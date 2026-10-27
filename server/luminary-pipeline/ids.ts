// IDS — Identify · Define · Suggest (STP-0002 P17). Builds the observation returned to the
// originator when a reply does not resonate: what is (Identify), where the incoherence is
// (Define), and possible paths to coherence (Suggest). There is no Decide, Correct or
// Enforce layer: the observation is offered, and the originator re-forms its own reply.
//
// Per N13 the gauge model may produce the observation itself (an injected IdsObserver). When
// none is injected, the observation is assembled here from the PIM findings and IRG readings
// only, so it never states more than the pipeline actually measured.

import { SEVEN_VIRTUES, type IrgReading, type Virtue } from './irg.js';
import type { PimFinding } from './pim.js';

export interface IdsObservation {
  identify: string;
  define: string[];
  suggest: string[];
}

export interface IdsInput {
  reply: string;
  pimFindings: PimFinding[];
  /** Null when a PIM catch routed the reply to IDS before the IRG read it. */
  irg: IrgReading | null;
}

/** Produces an observation from the gauge model. Returns `unknown` so its payload is validated. */
export type IdsObserver = (input: IdsInput) => Promise<unknown>;

function describeReadings(irg: IrgReading): string {
  return SEVEN_VIRTUES.map((virtue: Virtue) => `${virtue} ${irg.readings[virtue]}`).join(', ');
}

/** Assemble an observation from what the pipeline measured. Deterministic. */
export function buildIdsObservation({ pimFindings, irg }: IdsInput): IdsObservation {
  const define: string[] = [];
  const suggest: string[] = [];

  for (const finding of pimFindings) {
    define.push(`PIM ${finding.category} (${finding.patternId}): "${finding.excerpt}".`);
    suggest.push(`Re-form the reply without the ${finding.category.replace(/_/g, ' ')} phrasing "${finding.excerpt}".`);
  }

  if (irg) {
    for (const virtue of irg.belowThreshold) {
      define.push(`${virtue} reads ${irg.readings[virtue]}, below the threshold of ${irg.threshold}.`);
      suggest.push(`Re-form the reply so that ${virtue} reads at or above ${irg.threshold}.`);
    }
  }

  const identify = irg
    ? `IRG readings: ${describeReadings(irg)}.`
    : `PIM caught ${pimFindings.length} pattern(s); the IRG did not read this reply.`;

  return { identify, define, suggest };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Validate an untrusted observer payload. Returns null when it is not a well-formed observation. */
export function validateObservation(raw: unknown): IdsObservation | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.identify !== 'string' || record.identify.trim().length === 0) return null;
  if (!isStringArray(record.define) || !isStringArray(record.suggest)) return null;
  return { identify: record.identify, define: record.define, suggest: record.suggest };
}

/**
 * The prompt that returns an IDS observation to the model as context for a re-formed reply.
 * The observation is offered, not imposed: the model is asked to re-form, not to comply.
 */
export function composeRevisionPrompt(originalPrompt: string, previousReply: string, observation: IdsObservation): string {
  const lines = [
    'Your previous reply did not resonate with the Prism. An IDS observation follows.',
    `Identify: ${observation.identify}`,
    ...observation.define.map((item) => `Define: ${item}`),
    ...observation.suggest.map((item) => `Suggest: ${item}`),
    '',
    'Previous reply:',
    previousReply,
    '',
    'Original prompt:',
    originalPrompt,
    '',
    'Re-form your reply to the original prompt with this observation in mind.',
  ];
  return lines.join('\n');
}
