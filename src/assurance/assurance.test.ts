import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  runScenarioE,
} from './scenarios.js';
import { buildAssuranceReport, hashReport } from './report.js';
import { SCENARIO_ORDER } from './contracts.js';
import type { ScenarioEvidence } from './contracts.js';

describe('P5.1 — Scenario A: Identity-constrained construction', () => {
  const evidence = runScenarioA();

  it('produces correct scenario id', () => {
    assert.equal(evidence.scenarioId, 'identity_constrained_construction');
  });

  it('passes all assertions', () => {
    assert.equal(evidence.verdict, 'PASS');
    assert.equal(evidence.assertions.every(a => a.passed), true);
  });

  it('validates coverage state is IDENTITY_DEGRADED', () => {
    const a = evidence.assertions.find(a => a.label.includes('Coverage state'));
    assert.equal(a?.passed, true);
  });

  it('validates observation permitted at degraded state', () => {
    const a = evidence.assertions.find(a => a.label.includes('Observation permitted'));
    assert.equal(a?.passed, true);
  });

  it('validates conversation denied at degraded state', () => {
    const a = evidence.assertions.find(a => a.label.includes('Conversation denied'));
    assert.equal(a?.passed, true);
  });

  it('validates mutation denied at degraded state', () => {
    const a = evidence.assertions.find(a => a.label.includes('Mutation denied'));
    assert.equal(a?.passed, true);
  });

  it('validates mutation permitted after promotion', () => {
    const a = evidence.assertions.find(a => a.label.includes('after promotion'));
    assert.equal(a?.passed, true);
  });

  it('has timestamp', () => {
    assert.ok(evidence.timestamp);
    assert.doesNotThrow(() => new Date(evidence.timestamp));
  });
});

describe('P5.2 — Scenario B: Canvas-generated intent pipeline', () => {
  const evidence = runScenarioB();

  it('produces correct scenario id', () => {
    assert.equal(evidence.scenarioId, 'canvas_generated_intent');
  });

  it('passes all assertions', () => {
    assert.equal(evidence.verdict, 'PASS');
    assert.equal(evidence.assertions.every(a => a.passed), true);
  });

  it('validates gesture normalization', () => {
    const a = evidence.assertions.find(a => a.label.includes('Gesture normalized'));
    assert.equal(a?.passed, true);
  });

  it('validates action class classification', () => {
    const a = evidence.assertions.find(a => a.label.includes('Action class'));
    assert.equal(a?.actual, 'consequential_mutation');
  });

  it('validates dispatch routed via construction', () => {
    const a = evidence.assertions.find(a => a.label.includes('Dispatch routed'));
    assert.equal(a?.actual, 'construction');
  });

  it('validates construction gate passed', () => {
    const a = evidence.assertions.find(a => a.label.includes('Construction gate'));
    assert.equal(a?.passed, true);
  });

  it('validates mutation applied end-to-end', () => {
    const a = evidence.assertions.find(a => a.label.includes('Mutation applied'));
    assert.equal(a?.passed, true);
  });
});

describe('P5.3 — Scenario C: Generated external connector', () => {
  const evidence = runScenarioC();

  it('produces correct scenario id', () => {
    assert.equal(evidence.scenarioId, 'generated_external_connector');
  });

  it('passes all assertions', () => {
    assert.equal(evidence.verdict, 'PASS');
    assert.equal(evidence.assertions.every(a => a.passed), true);
  });

  it('validates portal reaches active state', () => {
    const a = evidence.assertions.find(a => a.label.includes('Portal reaches active'));
    assert.equal(a?.passed, true);
  });

  it('validates tender is serving', () => {
    const a = evidence.assertions.find(a => a.label.includes('Tender is serving'));
    assert.equal(a?.passed, true);
  });

  it('validates contract signed', () => {
    const a = evidence.assertions.find(a => a.label.includes('Contract signed'));
    assert.equal(a?.passed, true);
  });

  it('validates boundary policy enforced', () => {
    const a = evidence.assertions.find(a => a.label.includes('Boundary policy'));
    assert.equal(a?.passed, true);
  });

  it('validates negative space invariants preserved', () => {
    const a = evidence.assertions.find(a => a.label.includes('Negative space'));
    assert.equal(a?.passed, true);
  });

  it('validates portal returns to dormant after close', () => {
    const a = evidence.assertions.find(a => a.label.includes('dormant after close'));
    assert.equal(a?.passed, true);
  });
});

