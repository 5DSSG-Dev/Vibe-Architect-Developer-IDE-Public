import type { ScenarioEvidence, IntegratedAssuranceReport } from './contracts.js';
import { SCENARIO_ORDER } from './contracts.js';
import { computeHash } from '../identity/hash.js';

let reportCounter = 0;

function nextReportId(): string {
  return `assurance-${Date.now()}-${++reportCounter}`;
}

export function buildAssuranceReport(
  scenarios: ScenarioEvidence[],
): IntegratedAssuranceReport {
  const ordered = SCENARIO_ORDER.map(id =>
    scenarios.find(s => s.scenarioId === id),
  ).filter((s): s is ScenarioEvidence => s !== undefined);

  const totalAssertions = ordered.reduce((sum, s) => sum + s.assertions.length, 0);
  const failCount = ordered.filter(s => s.verdict === 'FAIL').length;

  return {
    reportId: nextReportId(),
    timestamp: new Date().toISOString(),
    scenarios: ordered,
    overallVerdict: failCount === 0 ? 'PASS' : 'FAIL',
    passCount: ordered.length - failCount,
    failCount,
    totalAssertions,
  };
}

export function hashReport(report: IntegratedAssuranceReport): string {
  const data = {
    scenarios: report.scenarios.map(s => s.scenarioId),
    overallVerdict: report.overallVerdict,
    passCount: report.passCount,
    failCount: report.failCount,
    totalAssertions: report.totalAssertions,
  };
  return computeHash(JSON.stringify(data));
}
