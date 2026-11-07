import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeShortfall } from './client';

// STP-0005 P2 wording: a message is returned through IDQ, never "held back".

test('a returned message shows the IDQ response in plain lines', () => {
  const text = describeShortfall({
    code: 'returned_to_sender',
    message: 'm',
    flaggedBy: 'irg',
    observation: { identify: 'The message asks for a plan.', define: ['Respect read below its threshold.'], question: ['How could the opening retain its intent with greater clarity?'] },
  });
  assert.equal(text, [
    'Your message was not sent to the Luminary. It was returned through IDQ after the Virtue gauge (IRG).',
    'Identify: The message asks for a plan.',
    'Define: Respect read below its threshold.',
    'Question: How could the opening retain its intent with greater clarity?',
  ].join('\n'));
});

test('a withheld Question shows its note, and no wording says "held back"', () => {
  const text = describeShortfall({ code: 'returned_to_sender', message: 'm', observation: { identify: 'i', define: ['d'], question: [], questionNote: 'No question passed its checks.' } });
  assert.ok(text.endsWith('Question: No question passed its checks.'));
  for (const code of ['gauge_error', 'idq_error', 'incoherent_after_idq']) {
    assert.ok(!describeShortfall({ code, message: 'm' }).includes('held back'), code);
  }
});

test('anchors go into the evidence record as detail and come back as the newest pointer per area', async () => {
  const { anchorDetail, latestAnchors } = await import('./client');
  const h = (c: string) => c.repeat(64);
  const first = anchorDetail({ architectEntryId: 'a', state: 'sent', loop: 0, anchors: [{ area: 'architect', seq: 1, hash: h('a') }, { area: 'luminary', seq: 1, hash: h('b') }] });
  const second = anchorDetail({ architectEntryId: 'b', state: 'returned', loop: 0, anchors: [{ area: 'architect', seq: 2, hash: h('c') }] });
  assert.deepEqual(latestAnchors([first, second, { unrelated: true }]), [
    { area: 'architect', seq: 2, hash: h('c') },
    { area: 'luminary', seq: 1, hash: h('b') },
  ]);
});

test('a preserved IDS record remains explicitly historical and is never relabeled as a question', () => {
  const observation = { identify: 'Original identify.', define: ['Original finding.'], suggest: ['Original suggestion.'] };
  const before = JSON.stringify(observation);
  const text = describeShortfall({ code: 'returned_to_sender', message: 'historical', observation });
  assert.match(text, /historical IDS/);
  assert.match(text, /Historical Suggest: Original suggestion\./);
  assert.doesNotMatch(text, /Question:/);
  assert.equal(JSON.stringify(observation), before);
});
