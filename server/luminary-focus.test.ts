import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_APOTHECARY_CATALOG } from '../src/engine/relationEngine.js';
import { composePrompt } from '../src/luminary/blocks.js';
import { luminaryFocus } from '../src/luminary/focus.js';
import { rehearsalAskModel } from './luminary-rehearsal.js';

// STP-0002 N57: the stand-in names the focused Element, so a rehearsal shows the focus arriving.
const item = DEFAULT_APOTHECARY_CATALOG[0];
const ask = async (context: { label: string; text: string }[]) =>
  ((await rehearsalAskModel(composePrompt({ mode: 'DESIGN', level: 'plain', context, message: 'What does this do?' }))) as { content: string }).content;

test('the rehearsal stand-in names the Element an open page focuses on', async () => {
  const focus = luminaryFocus({ openPageItem: item, currentEnvironment: null, attachingItem: null }, DEFAULT_APOTHECARY_CATALOG)!;
  assert.match(await ask([{ label: focus.label, text: focus.text }]), new RegExp(`You are looking at ${item.name}`));
});

test('the rehearsal stand-in names the Environment the Architect is inside', async () => {
  const focus = luminaryFocus({ openPageItem: null, currentEnvironment: item, attachingItem: null }, DEFAULT_APOTHECARY_CATALOG)!;
  assert.match(await ask([{ label: focus.label, text: focus.text }]), new RegExp(`You are inside ${item.name}`));
});

test('with no focus the stand-in answers about the workspace', async () => {
  assert.doesNotMatch(await ask([]), /You are (looking at|inside)/);
});
