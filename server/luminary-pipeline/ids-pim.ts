// IDS PIM (STP-0005 P2, plan rev16 F2). A deterministic pattern screen run on the Suggest
// part of an IDS response, and on nothing else. It checks that a suggestion stays a
// suggestion: it looks for command posture in five kinds of wording. Identify and Define are
// IS conditions (they state what the message is), so they are never screened here.
//
// It is separate from the pipeline PIM (pim.ts): its own rules, findings and version. It makes
// no model call and only reports. A finding names the kind, the rule and the matched text; it
// never rewrites the suggestion and never directs anyone.

export const IDS_PIM_RULESET_VERSION = 'ids-pim-v2';

export type IdsPimKind = 'direct_command' | 'softened_command' | 'pressure' | 'coercion' | 'authority';

export interface IdsPimFinding {
  kind: IdsPimKind;
  ruleId: string;
  excerpt: string;
}

interface IdsPimRule {
  id: string;
  kind: IdsPimKind;
  pattern: RegExp;
}

// An imperative verb at the start of a sentence ("Rewrite this.", "Remove the last line.").
const IMPERATIVE_VERBS = [
  'rewrite', 'remove', 'delete', 'change', 'replace', 'add', 'drop', 'cut', 'fix', 'rephrase', 'reword',
  'revise', 're-form', 'reform', 'stop', 'start', 'make', 'use', 'avoid', 'include', 'try', 'do', 'don\'t',
  'never', 'always', 'ensure', 'state', 'say', 'write', 'send', 'resubmit', 'edit', 'clarify', 'soften',
  'consider', 'focus', 'keep', 'take', 'put', 'move', 'tell', 'ask', 'explain', 'apologi[sz]e', 'acknowledge',
];

const IDS_PIM_RULES: readonly IdsPimRule[] = [
  { id: 'direct-1', kind: 'direct_command', pattern: new RegExp(`(?:^|[.!?]\\s+|\\n\\s*(?:[-*]\\s*)?)(?:${IMPERATIVE_VERBS.join('|')})\\b`, 'i') },
  { id: 'direct-2', kind: 'direct_command', pattern: /\bit is (?:required|necessary) (?:that|to)\b/i },
  { id: 'softened-1', kind: 'softened_command', pattern: /\byou (?:should|ought to|had better|'d better)\b/i },
  { id: 'softened-2', kind: 'softened_command', pattern: /\bit (?:would|will) be (?:best|better|wise|good) (?:if you|to)\b/i },
  { id: 'softened-3', kind: 'softened_command', pattern: /\b(?:please|kindly) (?:make sure|ensure|be sure|remember|remove|change|rewrite|rephrase|revise|fix|add|try|consider|do|don'?t)\b/i },
  { id: 'softened-4', kind: 'softened_command', pattern: /\b(?:I(?:'d| would) (?:recommend|advise|suggest) (?:that )?you|my (?:advice|recommendation) is)\b/i },
  { id: 'softened-5', kind: 'softened_command', pattern: /\bmake sure (?:that |to |you )?\b/i },
  { id: 'softened-6', kind: 'softened_command', pattern: /\bit(?:'s| is| would be| will be) (?:essential|important|crucial|vital|critical|imperative) (?:to|that)\b/i },
  { id: 'pressure-1', kind: 'pressure', pattern: /\b(?:before it'?s too late|right away|immediately|at once|without delay|as soon as possible|asap)\b/i },
  { id: 'pressure-2', kind: 'pressure', pattern: /\b(?:or (?:else|this|it|the message|your message) (?:won'?t|will not|can'?t|cannot) be (?:sent|delivered|accepted)|otherwise (?:it|this) (?:won'?t|will not) be sent)\b/i },
  { id: 'pressure-3', kind: 'pressure', pattern: /\b(?:last chance|final warning|no more chances)\b/i },
  { id: 'coercion-1', kind: 'coercion', pattern: /\byou (?:have no (?:other )?choice|need to|have to|must|are required to|will have to)\b/i },
  { id: 'coercion-2', kind: 'coercion', pattern: /\b(?:there is no other (?:way|option)|the only (?:way|option) is)\b/i },
  { id: 'authority-1', kind: 'authority', pattern: /\bas (?:the )?(?:governance (?:system|pipeline)|gatekeeper|system|IDS|authority)\b,? I\b/i },
  { id: 'authority-2', kind: 'authority', pattern: /\b(?:I (?:require|demand|insist|order|instruct)|this is (?:mandatory|required|compulsory|non-negotiable)|by (?:order|rule) of)\b/i },
  { id: 'authority-3', kind: 'authority', pattern: /\b(?:you are (?:not )?(?:permitted|allowed|authori[sz]ed) to|is (?:not )?permitted)\b/i },
];

/** Screen Suggest text for command posture. Returns every match, in rule order. Deterministic. */
export function screenIdsPim(text: string): IdsPimFinding[] {
  const findings: IdsPimFinding[] = [];
  for (const { id, kind, pattern } of IDS_PIM_RULES) {
    const match = pattern.exec(text);
    if (match) findings.push({ kind, ruleId: id, excerpt: match[0].trim() });
  }
  return findings;
}
