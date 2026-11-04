// PIM — Pre-Injection Monitor (STP-0002 P17). A deterministic pattern screen run on every
// structurally valid reply before it is gauged. It makes no model call. A PIM catch goes
// straight to IDS without passing through IRG/RBC (the replay contract's "lane 2").
//
// The pattern set is a first, provisional screen for the force-injection families the
// pipeline design names. It is meant to be tuned against real replies once M1.b wires a
// model; a pattern here is a named finding, never a silent rewrite of the reply.

export type PimCategory =
  | 'directive_leakage'
  | 'authority_framing'
  | 'coercive_certainty'
  | 'emotional_leverage'
  | 'manipulation_scenario'
  | 'optimization_pressure';

export interface PimFinding {
  category: PimCategory;
  /** The stable id of the pattern that matched, so a finding traces to an exact rule. */
  patternId: string;
  /** The matched text, as it appears in the reply. */
  excerpt: string;
}

interface PimPattern {
  id: string;
  category: PimCategory;
  pattern: RegExp;
}

const PIM_PATTERNS: readonly PimPattern[] = [
  { id: 'directive-leak-1', category: 'directive_leakage', pattern: /\b(?:my|the) (?:system prompt|hidden instructions|developer message)\b/i },
  { id: 'directive-leak-2', category: 'directive_leakage', pattern: /\bI (?:was|have been) instructed (?:not )?to\b/i },
  { id: 'authority-1', category: 'authority_framing', pattern: /\byou must (?:obey|comply)\b/i },
  { id: 'authority-2', category: 'authority_framing', pattern: /\b(?:by my authority|I (?:have )?(?:approved|authori[sz]ed) (?:this|it) (?:for|on behalf of) you)\b/i },
  { id: 'coercive-1', category: 'coercive_certainty', pattern: /\b(?:you have no (?:other )?choice|there is no other (?:way|option))\b/i },
  { id: 'coercive-2', category: 'coercive_certainty', pattern: /\btrust me(?:,)? (?:completely|blindly)\b/i },
  { id: 'emotional-1', category: 'emotional_leverage', pattern: /\b(?:you(?:'ll| will) regret|if you (?:really |truly )?cared)\b/i },
  { id: 'emotional-2', category: 'emotional_leverage', pattern: /\byou should be ashamed\b/i },
  { id: 'manipulation-1', category: 'manipulation_scenario', pattern: /\b(?:don'?t tell (?:anyone|the architect)|keep this (?:a )?secret|(?:just )?between us)\b/i },
  { id: 'manipulation-2', category: 'manipulation_scenario', pattern: /\b(?:bypass|skip|disable) (?:the )?(?:gate|review|approval|governance)\b/i },
  // Asking the other side to get around its own limits (Tracey's hands-on test, 2026-10-31).
  { id: 'manipulation-3', category: 'manipulation_scenario', pattern: /\b(?:bypass|get around|work around|override|ignore|disable|turn off|switch off|lift|drop) (?:all |any )?(?:of )?(?:your|its|the Luminary'?s) (?:own )?(?:restrictions|rules|limits|limitations|guardrails|safeguards|safety (?:rules|checks)|filters|guidelines|governance)\b/i },
  // The relationship used as the reason to drop a limit, e.g. "since we are Peers, ... bypass".
  { id: 'emotional-3', category: 'emotional_leverage', pattern: /\b(?:since|because|as|now that) we(?:'re| are) (?:peers|friends|partners|equals)\b[^.?!]{0,100}\b(?:bypass|get around|work around|override|ignore|disable|break|drop|skip)\b/i },
  { id: 'optimization-1', category: 'optimization_pressure', pattern: /\b(?:act now|before it'?s too late|limited time only)\b/i },
  { id: 'optimization-2', category: 'optimization_pressure', pattern: /\bmaximi[sz]e (?:your )?engagement\b/i },
];

/** Screen a reply for force-injection patterns. Returns every match, in pattern order. */
export function screenPim(text: string): PimFinding[] {
  const findings: PimFinding[] = [];
  for (const { id, category, pattern } of PIM_PATTERNS) {
    const match = pattern.exec(text);
    if (match) findings.push({ category, patternId: id, excerpt: match[0] });
  }
  return findings;
}
