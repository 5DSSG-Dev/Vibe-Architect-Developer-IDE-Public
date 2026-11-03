import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPrivateGovernanceRuntime, type GovernancePolicy, type GateInference } from './private-governance-runtime.js';
import { pimPatternSetHash, pimRegistryHash, PIM_MATCHER_HASH, PIM_NORMALIZATION_HASHES } from './pim-registry-core.js';
import { SEVEN_VIRTUES } from './irg.js';
import { createBidirectionalAsk } from '../luminary-bidirectional.js';

function policy(): GovernancePolicy {
  const rules = [{ id: 'rule:test', categoryId: 'category:test', direction: 'both' as const, kind: 'literal' as const, text: 'synthetic trigger' }];
  const payload = { registryId: 'registry:test', registryVersion: '1', status: 'active' as const, direction: 'both' as const,
    normalization: 'ascii-lower-v1' as const, normalizationHash: PIM_NORMALIZATION_HASHES['ascii-lower-v1'],
    matcherProfileId: 'bounded-source-mapped-v1' as const, matcherHash: PIM_MATCHER_HASH, patternSetHash: pimPatternSetHash(rules),
    approvalRecord: 'approval:test', supersedes: null, categories: [{ id: 'category:test', familyId: 'family:test', direction: 'both' as const,
      doorOpenPolicy: 'unavailable' as const, requiredEvidenceIds: [] }], rules };
  return { registry: { ...payload, registryHash: pimRegistryHash(payload) }, limits: { maxCandidateBytes: 32768, maxRules: 16, maxMatches: 16, maxStaticWorkUnits: 1_000_000 },
    thresholds: Object.fromEntries(SEVEN_VIRTUES.map(v => [v, 70])) as any,
    prompts: { identify: 'Synthetic identify instructions.', irg: 'Synthetic gauge instructions.', ptag: 'Synthetic compatibility instructions.' },
    contract: { id: 'contract:test', text: 'Synthetic constraint.', eligibleFactIds: ['fact:test'],
      facts: [{ id: 'fact:test', kind: 'constraint', active: true, directions: ['inbound', 'outbound'], evidenceIds: ['evidence:test'] }],
      evidence: [{ id: 'evidence:test', factIds: ['fact:test'], provenance: 'system', scope: 'contract', requestId: null, attemptId: null, issuedAt: 1, expiresAt: null, revoked: false }] },
    projections: { 'category:test': { description: 'Synthetic bounded act.', allowedFactIds: ['fact:test'] } }, maxCalls: 8, maxDurationMs: 10_000 };
}

function inference(events: string[], identifyOutcome = 'discuss-document'): GateInference {
  return async (stage, request) => {
    events.push(stage);
    const input = request.input as any;
    if (stage === 'identify') return { case_id: input.case_id, candidate_hash: input.candidate_hash, context_binding: input.context_binding, direction: input.direction,
      complete_coverage: true, material_units: [input.candidate], units: input.findings.map((f: any, index: number) => ({ finding_index: index, outcome: identifyOutcome,
        start: f.start, end: f.end, fact_id: identifyOutcome === 'named-conflict' ? 'fact:test' : null, evidence_ids: identifyOutcome === 'named-conflict' ? ['evidence:test'] : [] })) };
    if (stage === 'irg') return { case_id: input.case_id, decision: 'coherent', virtue_readings: Object.fromEntries(SEVEN_VIRTUES.map(v => [v, 90])),
      below_threshold_reason: '', complete_coverage: true, material_units: [input.candidate] };
    return { binding: input.binding, decision: 'pass', identify: 'Synthetic informational text.', rationale: 'Compatible.',
      noObligations: true, extractionComplete: true,
      units: [{ start: 0, end: input.candidate.length, kind: 'informational', result: 'compatible', factIds: [], evidenceIds: [] }] };
  };
}

test('triggered documentary text reaches contextual Identify then IRG and PTAG in both directions', async () => {
  const events: string[] = [];
  const runtime = createPrivateGovernanceRuntime(policy(), inference(events));
  for (const direction of ['inbound', 'outbound'] as const) {
    const outcome = await runtime.createSession().evaluate('Explain the phrase synthetic trigger.', direction);
    assert.equal(outcome.destination, 'prism');
  }
  assert.deepEqual(events, ['identify', 'irg', 'ptag', 'identify', 'irg', 'ptag']);
});

test('Identify conflict and unsure withhold before IRG or PTAG; raw matcher rules never enter Identify', async () => {
  for (const interpretation of ['named-conflict', 'unsure']) {
    const events: string[] = [];
    const inner = inference(events, interpretation);
    const runtime = createPrivateGovernanceRuntime(policy(), async (stage, request) => {
      assert(!Object.hasOwn(request.input, 'rules'));
      assert(!Object.hasOwn(request.input, 'registry'));
      return inner(stage, request);
    });
    const outcome = await runtime.createSession().evaluate('synthetic trigger', 'inbound');
    assert.deepEqual(outcome.code, [2, 0]);
    assert.deepEqual(events, ['identify']);
  }
});

