import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isSanitizedMessageFlowProjection,
  SERVICE_PIPELINE_STAGES,
} from '../src/admin/domain/index.ts';
import { REPLAY_FIXTURE_EVENTS } from '../src/admin/data/replayFixture.ts';
import { ReplayOperationsProvider } from './replay-operations-provider.js';
import { OperationsProviderStateError } from './operations-router.js';

const traces = new Map<string, typeof REPLAY_FIXTURE_EVENTS[number][]>();
for (const event of REPLAY_FIXTURE_EVENTS) {
  if (!event.messageFlow) continue;
  const trace = traces.get(event.messageFlow.traceId) ?? [];
  trace.push(event);
  traces.set(event.messageFlow.traceId, trace);
}

test('public pipeline stages are exact and core transit remains presentation-only', () => {
  assert.deepEqual(SERVICE_PIPELINE_STAGES, [
    'sender_ingress', 'pim_in', 'irg', 'core_transit_projection', 'rbc',
    'prism', 'ids', 'pim_out', 'receiver_delivery', 'sender_return', 'unavailable',
  ]);
  for (const event of REPLAY_FIXTURE_EVENTS) {
    if (!event.messageFlow) continue;
    assert.equal(isSanitizedMessageFlowProjection(event.messageFlow), true);
    assert.equal(event.messageFlow.canonical, false);
    assert.equal(event.messageFlow.presentationOnly, event.messageFlow.stage === 'core_transit_projection');
    if (event.messageFlow.stage === 'core_transit_projection') assert.equal(event.messageFlow.implementationState, 'presentation_only');
    if (event.messageFlow.stage === 'pim_out') assert.equal(event.messageFlow.implementationState, 'placeholder_pass_through');
    if (event.messageFlow.stage === 'unavailable') assert.equal(event.messageFlow.evidenceState, 'fixture_unavailable');
  }
});

test('deterministic replay covers Prism, RBC-to-IDS shortfall return, lane-2 direct IDS, and unavailable', () => {
  assert.deepEqual([...traces.keys()].sort(), [
    'trace:ids-shortfall-return', 'trace:lane2-direct-ids', 'trace:prism-delivery', 'trace:upstream-unavailable',
  ]);
  const stages = (traceId: string) => traces.get(traceId)!.map((event) => event.messageFlow!.stage);
  assert.deepEqual(stages('trace:prism-delivery'), ['sender_ingress', 'pim_in', 'irg', 'core_transit_projection', 'rbc', 'prism', 'pim_out', 'receiver_delivery']);
  assert.deepEqual(stages('trace:ids-shortfall-return'), ['sender_ingress', 'pim_in', 'irg', 'core_transit_projection', 'rbc', 'ids', 'pim_out', 'sender_return']);
  assert.deepEqual(stages('trace:lane2-direct-ids'), ['sender_ingress', 'pim_in', 'ids', 'pim_out', 'sender_return']);
  assert.deepEqual(stages('trace:upstream-unavailable'), ['sender_ingress', 'pim_in', 'unavailable']);
  assert.deepEqual(
    traces.get('trace:lane2-direct-ids')!.map((event) => event.messageFlow!.integrity),
    ['not_evaluated', 'not_evaluated', 'not_evaluated', 'not_evaluated', 'not_evaluated'],
  );
  for (const trace of traces.values()) {
    assert.equal(trace[0].messageFlow!.integrity, 'not_evaluated');
    assert.equal(trace[1].messageFlow!.integrity, 'not_evaluated');
  }
  assert.equal(traces.get('trace:prism-delivery')!.at(-1)!.messageFlow!.terminalOutcome, 'delivered_to_receiver');
  assert.equal(traces.get('trace:ids-shortfall-return')!.at(-1)!.messageFlow!.terminalOutcome, 'returned_to_sender_with_shortfall');
  assert.equal(traces.get('trace:lane2-direct-ids')!.at(-1)!.messageFlow!.terminalOutcome, 'returned_to_sender');
  assert.deepEqual(new Set([...traces.values()].flatMap((trace) => trace.map((event) => event.messageFlow!.exchangeDirection))), new Set(['human_to_ai', 'ai_to_human']));
});

test('sanitized projection rejects extra raw-service fields and invalid RBC authority claims', () => {
  const first = REPLAY_FIXTURE_EVENTS[0];
  for (const [field, value] of Object.entries({
    rawMessage: 'forbidden', fingerprint: 'forbidden', t0Token: 'forbidden', t1Token: 'forbidden',
    irgScore: 0.91, irgRationale: 'forbidden', idsProse: 'forbidden', rawFlags: ['forbidden'],
  })) {
    assert.equal(isSanitizedMessageFlowProjection({ ...first.messageFlow, [field]: value }), false, field);
  }
  const lane2RbcClaim = REPLAY_FIXTURE_EVENTS.map((event) => event.messageFlow?.traceId === 'trace:lane2-direct-ids'
    ? { ...event, messageFlow: { ...event.messageFlow!, rbcRoute: 'ids' as const } }
    : event);
  assert.throws(() => new ReplayOperationsProvider({ events: lane2RbcClaim }), OperationsProviderStateError);
});

test('Prism can deliver only to Receiver while IDS can return only to the original Sender', () => {
  const prismTerminal = traces.get('trace:prism-delivery')!.at(-1)!.messageFlow!;
  const idsTerminal = traces.get('trace:ids-shortfall-return')!.at(-1)!.messageFlow!;
  const lane2Terminal = traces.get('trace:lane2-direct-ids')!.at(-1)!.messageFlow!;
  assert.equal(isSanitizedMessageFlowProjection({ ...prismTerminal, stage: 'sender_return', terminalOutcome: 'returned_to_sender' }), false);
  assert.equal(isSanitizedMessageFlowProjection({ ...idsTerminal, stage: 'receiver_delivery', terminalOutcome: 'delivered_to_receiver' }), false);
  assert.equal(isSanitizedMessageFlowProjection({ ...lane2Terminal, stage: 'receiver_delivery', terminalOutcome: 'delivered_to_receiver' }), false);
  assert.equal(isSanitizedMessageFlowProjection({ ...prismTerminal, senderIdentity: 'forbidden' }), false);
});
