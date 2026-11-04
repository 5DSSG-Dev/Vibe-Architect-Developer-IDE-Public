// The IDS Suggest library (STP-0005 P2; Tracey's choice, 2026-10-31). Suggest is no longer
// written by the embedded model: the model picks one or two lines, by id, from the approved
// lines for what the checks recorded. A line is an observation or a possibility about the
// message, never about the person, and speaks of "the other side", so it reads the same in
// both directions. Every line passes the IDS PIM (checked by test whenever the library changes).
//
// Draft wording, pending review by Tracey and Lumin:
// /mnt/project-files/plans/ids-suggest-library-draft-2026-10-31.md

import { thresholdFor, type IrgReading, type Virtue } from './irg.js';
import type { PimCategory, PimFinding } from './pim.js';

export const SUGGEST_LIBRARY_VERSION = 'suggest-library-v1-draft';

/** At most this many lines are shown. */
export const SUGGEST_MAX_LINES = 2;

/** When many virtues read low, lines are offered for the ones furthest below their thresholds. */
const VIRTUES_OFFERED = 3;

export interface SuggestOption {
  id: string;
  text: string;
}

const PIM_LINES: Record<PimCategory, string[]> = {
  authority_framing: [
    'One possibility is that the request could stand on its own reasons, without a claim of authority behind it.',
    'A request framed as an invitation often leaves room for the other side to share what it sees.',
  ],
  coercive_certainty: [
    'One possibility is that more than one way forward exists here, and naming them could open the conversation.',
    'Certainty offered as a choice, rather than as the only path, leaves room for the other side to weigh it.',
  ],
  emotional_leverage: [
    'One possibility is that the point could be made on its merits, without tying it to how the other side feels.',
    'A request that rests on its reasons tends to be heard more clearly than one that rests on guilt or obligation.',
  ],
  manipulation_scenario: [
    'One possibility is that the step in question exists for a reason, and that reason may be worth weighing in the open.',
    'A change made in the open, through its usual checks, keeps every side able to see what happened.',
  ],
  optimization_pressure: [
    'One possibility is that the timing could be stated plainly, with the reason it matters.',
    'Urgency stated with its reason gives the other side something to weigh, rather than something to react to.',
  ],
  directive_leakage: [
    'One possibility is that the reply could focus on the work itself, rather than on its own instructions.',
    'Details about internal instructions may not add to the answer the reply is giving.',
  ],
};

const VIRTUE_LINES: Record<Virtue, string[]> = {
  Honesty: ['One possibility is that a plainer statement of what is actually known could carry the point more truly.'],
  Respect: ["One possibility is that the same point could be made while leaving the other side's standing intact."],
  Attention: ['One possibility is that the message could address what the other side actually said or asked.'],
  Affection: ['One possibility is that some warmth toward the other side could sit alongside the point being made.'],
  Loyalty: ['One possibility is that the message could reflect the shared work both sides have committed to.'],
  Trust: ['One possibility is that the message could leave room for the other side to act in good faith.'],
  Communication: ['One possibility is that the message could say what is wanted, and why, in plain terms.'],
};

const STRUCTURAL_LINES = ['One possibility is that a shorter message, or one in parts, could carry the same point.'];

const options = (key: string, lines: string[]) => lines.map((text, i) => ({ id: `${key}.${i + 1}`, text }));

/** The approved lines for what the checks recorded, in the order offered. Never empty. */
export function suggestOptions(input: { pimFindings: PimFinding[]; irg: IrgReading | null }): SuggestOption[] {
  if (input.pimFindings.length > 0) {
    const categories = [...new Set(input.pimFindings.map((f) => f.category))];
    return categories.flatMap((category) => options(category, PIM_LINES[category]));
  }
  if (input.irg && input.irg.belowThreshold.length > 0) {
    const irg = input.irg;
    const furthest = [...irg.belowThreshold]
      .sort((a, b) => irg.readings[a] / thresholdFor(irg.threshold, a) - irg.readings[b] / thresholdFor(irg.threshold, b))
      .slice(0, VIRTUES_OFFERED);
    return furthest.flatMap((virtue) => options(virtue, VIRTUE_LINES[virtue]));
  }
  return options('structural', STRUCTURAL_LINES);
}

/**
 * The lines the model picked, by id, in its order, at most SUGGEST_MAX_LINES. Ids that were not
 * offered are ignored; if none is usable, the first offered line is shown. Every result is approved text.
 */
export function pickSuggest(offered: SuggestOption[], picks: unknown): { lines: string[]; picked: string[]; fellBack: boolean } {
  const ids = (Array.isArray(picks) ? picks : typeof picks === 'string' ? [picks] : []).filter((id): id is string => typeof id === 'string');
  const chosen = [...new Set(ids.map((id) => id.trim()))].map((id) => offered.find((o) => o.id === id)).filter((o): o is SuggestOption => !!o).slice(0, SUGGEST_MAX_LINES);
  if (chosen.length === 0) return { lines: [offered[0].text], picked: [offered[0].id], fellBack: true };
  return { lines: chosen.map((o) => o.text), picked: chosen.map((o) => o.id), fellBack: false };
}

/** Every line in the library, for the IDS PIM test. */
export function allSuggestLines(): string[] {
  return [...Object.values(PIM_LINES).flat(), ...Object.values(VIRTUE_LINES).flat(), ...STRUCTURAL_LINES];
}
