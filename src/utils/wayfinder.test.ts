import assert from 'node:assert/strict';
import test from 'node:test';

import { describeCurrentTask } from './wayfinder';

const base = { environmentStack: [], childCount: 0, dockedOrbCount: 0 };

test('DESIGN root asks for a first Orb when nothing is docked', () => {
  assert.match(describeCurrentTask({ ...base, mode: 'DESIGN' }), /dock it to the CORE/);
});

test('DESIGN root points at docked Orbs so the drill-down is discoverable', () => {
  assert.match(describeCurrentTask({ ...base, mode: 'DESIGN', dockedOrbCount: 2 }), /Click a docked Orb/);
});

test('inside an Orb the next step is a Satellite', () => {
  const task = describeCurrentTask({
    ...base,
    mode: 'DESIGN',
    environmentStack: [{ name: 'HTTP API Gateway', category: 'Orbs' }],
    childCount: 3
  });
  assert.equal(task, 'Inside HTTP API Gateway. Click a Satellite to enter it.');
});

test('a leaf Environment says to go Back instead of leaving a dead end', () => {
  const task = describeCurrentTask({
    ...base,
    mode: 'DESIGN',
    environmentStack: [{ name: 'Orb', category: 'Orbs' }, { name: 'Sat', category: 'Satellites' }],
    childCount: 0
  });
  assert.match(task, /use Back to return/);
});

test('every other mode has a task line', () => {
  for (const mode of ['CODE', 'SIMULATE', 'DEPLOY'] as const) {
    assert.ok(describeCurrentTask({ ...base, mode }).length > 0);
  }
});
