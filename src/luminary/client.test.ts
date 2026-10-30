import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeShortfall } from './client';

// STP-0005 P2 wording: a message is returned through IDS, never "held back".

test('a returned message shows the IDS response in plain lines', () => {
  const text = describeShortfall({
    code: 'returned_to_sender',
    message: 'm',
    flaggedBy: 'irg',
    observation: { identify: 'The message asks for a plan.', define: ['Respect read below its threshold.'], suggest: ['One possibility is a shorter opening.'] },
  });
  assert.equal(text, [
    'Your message was not sent to the Luminary. It was returned through IDS after the Virtue gauge (IRG).',
    'Identify: The message asks for a plan.',
    'Define: Respect read below its threshold.',
    'Suggest: One possibility is a shorter opening.',
  ].join('\n'));
});

test('a withheld Suggest shows its note, and no wording says "held back"', () => {
  const text = describeShortfall({ code: 'returned_to_sender', message: 'm', observation: { identify: 'i', define: ['d'], suggest: [], suggestNote: 'No suggestion passed its checks.' } });
  assert.ok(text.endsWith('Suggest: No suggestion passed its checks.'));
  for (const code of ['gauge_error', 'ids_error', 'incoherent_after_ids']) {
    assert.ok(!describeShortfall({ code, message: 'm' }).includes('held back'), code);
  }
});
