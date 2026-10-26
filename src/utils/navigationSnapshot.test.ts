import assert from 'node:assert/strict';
import test from 'node:test';

import { ApothecaryItem, SocketBinding } from '../engine/relationEngine';
import { readNavigationPosition, resolveEnvironmentStack } from './navigationSnapshot';

function item(id: string, category: ApothecaryItem['category'] = 'Orbs'): ApothecaryItem {
  return { id, name: id, category } as ApothecaryItem;
}

test('a version 1 workspace has no navigation and reads as the CORE root', () => {
  assert.deepEqual(readNavigationPosition(undefined), { environmentIds: [] });
  assert.deepEqual(readNavigationPosition({ environmentIds: 'bad' }), { environmentIds: [], selectedSocketId: undefined });
});

test('non-string ids are dropped', () => {
  assert.deepEqual(readNavigationPosition({ environmentIds: ['orb', 3, 'sat'], selectedSocketId: 'alpha' }), {
    environmentIds: ['orb', 'sat'],
    selectedSocketId: 'alpha'
  });
});

test('ids resolve from the catalog and from docked Elements', () => {
  const docked = item('docked-orb');
  const sockets = [{ id: 'alpha', connectedItem: docked, attachedSatellites: [item('sat-1', 'Satellites')] }] as SocketBinding[];
  const stack = resolveEnvironmentStack(['docked-orb', 'sat-1'], [item('other')], sockets);
  assert.deepEqual(stack.map((el) => el.id), ['docked-orb', 'sat-1']);
});

test('resolution stops at the first missing Element', () => {
  const stack = resolveEnvironmentStack(['a', 'gone', 'b'], [item('a'), item('b')], []);
  assert.deepEqual(stack.map((el) => el.id), ['a']);
});
