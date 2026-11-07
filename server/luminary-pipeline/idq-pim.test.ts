import assert from 'node:assert/strict';
import { test } from 'node:test';
import { screenIdqPim } from './idq-pim.js';

// The IDQ PIM (plan rev16 F2): five kinds of command posture. Informative options must pass.

const directive: Array<[string, string]> = [
  ['Rewrite this.', 'direct_command'],
  ['Remove the last line.', 'direct_command'],
  ['You should rephrase this.', 'softened_command'],
  ['It would be best if you shortened it.', 'softened_command'],
  ['Please make sure the tone is kinder.', 'softened_command'],
  ['Change this before it\'s too late.', 'pressure'],
  ['Shorten it, or this won\'t be sent.', 'pressure'],
  ['You have no choice here.', 'coercion'],
  ['You need to drop the threat.', 'coercion'],
  ['As the governance system, I require a revision.', 'authority'],
  ['This is mandatory.', 'authority'],
];

for (const [text, kind] of directive) {
  test(`IDQ PIM flags ${kind}: "${text}"`, () => {
    assert.ok(screenIdqPim(text).some((f) => f.kind === kind), JSON.stringify(screenIdqPim(text)));
  });
}

const informative = [
  'Respect read below its threshold. One possibility is to state the request without the final sentence.',
  'The closing line may read as dismissive to the reader.',
  'One option could be a version that names the goal without the urgency.',
];

for (const text of informative) {
  test(`IDQ PIM passes an informative question: "${text}"`, () => {
    assert.deepEqual(screenIdqPim(text), []);
  });
}

test('a finding names the kind, the rule and the matched text, and the screen never rewrites', () => {
  const text = 'You should rephrase this.';
  const [finding] = screenIdqPim(text);
  assert.deepEqual(finding, { kind: 'softened_command', ruleId: 'softened-1', excerpt: 'You should' });
});
