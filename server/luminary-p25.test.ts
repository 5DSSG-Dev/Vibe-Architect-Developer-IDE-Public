import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_APOTHECARY_CATALOG, ensureElementCodeFrame } from '../src/engine/relationEngine.js';
import { composeElementCodePrompt, readElementCodeProposal } from '../src/luminary/elementCode.js';
import { rehearsalAskModel } from './luminary-rehearsal.js';

// STP-0002 P25: the stand-in can rehearse an Element code request with no model and no spend.
test('the rehearsal stand-in answers an Element code request with exactly one block', async () => {
  const item = ensureElementCodeFrame(DEFAULT_APOTHECARY_CATALOG.find((entry) => entry.id === 'sat-rate-limiter')!);
  const prompt = composeElementCodePrompt({ item, catalog: DEFAULT_APOTHECARY_CATALOG, frame: item.codeFrame, source: 'export const x = 1;', request: 'Allow 10 requests a second.', level: 'plain', mode: 'DESIGN' });
  const reply = (await rehearsalAskModel(prompt)) as { content: string };
  const proposal = readElementCodeProposal(reply.content);
  assert.equal(proposal.ok, true);
  assert.equal((proposal as { code: string }).code, '// Rehearsal: the Luminary would change this for "Allow 10 requests a second.".\nexport const x = 1;');
});
