import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIdqPrompt } from './idq-local.js';
import { validateObservation, composeRevisionPrompt, recordedDefinition } from './idq.js';

test('Conscience requests Identify, Define, Question instead of advice', () => {
  const { system } = buildIdqPrompt({ reply: 'A bounded message.', pimFindings: [], irg: null, retry: false });
  assert.match(system, /Identify, Define, Question/);
  assert.match(system, /"question": \[string\]/);
  assert.doesNotMatch(system, /"suggest":/);
});

test('Define is derived from recorded findings without speculative causes or calibration advice', () => {
  const define = recordedDefinition({ reply: 'Untrusted message.', irg: null, pimFindings: [{category:'authority_framing',patternId:'authority-1',excerpt:'Untrusted'}] });
  assert.deepEqual(define, ['PIM recorded authority framing (authority-1).']);
});

test('the active observation contract accepts questions and rejects the old Suggest payload', () => {
  const question = { identify: 'A request was screened.', define: ['The pattern screen recorded a shortfall.'], question: ['How could the same intent be expressed?'] };
  assert.deepEqual(validateObservation(question), question);
  assert.equal(validateObservation({ identify: question.identify, define: question.define, suggest: ['One option is different wording.'] }), null);
  assert.equal(validateObservation({ ...question, question: ['One option is to change the wording.'] }), null);
});

test('the sender receives Question with the original intent retained', () => {
  const prompt = composeRevisionPrompt('Keep my accepted requirements.', 'Retained candidate.', {
    identify: 'A request was screened.', define: ['A recorded shortfall.'], question: ['How could that shortfall be addressed?'],
  } as any);
  assert.match(prompt, /Question: How could that shortfall be addressed\?/);
  assert.ok(prompt.includes('Keep my accepted requirements.'));
  assert.doesNotMatch(prompt, /Suggest:/);
});
