import assert from 'node:assert/strict';
import test from 'node:test';

import { canListen, canSpeak, listenErrorText, pickVoice, readVoiceSettings, speakableText } from './voice';

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
  assert.match(listenErrorText('not-allowed'), /microphone was blocked/);
  assert.match(listenErrorText('service-not-allowed'), /Chrome and Edge/);
  assert.equal(listenErrorText('aborted'), '');
});

test('without a choice, a voice on the PC is used; a chosen online voice is honoured', () => {
  const online = { name: 'Online Natural', localService: false, default: true };
  const local = { name: 'Microsoft Zira', localService: true, default: false };
  const localDefault = { name: 'Microsoft David', localService: true, default: true };
  assert.equal(pickVoice([online, local], ''), local);
  assert.equal(pickVoice([online, local, localDefault], ''), localDefault);
  assert.equal(pickVoice([online, local], 'Online Natural'), online);
  assert.equal(pickVoice([online, local], 'Gone'), local);
  assert.equal(pickVoice([online], ''), undefined);
});
