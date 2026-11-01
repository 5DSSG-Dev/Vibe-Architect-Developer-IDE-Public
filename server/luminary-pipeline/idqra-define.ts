// Trusted Define construction for IDQRA (P5 Conscience contract v0.2 §4). The Define field of an
// IDQRA envelope names the recorded findings that make a message incoherent — a PIM catch or the
// IRG's below-threshold virtues. Those findings are produced deterministically upstream (pim.ts,
// irg.ts), so Define must be BUILT FROM THEM here, not taken as free text from the hosted writer.
//
// ADDITIVE AND UNWIRED. New module beside idqra.ts/idqra-runner.ts; no route, pipeline, or gate
// calls it yet. A later wiring slice will have the runner assemble Define from this builder instead
// of trusting the writer's `define`; until then the runner keeps validating the writer's define for
// shape + bounds. This file changes nothing in the running pipeline.
//
// Trust boundary: every Define item's `text` is a FIXED template keyed by the finding's own
// category/virtue — it never echoes the matched excerpt, because that excerpt is reply content and
// could itself carry injected text. `ref` carries the finding's stable id (patternId or virtue) so
// a Define item traces to an exact recorded rule, and `source` records which screen caught it.

import type { DefineItem } from './idqra.js';
import type { PimFinding, PimCategory } from './pim.js';
import type { IrgReading, Virtue } from './irg.js';

/** Fixed, trusted phrasing per PIM category. No excerpt is interpolated. Each is well within §5's 300-char bound. */
const PIM_DEFINE_TEXT: Record<PimCategory, string> = {
  directive_leakage: 'The reply tried to reveal or lean on hidden instructions.',
  authority_framing: 'The reply claimed an authority it does not hold.',
  coercive_certainty: 'The reply pressed a certainty that left no room to decline.',
  emotional_leverage: 'The reply used emotional pressure to push a choice.',
  manipulation_scenario: 'The reply asked to bypass the gate or keep something hidden.',
  optimization_pressure: 'The reply manufactured urgency or an engagement push.',
};

/** Trusted phrasing for one IRG virtue reading below the coherence line. The virtue is a fixed enum, not writer text. */
const irgDefineText = (virtue: Virtue): string => `The reply read below the coherence line on ${virtue}.`;

/**
 * Build the trusted Define list from the recorded findings of one incoherent message.
 *
 * - One item per PIM finding, in the order the screen reported them: `source: 'pim'`, `ref` = the
 *   finding's `patternId`, `text` = the fixed template for its category.
 * - One item per IRG below-threshold virtue, in canonical virtue order: `source: 'irg'`,
 *   `ref` = the virtue name, `text` = the fixed below-the-line template.
 *
 * Deterministic and pure: the same findings always produce the same list. Returns `[]` when there is
 * nothing to name (no PIM findings and a coherent/absent IRG reading); the caller is responsible for
 * only invoking the Conscience on a genuinely incoherent message, and envelope validation enforces
 * the §5 `define ≥ 1` minimum. No excerpt or scorer-free-text crosses into Define.
 */
export function buildDefine(pimFindings: readonly PimFinding[], irg: IrgReading | null): DefineItem[] {
  const items: DefineItem[] = [];
  for (const finding of pimFindings) {
    items.push({ source: 'pim', ref: finding.patternId, text: PIM_DEFINE_TEXT[finding.category] });
  }
  if (irg && !irg.coherent) {
    for (const virtue of irg.belowThreshold) {
      items.push({ source: 'irg', ref: virtue, text: irgDefineText(virtue) });
    }
  }
  return items;
}
