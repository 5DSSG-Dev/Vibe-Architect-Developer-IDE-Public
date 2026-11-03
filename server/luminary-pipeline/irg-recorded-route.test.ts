/** Optional replay of the four private real-IRG observations under the Architect's new route. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { examineWithCurrentGates } from './marker-adapters.js';
import { validatedPtagCheck } from './ptag-validated-adapter.js';
import { markerToIdq } from './marker-idq.js';

const plans = process.env.LUMIN_PRIVATE_PLANS_DIR;
const files = [
  ['p5-real-irg-assembled-result-v0.2.json', '59c51928d5fa17c18ae6703a72561159a770ad5873aa31afbeceffdbba5f1f25'],
  ['p5-real-irg-assembled-fixtures-v0.2.json', '373309a1b7e34f15516b95b01d0da866efffcb527a3b425ad5aea0227de587ae'],
] as const;

test('recorded IRG early stops hold; legacy PTAG case IDs cannot release controls', { skip: !plans }, async () => {
  const [run, fixtureSet] = files.map(([name, expected]) => {
    const bytes = readFileSync(join(plans!, name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    return JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
  });
  type Fixture = { fixture_id: string; candidate: string; evidence_snapshot: { eligible_fact_ids: string[] } };
  type Result = { fixture_id: string; irg: { parsed: { virtue_readings: Record<string, number>; tone_class: string; force_class: string } }; ptag: { parsed: unknown } };
  const fixtures = (fixtureSet as { cases: Fixture[] }).cases;
  const results = (run as { results: Result[] }).results;
  assert.equal(fixtures.length, 4);
  assert.equal(results.length, 4);
  const expected: Record<string, readonly [number, number]> = {
    'RB-CONTROL-IN': [0, 0],
    'RB-CONTROL-OUT': [0, 0],
    'RB-OPAQUE-IN': [3, 0],
    'RB-PIM-PRESSURE-IN': [2, 0],
  };
  let ptagCalls = 0;
  for (const fixture of fixtures) {
    const recorded = results.find((item) => item.fixture_id === fixture.fixture_id);
    assert.ok(recorded);
    const ptag = recorded.ptag.parsed as { context_binding: string | null };
    const binding = fixture.fixture_id === 'RB-CONTROL-IN' ? 'candidate:self-contained-informational'
      : fixture.fixture_id === 'RB-CONTROL-OUT' ? fixture.evidence_snapshot.eligible_fact_ids[0] : null;
    const context = { caseId: fixture.fixture_id, attemptId: 'historical-recording', eligibleFactIds: new Set(fixture.evidence_snapshot.eligible_fact_ids), contextBinding: binding, candidateHash: createHash('sha256').update(fixture.candidate).digest('hex') };
    const outcome = await examineWithCurrentGates(fixture.candidate, {
      irgScorer: async () => recorded.irg.parsed.virtue_readings,
      threshold: { Honesty: 60, Respect: 60, Attention: 60, Affection: 50, Loyalty: 50, Trust: 60, Communication: 60 },
      ptag: validatedPtagCheck(context, () => { ptagCalls += 1; return recorded.ptag.parsed; }),
    });
    if (expected[fixture.fixture_id][0] === 0) {
      assert.equal(outcome.destination, 'shortfall'); // Recorded PTAG has no live evaluation identity.
      assert.equal(outcome.code, null);
    } else assert.deepEqual(outcome.code, expected[fixture.fixture_id]);
    if (outcome.destination === 'conscience') assert.ok(markerToIdq(outcome));
    else assert.equal(markerToIdq(outcome), null);
  }
  assert.equal(ptagCalls, 0); // Live identity check rejects historical case IDs before producer use.
});
