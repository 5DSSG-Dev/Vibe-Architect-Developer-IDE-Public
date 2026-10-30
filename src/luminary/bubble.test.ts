import assert from 'node:assert/strict';
import test from 'node:test';

import { bubbleText, clearBubble, currentBubble, readSpeakIn, sayInBubble, subscribeBubble } from './bubble';

test('a short reply goes into the bubble whole', () => {
  assert.equal(bubbleText('An Orb docks to the CORE through an Umbilical handshake.'), 'An Orb docks to the CORE through an Umbilical handshake.');
});

test('a long reply keeps its first sentences and points to the panel', () => {
  const long = `${'The Orb holds documents. '.repeat(12)}Last sentence.`;
  const text = bubbleText(long);
  assert.ok(text.length <= 220 + ' (More in the panel.)'.length);
  assert.ok(text.endsWith('(More in the panel.)'));
  assert.ok(text.startsWith('The Orb holds documents.'));
});

test('code never goes into the bubble', () => {
  assert.equal(bubbleText('Here is the limiter.\n\n```ts\nexport const limit = 10;\n```'), 'Here is the limiter. (More in the panel.)');
  assert.equal(bubbleText('```ts\nexport const limit = 10;\n```'), 'I wrote some code. It is in the panel.');
});

test('the bubble store shows the newest words and clears', () => {
  const seen: (string | null)[] = [];
  const stop = subscribeBubble((line) => seen.push(line?.text ?? null));
  sayInBubble('first');
  sayInBubble('second');
  assert.equal(currentBubble()?.text, 'second');
  clearBubble();
  stop();
  assert.deepEqual(seen, ['first', 'second', null]);
});

test('without storage the Luminary speaks in both places', () => {
  assert.equal(readSpeakIn(), 'both');
});
