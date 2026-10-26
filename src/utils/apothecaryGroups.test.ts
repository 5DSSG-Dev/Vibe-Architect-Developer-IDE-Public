import assert from 'node:assert/strict';
import test from 'node:test';

import { ApothecaryItem } from '../engine/relationEngine';
import { groupCatalogByCategory } from './apothecaryGroups';

const item = (id: string, category: ApothecaryItem['category']) => ({ id, category }) as ApothecaryItem;

test('groups follow the docking path order and keep item order', () => {
  const groups = groupCatalogByCategory([
    item('u1', 'Umbilicals'),
    item('s1', 'Satellites'),
    item('o1', 'Orbs'),
    item('s2', 'Satellites'),
    item('o2', 'Orbs')
  ]);
  assert.deepEqual(groups.map((g) => g.category), ['Orbs', 'Satellites', 'Umbilicals']);
  assert.deepEqual(groups[1].items.map((i) => i.id), ['s1', 's2']);
});

test('empty input gives no groups', () => {
  assert.deepEqual(groupCatalogByCategory([]), []);
});
