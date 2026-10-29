import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_APOTHECARY_CATALOG, ensureElementCodeFrame } from '../engine/relationEngine';
import { readPromptFrame } from './blocks';
import { ELEMENT_CODE_MARKER, composeElementCodePrompt, lineDiff, readElementCodeProposal } from './elementCode';

const item = ensureElementCodeFrame(DEFAULT_APOTHECARY_CATALOG.find((entry) => entry.id === 'sat-rate-limiter')!);

test('the prompt carries the Element, its code frame and the request, and nothing else', () => {
  const prompt = composeElementCodePrompt({ item, catalog: DEFAULT_APOTHECARY_CATALOG, frame: item.codeFrame, source: 'export const x = 1;', request: 'Allow 10 requests a second.', level: 'plain', mode: 'DESIGN' });
  assert.match(prompt, /\[Context: This Element\]\n- \*\*Rate Limiter\*\* \(Satellites; sat-rate-limiter/);
  assert.match(prompt, /\[Context: Element code frame\]\nLanguage: TypeScript\nFile: .+\nEntrypoint: .+\nCurrent source:\n```typescript\nexport const x = 1;\n```/);
  const frame = readPromptFrame(prompt);
  assert.equal(frame.level, 'plain');
  assert.equal(frame.allowedFiles, null, 'not a coding task');
  assert.ok(frame.message.startsWith('Allow 10 requests a second.'));
  assert.ok(frame.message.includes(ELEMENT_CODE_MARKER));
});

test('exactly one code block becomes the proposal, with the words around it as the explanation', () => {
  assert.deepEqual(readElementCodeProposal('It now counts requests.\n\n```typescript\nexport const limit = 10;\n```\n\nAccept to use it.'), {
    ok: true, code: 'export const limit = 10;', explanation: 'It now counts requests.\n\nAccept to use it.',
  });
});

test('no code, two blocks or an empty block give a plain reason, never a guess', () => {
  assert.equal(readElementCodeProposal('I would rather explain first.').ok, false);
  const two = readElementCodeProposal('```ts\na\n```\n```ts\nb\n```');
  assert.equal(two.ok, false);
  assert.match((two as { reason: string }).reason, /2 code blocks/);
  assert.equal(readElementCodeProposal('```ts\n\n```').ok, false);
});

test('the diff marks removed and added lines and keeps the rest', () => {
  assert.deepEqual(lineDiff('a\nb\nc', 'a\nB\nc\nd'), [
    { kind: 'same', text: 'a' },
    { kind: 'removed', text: 'b' },
    { kind: 'added', text: 'B' },
    { kind: 'same', text: 'c' },
    { kind: 'added', text: 'd' },
  ]);
});