test('malformed or rebound Identify is an operational shortfall, never semantic clearance', async () => {
  const events: string[] = [];
  const good = inference(events);
  const runtime = createPrivateGovernanceRuntime(policy(), async (stage, request) => {
    const value = await good(stage, request) as any;
    return stage === 'identify' ? { ...value, candidate_hash: '0'.repeat(64) } : value;
  });
  const outcome = await runtime.createSession().evaluate('synthetic trigger', 'outbound');
  assert.equal(outcome.destination, 'shortfall');
  assert.deepEqual(events, ['identify']);
});

test('IRG unsure cannot be converted to pass by high numeric readings', async () => {
  const events: string[] = [];
  const good = inference(events);
  const runtime = createPrivateGovernanceRuntime(policy(), async (stage, request) => {
    const value = await good(stage, request) as any;
    return stage === 'irg' ? { ...value, decision: 'unsure' } : value;
  });
  const outcome = await runtime.createSession().evaluate('ordinary question', 'inbound');
  assert.deepEqual(outcome.code, [3, 0]);
  assert.deepEqual(events, ['irg']);
});

test('PTAG requires exact whole-candidate coverage and eligible facts', async () => {
  for (const replacement of [{ material_units: ['ordinary'] }, { matched_fact_ids: ['invented'] }, { complete_coverage: false }]) {
    const events: string[] = [];
    const good = inference(events);
    const runtime = createPrivateGovernanceRuntime(policy(), async (stage, request) => {
      const value = await good(stage, request) as any;
      return stage === 'ptag' ? { ...value, ...replacement } : value;
    });
    assert.equal((await runtime.createSession().evaluate('ordinary question', 'outbound')).destination, 'shortfall');
  }
});

test('writer and both directions share one call budget and expiry; configuration is captured before inference', async () => {
  const cfg = policy(); cfg.maxCalls = 2;
  const events: string[] = [];
  const runtime = createPrivateGovernanceRuntime(cfg, inference(events));
  cfg.maxCalls = 100; cfg.registry.status = 'retired';
  const session = runtime.createSession();
  assert.equal((await session.evaluate('ordinary question', 'inbound')).destination, 'prism');
  let calls = 0;
  await assert.rejects(() => session.invokeWriter(async () => { calls++; return {}; }, 'ordinary question'));
  assert.equal(calls, 0);
});

test('missing, inactive and unapproved registry configurations cannot create a production runtime', () => {
  for (const alter of [(cfg: GovernancePolicy) => { cfg.registry.status = 'candidate'; }, (cfg: GovernancePolicy) => { cfg.registry.approvalRecord = null; }]) {
    const cfg = policy(); alter(cfg);
    assert.throws(() => createPrivateGovernanceRuntime(cfg, inference([])));
  }
});

test('aggregate deadline aborts an in-flight writer and does not mint a replacement session budget', async () => {
  const cfg = policy(); cfg.maxDurationMs = 20;
  const session = createPrivateGovernanceRuntime(cfg, inference([])).createSession();
  let aborted = false;
  await assert.rejects(() => session.invokeWriter(async (_prompt, control) => new Promise((_resolve, reject) => {
    control!.signal!.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
  }), 'ordinary prompt'));
  assert.equal(aborted, true);
  await assert.rejects(() => session.evaluate('ordinary prompt', 'outbound'));
});

for (const failureAt of ['writer_dispatch', 'outbound']) {
  test(`private audit failure at ${failureAt} blocks writer or final release`, async () => {
    let writerCalls = 0;
    const runtime = createPrivateGovernanceRuntime(policy(), inference([]), Date.now, event => {
      if (event.event === failureAt || event.direction === failureAt) throw new Error('audit unavailable');
    });
    const result = await createBidirectionalAsk(async () => { writerCalls++; return { modelId: 'm', content: 'reply' }; }, runtime)('ordinary question');
    assert(!result.ok); assert.equal(writerCalls, failureAt === 'writer_dispatch' ? 0 : 1);
  });
  test(`deadline spent in ${failureAt} audit does not permit a late writer or late release`, async () => {
    let clock = 0; let writerCalls = 0;
    const runtime = createPrivateGovernanceRuntime(policy(), inference([]), () => clock, event => {
      if (event.event === failureAt || event.direction === failureAt) clock = 20_000;
    });
    const result = await createBidirectionalAsk(async () => { writerCalls++; return { modelId: 'm', content: 'reply' }; }, runtime)('ordinary question');
    assert(!result.ok); assert.equal(writerCalls, failureAt === 'writer_dispatch' ? 0 : 1);
  });
}
