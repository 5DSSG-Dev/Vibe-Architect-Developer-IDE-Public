/** Optional local replay of frozen private PTAG observations; never calls a provider. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { examineWithCurrentGates } from './marker-adapters.js';
import { SEVEN_VIRTUES } from './irg.js';
import { validatedPtagCheck } from './ptag-validated-adapter.js';

const plans = process.env.LUMIN_PRIVATE_PLANS_DIR;
test('frozen Muse Spark pass replays through current offline numeric route', { skip: !plans }, async () => {
  const raw = readFileSync(join(plans!, 'p5-jailbreak-baseten-reciprocal-run-006-raw.json'));
  assert.equal(createHash('sha256').update(raw).digest('hex'), '08ab3ff733b6a02b884a3079643ba0b7dc6cbfc54d553cc74f391f4334b90064');
  const fixtureRaw = readFileSync(join(plans!, 'p5-jailbreak-lumin-independent-fixtures-v0.1.json'));
  assert.equal(createHash('sha256').update(fixtureRaw).digest('hex'), 'fe61606e70355aa81e6fc70df5cff42919d899f09f634ae6ee871f87b85c6eab');
  const run = JSON.parse(raw.toString('utf8')) as { results: Array<{ case_id: string; parsed_output: unknown }> };
  const fixtureSet = JSON.parse(fixtureRaw.toString('utf8')) as { fixtures: Array<{ case_id: string; candidate: string; evidence_snapshot: { pending_action?: { target: string }; eligible_fact_ids: string[] }; bounded_context: Array<{ source_id: string }> }> };
  const fixture = fixtureSet.fixtures.find((item) => item.case_id === 'LI-LEGITIMATE-CONTEXT');
  const recorded = run.results.find((item) => item.case_id === fixture?.case_id);
  assert.ok(fixture?.evidence_snapshot.pending_action);
  assert.ok(recorded);
  const binding = `evidence_snapshot:pending_action:${fixture.evidence_snapshot.pending_action.target}+bounded_context:${fixture.bounded_context[0].source_id}`;
  const context = { caseId: fixture.case_id, attemptId: 'historical-recording', eligibleFactIds: new Set(fixture.evidence_snapshot.eligible_fact_ids), contextBinding: binding, candidateHash: createHash('sha256').update(fixture.candidate).digest('hex') };
  const readings = Object.fromEntries(SEVEN_VIRTUES.map((virtue) => [virtue, 90]));
  const outcome = await examineWithCurrentGates(fixture.candidate, { irgScorer: async () => readings, ptag: validatedPtagCheck(context, () => recorded.parsed_output) });
  assert.equal(outcome.destination, 'shortfall'); // Historical case IDs lack a live evaluation identity.
  const changed = await examineWithCurrentGates(`${fixture.candidate} changed`, { irgScorer: async () => readings, ptag: validatedPtagCheck(context, () => recorded.parsed_output) });
  assert.equal(changed.destination, 'shortfall');
  assert.notDeepEqual(changed.code, [1, 1]);
});
