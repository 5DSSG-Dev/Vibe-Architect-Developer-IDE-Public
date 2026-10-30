import assert from 'node:assert/strict';
import test from 'node:test';

import { canListen, canSpeak, listenErrorText, readVoiceSettings, speakableText } from './voice';

test('a plain reply is read whole, without Markdown marks', () => {
  assert.equal(speakableText('An **Orb** docks to the `CORE`.\n\n- It needs a port.'), 'An Orb docks to the CORE. It needs a port.');
});

test('code is never read aloud; it is pointed to the panel', () => {
  assert.equal(speakableText('Here is the limiter.\n\n```ts\nexport const limit = 10;\n```'), 'Here is the limiter. The code is in the panel.');
  assert.equal(speakableText('```ts\nexport const limit = 10;\n```'), 'I wrote some code. It is in the panel.');
});

test('a very long reply stops at a sentence and points to the panel', () => {
  const text = speakableText('The Orb holds documents. '.repeat(80));
  assert.ok(text.endsWith('The rest is in the panel.'));
  assert.ok(text.length <= 1200 + ' The rest is in the panel.'.length);
});

test('without a browser, Voice is off and nothing claims to speak or listen', () => {
  assert.deepEqual(readVoiceSettings(), { on: false, voiceName: '', rate: 1 });
  assert.equal(canSpeak(), false);
  assert.equal(canListen(), false);
});

test('a refused microphone is explained in plain words', () => {
  assert.match(listenErrorText('not-allowed'), /did not allow the microphone/);
  assert.equal(listenErrorText('aborted'), '');
});
