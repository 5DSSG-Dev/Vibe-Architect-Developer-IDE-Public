// The Luminary's Knowledge Pack (STP-0002 P23): the "Elements in the Apothecary today" section is
// generated from the IDE's own catalog, so what the Luminary is told matches what the Architect
// sees. The generated text sits between two markers in the pack; a test fails if it drifts, and
// `npx tsx scripts/luminary-knowledge.ts` rewrites it.

import type { ApothecaryItem } from '../engine/relationEngine';

export const KNOWLEDGE_PACK_PATH = 'docs/LUMINARY_KNOWLEDGE_ELEMENTS_v0.1.md';
export const APOTHECARY_BEGIN = '<!-- apothecary:begin (generated from DEFAULT_APOTHECARY_CATALOG; do not edit by hand) -->';
export const APOTHECARY_END = '<!-- apothecary:end -->';

/** The order the Element model introduces the categories in. Unknown categories follow, by name. */
const CATEGORY_ORDER = ['Cores', 'Orbs', 'Satellites', 'Actuators', 'Umbilicals', 'Portals', 'Ingredients', 'Formulas', 'Constellations'];

const list = (values: string[] | undefined) => (values && values.length > 0 ? values.join(', ') : 'none');

/** One Element in the pack's words: also the text of the panel's 'Add selection' chip. */
export function describeElement(item: ApothecaryItem, catalog: readonly ApothecaryItem[]): string {
  return describeItem(item, new Map(catalog.map((entry) => [entry.id, entry])));
}

function describeItem(item: ApothecaryItem, byId: Map<string, ApothecaryItem>): string {
  const facts = [item.id, `trust ${item.trust}`, `v${item.version}`];
  if (item.satelliteClass) facts.push(`${item.satelliteClass} class`);
  const lines = [`- **${item.name}** (${item.category}; ${facts.join('; ')}): ${item.description}`];
  lines.push(`  Capabilities: ${list(item.capabilities)}. Requirements: ${list(item.requirements)}.`);
  const name = (id: string) => byId.get(id)?.name ?? `${id} (not in the Apothecary)`;
  if (item.satellites?.length) lines.push(`  Satellites: ${item.satellites.map(name).join(', ')}.`);
  if (item.actuators?.length) lines.push(`  Actuators: ${item.actuators.map(name).join(', ')}.`);
  return lines.join('\n');
}

/** The generated section, grouped by category in the Element model's order. */
export function apothecaryKnowledge(catalog: readonly ApothecaryItem[]): string {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const categories = [...new Set(catalog.map((item) => item.category as string))].sort((a, b) => {
    const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const sections = categories.map((category) => {
    const items = catalog.filter((item) => item.category === category);
    return [`### ${category} (${items.length})`, '', ...items.map((item) => describeItem(item, byId))].join('\n');
  });
  return [`${catalog.length} Elements are in the Apothecary today.`, '', sections.join('\n\n')].join('\n');
}

/** The pack with its generated section replaced. Throws if the markers are missing. */
export function withApothecarySection(pack: string, generated: string): string {
  const begin = pack.indexOf(APOTHECARY_BEGIN);
  const end = pack.indexOf(APOTHECARY_END);
  if (begin < 0 || end < begin) throw new Error('The Knowledge Pack is missing its Apothecary markers.');
  return `${pack.slice(0, begin + APOTHECARY_BEGIN.length)}\n${generated}\n${pack.slice(end)}`;
}
