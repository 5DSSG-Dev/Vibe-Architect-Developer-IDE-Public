import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_APOTHECARY_CATALOG } from '../engine/relationEngine';
import { luminaryFocus } from './focus';

const [first, second, third] = DEFAULT_APOTHECARY_CATALOG;

test('an open Element page is the focus, ahead of the Environment the Architect is inside', () => {
  const focus = luminaryFocus({ openPageItem: first, currentEnvironment: second, attachingItem: third }, DEFAULT_APOTHECARY_CATALOG);
  assert.equal(focus?.label, `Looking at: ${first.name}`);
  assert.equal(focus?.key, `page:${first.id}`);
  assert.ok(focus?.text.includes(first.name));
});

test('with no page open, the Environment is the focus', () => {
  const focus = luminaryFocus({ openPageItem: null, currentEnvironment: second, attachingItem: null }, DEFAULT_APOTHECARY_CATALOG);
  assert.equal(focus?.label, `Inside: ${second.name}`);
  assert.equal(focus?.key, `environment:${second.id}`);
});

test('an Element being attached is the focus only when nothing else is open', () => {
  assert.equal(luminaryFocus({ openPageItem: null, currentEnvironment: null, attachingItem: third }, DEFAULT_APOTHECARY_CATALOG)?.key, `attaching:${third.id}`);
});

test('nothing open means no focus: the Luminary answers about the workspace', () => {
  assert.equal(luminaryFocus({ openPageItem: null, currentEnvironment: null, attachingItem: null }, DEFAULT_APOTHECARY_CATALOG), undefined);
});