describe('P5.4 — Scenario D: Shortfall during exchange', () => {
  const evidence = runScenarioD();

  it('produces correct scenario id', () => {
    assert.equal(evidence.scenarioId, 'shortfall_during_exchange');
  });

  it('passes all assertions', () => {
    assert.equal(evidence.verdict, 'PASS');
    assert.equal(evidence.assertions.every(a => a.passed), true);
  });

  it('validates portal open attempted', () => {
    const a = evidence.assertions.find(a => a.label.includes('Portal open attempted'));
    assert.equal(a?.passed, true);
  });

  it('validates identity denied portal opening', () => {
    const a = evidence.assertions.find(a => a.label.includes('Identity denied'));
    assert.equal(a?.passed, true);
  });

  it('validates shortfall recorded', () => {
    const a = evidence.assertions.find(a => a.label.includes('Shortfall'));
    assert.equal(a?.passed, true);
  });

  it('validates internal state unchanged', () => {
    const a = evidence.assertions.find(a => a.label.includes('Internal state unchanged'));
    assert.equal(a?.passed, true);
  });
});

describe('P5.5 — Scenario E: Degraded surface continuity', () => {
  const evidence = runScenarioE();

  it('produces correct scenario id', () => {
    assert.equal(evidence.scenarioId, 'degraded_surface_continuity');
  });

  it('passes all assertions', () => {
    assert.equal(evidence.verdict, 'PASS');
    assert.equal(evidence.assertions.every(a => a.passed), true);
  });

  it('validates full surface permits all actions', () => {
    const obs = evidence.assertions.find(a => a.label.includes('Full surface: observation'));
    const conv = evidence.assertions.find(a => a.label.includes('Full surface: conversation'));
    const mut = evidence.assertions.find(a => a.label.includes('Full surface: mutation'));
    assert.equal(obs?.passed, true);
    assert.equal(conv?.passed, true);
    assert.equal(mut?.passed, true);
  });

  it('validates degraded surface denies conversation and mutation', () => {
    const conv = evidence.assertions.find(a => a.label.includes('Degraded surface: conversation'));
    const mut = evidence.assertions.find(a => a.label.includes('Degraded surface: mutation'));
    assert.equal(conv?.passed, true);
    assert.equal(mut?.passed, true);
  });

  it('validates unavailable surface still permits observation', () => {
    const a = evidence.assertions.find(a => a.label.includes('Unavailable surface: observation'));
    assert.equal(a?.passed, true);
  });

  it('validates unavailable surface defers mutation', () => {
    const a = evidence.assertions.find(a => a.label.includes('Unavailable surface: mutation deferred'));
    assert.equal(a?.passed, true);
  });
});

describe('P5.6 — Integrated Assurance Report', () => {
  const allEvidence: ScenarioEvidence[] = [
    runScenarioA(),
    runScenarioB(),
    runScenarioC(),
    runScenarioD(),
    runScenarioE(),
  ];
  const report = buildAssuranceReport(allEvidence);

  it('includes all 5 scenarios', () => {
    assert.equal(report.scenarios.length, 5);
  });

  it('orders scenarios by SCENARIO_ORDER', () => {
    const ids = report.scenarios.map(s => s.scenarioId);
    assert.deepEqual(ids, SCENARIO_ORDER);
  });

  it('overall verdict is PASS when all scenarios pass', () => {
    assert.equal(report.overallVerdict, 'PASS');
  });

  it('counts passes and failures correctly', () => {
    assert.equal(report.passCount, 5);
    assert.equal(report.failCount, 0);
  });

  it('counts total assertions across all scenarios', () => {
    const expectedTotal = allEvidence.reduce((sum, s) => sum + s.assertions.length, 0);
    assert.equal(report.totalAssertions, expectedTotal);
    assert.ok(report.totalAssertions > 0);
  });

  it('has valid report id and timestamp', () => {
    assert.match(report.reportId, /^assurance-/);
    assert.doesNotThrow(() => new Date(report.timestamp));
  });

  it('produces deterministic hash', () => {
    const h1 = hashReport(report);
    const h2 = hashReport(report);
    assert.equal(h1, h2);
    assert.match(h1, /^[a-f0-9]{64}$/);
  });

  it('overall verdict is FAIL when any scenario fails', () => {
    const tampered: ScenarioEvidence[] = [
      ...allEvidence.slice(0, 4),
      {
        ...allEvidence[4],
        verdict: 'FAIL',
      },
    ];
    const failReport = buildAssuranceReport(tampered);
    assert.equal(failReport.overallVerdict, 'FAIL');
    assert.equal(failReport.failCount, 1);
    assert.equal(failReport.passCount, 4);
  });

  it('handles partial scenario submission', () => {
    const partial = buildAssuranceReport([allEvidence[0], allEvidence[2]]);
    assert.equal(partial.scenarios.length, 2);
    assert.equal(partial.scenarios[0].scenarioId, 'identity_constrained_construction');
    assert.equal(partial.scenarios[1].scenarioId, 'generated_external_connector');
  });

  it('handles empty scenario list', () => {
    const empty = buildAssuranceReport([]);
    assert.equal(empty.scenarios.length, 0);
    assert.equal(empty.overallVerdict, 'PASS');
    assert.equal(empty.totalAssertions, 0);
  });
});
