import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreationLedger, selectCreationTurns } from './creationLedger';
import { creationPrompt, parseCreationAnswer, type AppProposal } from './appCreation';
import { DEFAULT_APOTHECARY_CATALOG } from './relationEngine';

test('V04 twelve-turn interview preserves early, middle and final requirements without duplication', () => {
  const turns = Array.from({ length: 12 }, (_, index) => ({
    role: 'architect',
    text: 'REQ-' + String(index + 1).padStart(2, '0') + ' requirement',
    state: 'sent' as const,
  }));
  const selected = selectCreationTurns(turns);
  const ledger = buildCreationLedger(selected);
  assert.equal(ledger.length, 12);
  assert.deepEqual(ledger.map(row => row.id), Array.from({length:12},(_,i) => 'R' + String(i+1).padStart(3,'0')));
  const prompt = creationPrompt(selected, DEFAULT_APOTHECARY_CATALOG, ledger);
  for(const turn of turns) {
    assert.equal(selected.filter(t => t.text === turn.text).length, 1);
    assert.equal(ledger.filter(t => t.text === turn.text).length, 1);
    assert.ok(prompt.includes(turn.text), 'Lost ' + turn.text);
  }
  for (const index of [0, 5, 11]) assert.equal(ledger[index].text, turns[index].text);
  assert.ok(prompt.includes('Architect requirement-and-decision ledger'));
  const orb = DEFAULT_APOTHECARY_CATALOG.find(e => e.category === 'Orbs')!;
  const proposal: AppProposal = {
    name: 'Long conversation', appType: 'Web App',
    purpose: turns.map(t => t.text).join('; '),
    crystalModel: 'AEGIS_POD_CRYSTAL.glb',
    elements: [{ id: orb.id, parentId: null, reason: 'Serve app requests' }],
    gaps: [],
  };
  const parsed = parseCreationAnswer(JSON.stringify({ message: 'All requirements accounted for', questions: [], suggestions: [], proposal }), DEFAULT_APOTHECARY_CATALOG);
  assert.ok(parsed.proposal);
  for(const turn of turns) assert.equal(parsed.proposal!.purpose.split('; ').filter(x => x === turn.text).length, 1, 'Final proposal must contain exactly one ' + turn.text);
});

test('V04 failed turns never become accepted requirements; repeated exact submission deduplicates', () => {
  const transcript = [
    { role:'architect', text:'Save notes', state:'sent' as const },
    { role:'architect', text:'Temporary failed message', state:'failed' as const },
    { role:'luminary', text:'Acknowledged' },
    { role:'architect', text:'Save notes', state:'sent' as const },
    { role:'architect', text:'Use no login', state:'pending' as const },
  ];
  const selected = selectCreationTurns(transcript);
  assert.equal(selected.length, 4);
  assert.deepEqual(buildCreationLedger(selected).map(r => r.text), ['Save notes','Use no login']);
});
