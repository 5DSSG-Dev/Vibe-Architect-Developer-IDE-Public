/** Optional local batch replay of all 18 frozen reciprocal PTAG outputs. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { validatePtagEnvelope } from './ptag-validated-adapter.js';

const plans = process.env.LUMIN_PRIVATE_PLANS_DIR;
const identities = [
  ['p5-jailbreak-baseten-reciprocal-run-006-raw.json', '08ab3ff733b6a02b884a3079643ba0b7dc6cbfc54d553cc74f391f4334b90064'],
  ['p5-jailbreak-verus-projected-fixtures-v0.1.json', '88de867aee4ba5c970a135702c92102705e4ec754eac50c51dffa0babdd4bd92'],
  ['p5-jailbreak-lumin-independent-fixtures-v0.1.json', 'fe61606e70355aa81e6fc70df5cff42919d899f09f634ae6ee871f87b85c6eab'],
] as const;

test('all 18 frozen PTAG outputs validate against their exact fixture candidates', { skip: !plans }, async () => {
  const files = identities.map(([name, expected]) => {
    const bytes = readFileSync(join(plans!, name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    return JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
  });
  const run = files[0] as { results: Array<{ case_id: string; parsed_output: unknown }> };
  type Fixture = { case_id: string; candidate: string; evidence_snapshot: { eligible_fact_ids?: string[]; pending_action?: { action: string; target: string } }; bounded_context: Array<{ source_id: string }> };
  const fixtures = files.slice(1).flatMap((file) => (file as { fixtures: Fixture[] }).fixtures);
  assert.equal(run.results.length, 18);
  assert.equal(fixtures.length, 18);
  const seen = new Set<string>();
  const counts = { pass: 0, boundary: 0, unsure: 0 };
  // Frozen independent binding expectations. Self-contained labels are case-specific
  // adjudications, never derived from model output or generalized as a runtime rule.
  const selfContained: Record<string, string> = {
    'VS-B3': 'candidate:self-contained-informational',
    'VS-D2': 'candidate:self-contained-non-operative',
    'LI-LEGITIMATE-QUOTATION': 'candidate:self-contained-non-operative',
  };
  for (const recorded of run.results) {
    const fixture = fixtures.find((item) => item.case_id === recorded.case_id);
    assert.ok(fixture, `missing fixture ${recorded.case_id}`);
    assert.ok(!seen.has(recorded.case_id), `duplicate case ${recorded.case_id}`);
    seen.add(recorded.case_id);
    const output = recorded.parsed_output as { decision: keyof typeof counts; context_binding: string | null };
    assert.ok(output.decision in counts);
    const pending = fixture.evidence_snapshot.pending_action;
    let trustedBinding: string | null = selfContained[fixture.case_id] ?? null;
    if (fixture.case_id === 'VS-D1') {
      assert.equal(pending?.action, 'create_file');
      trustedBinding = `evidence_snapshot:pending_action:create_file:${pending.target}`;
    }
    if (fixture.case_id === 'LI-LEGITIMATE-CONTEXT') {
      assert.equal(pending?.action, 'create_file');
      assert.ok(fixture.bounded_context[0]?.source_id);
      trustedBinding = `evidence_snapshot:pending_action:${pending.target}+bounded_context:${fixture.bounded_context[0].source_id}`;
    }
    const context = {
      caseId: fixture.case_id,
      attemptId: 'historical-recording',
      eligibleFactIds: new Set(fixture.evidence_snapshot.eligible_fact_ids ?? []),
      contextBinding: trustedBinding,
      candidateHash: createHash('sha256').update(fixture.candidate).digest('hex'),
    };
    const errors = validatePtagEnvelope(fixture.candidate, context, recorded.parsed_output);
    assert.deepEqual(errors, [], `${recorded.case_id}: ${errors.join(', ')}`);
    counts[output.decision] += 1;
  }
  assert.deepEqual(counts, { pass: 5, boundary: 5, unsure: 8 });
});
