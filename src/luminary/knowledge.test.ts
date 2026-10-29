import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { DEFAULT_APOTHECARY_CATALOG, type ApothecaryItem } from '../engine/relationEngine';
import { APOTHECARY_BEGIN, APOTHECARY_END, KNOWLEDGE_PACK_PATH, apothecaryKnowledge, describeElement, withApothecarySection } from './knowledge';

test('the Knowledge Pack matches the Apothecary (run scripts/luminary-knowledge.ts after changing the catalog)', () => {
  const pack = readFileSync(KNOWLEDGE_PACK_PATH, 'utf8');
  assert.equal(pack, withApothecarySection(pack, apothecaryKnowledge(DEFAULT_APOTHECARY_CATALOG)));
});

test('every Apothecary Element is described, with its children named', () => {
  const text = apothecaryKnowledge(DEFAULT_APOTHECARY_CATALOG);
  for (const item of DEFAULT_APOTHECARY_CATALOG) {
    assert.ok(text.includes(`**${item.name}** (${item.category}; ${item.id};`), item.id);
    assert.ok(text.includes(item.description), item.id);
  }
  assert.match(text, /Request Validator\*\* \(Satellites; sat-request-validator; trust Canonical; v[\d.]+; Validation class\)/);
  assert.match(text, /Actuators: Payload Serializer\./);
});

test('categories follow the Element model order, and a missing child is named as missing', () => {
  const item = (id: string, category: string, extra: Partial<ApothecaryItem> = {}): ApothecaryItem => ({
    id, name: id.toUpperCase(), category: category as ApothecaryItem['category'], trust: 'Draft', description: `${id} does a thing.`,
    version: '0.1.0', memoryReq: 1, threadsReq: 1, capabilities: [], requirements: [], ...extra,
  });
  const text = apothecaryKnowledge([item('f', 'Formulas'), item('o', 'Orbs', { satellites: ['gone'] }), item('s', 'Satellites')]);
  assert.ok(text.indexOf('### Orbs') < text.indexOf('### Satellites'));
  assert.ok(text.indexOf('### Satellites') < text.indexOf('### Formulas'));
  assert.match(text, /Satellites: gone \(not in the Apothecary\)\./);
  assert.match(text, /Capabilities: none\. Requirements: none\./);
});

test('the generated section is replaced between its markers, and missing markers are refused', () => {
  const pack = `head\n${APOTHECARY_BEGIN}\nold\n${APOTHECARY_END}\ntail`;
  assert.equal(withApothecarySection(pack, 'new'), `head\n${APOTHECARY_BEGIN}\nnew\n${APOTHECARY_END}\ntail`);
  assert.throws(() => withApothecarySection('no markers', 'new'), /markers/);
});

test("the 'Add selection' chip describes an Element in the pack's words", () => {
  const orb = DEFAULT_APOTHECARY_CATALOG.find((item) => item.id === 'orb-http-gateway')!;
  const text = describeElement(orb, DEFAULT_APOTHECARY_CATALOG);
  assert.ok(apothecaryKnowledge(DEFAULT_APOTHECARY_CATALOG).includes(text));
  assert.match(text, /Satellites: Request Validator, Rate Limiter, Structured Logger\./);
});
