import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composePrompt, findChange, parseReply, readPromptFrame } from './blocks.ts';

const fence = (lang: string, body: string) => '```' + lang + '\n' + body + '\n```';

test('parseReply splits text, code, an Offering and a change in order', () => {
  const offering = JSON.stringify({ title: 'Note', purpose: 'Keep it', sections: [{ heading: 'A', body: 'B' }] });
  const change = JSON.stringify({ summary: 'Edit', files: [{ path: 'docs/a.md', content: 'x' }] });
  const parts = parseReply(`Intro\n${fence('ts', 'const a = 1;')}\nMiddle\n${fence('luminary-offering', offering)}\n${fence('luminary-change', change)}\nEnd`);
  assert.deepEqual(parts.map((part) => part.kind), ['text', 'code', 'text', 'offering', 'change', 'text']);
});

test('a malformed block is reported, never guessed into shape', () => {
  const parts = parseReply(fence('luminary-offering', '{"title":"x"}') + '\n' + fence('luminary-change', 'not json'));
  assert.deepEqual(parts, [
    { kind: 'malformed', block: 'offering', reason: 'The offering has no purpose.' },
    { kind: 'malformed', block: 'change', reason: 'The block is not valid JSON.' },
  ]);
});

test('findChange names a missing change instead of inventing one', () => {
  assert.equal(findChange('Just words.'), 'The reply proposes no code change.');
});

test('composePrompt and readPromptFrame round-trip the frame', () => {
  const prompt = composePrompt({ mode: 'CODE', level: 'guided', context: [{ label: 'Selected', text: 'Orb A' }], message: 'Explain this', task: { allowedFiles: ['a.ts', 'b.ts'] } });
  assert.deepEqual(readPromptFrame(prompt), { mode: 'CODE', level: 'guided', allowedFiles: ['a.ts', 'b.ts'], message: 'Explain this' });
});
