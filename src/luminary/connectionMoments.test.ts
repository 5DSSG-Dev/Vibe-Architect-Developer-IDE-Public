import assert from 'node:assert/strict';
import test from 'node:test';

import type { ConnectionEvent } from '../contracts/connectionEvents';
import { EXPLAINED_KINDS, describeForQuestion, momentLines, toMoment, type ConnectionMoment } from './connectionMoments';

let n = 0;
function event(overrides: Partial<ConnectionEvent> & Pick<ConnectionEvent, 'kind'>): ConnectionEvent {
  return {
    eventId: `e${++n}`,
    attemptId: 'ctr-1',
    timestamp: '2026-10-29T13:40:00.000Z',
    orbId: 'orb-auth-service',
    portId: 'socket-1',
    ...overrides,
  };
}

const names = (id: string) => (id === 'orb-auth-service' ? 'Auth & Session Service' : undefined);
const moments = (events: ConnectionEvent[]) => events.map((e) => toMoment(e, names)).filter((m): m is ConnectionMoment => m !== null);

test('each of the eight moments gets its own plain sentence', () => {
  const expected: Record<(typeof EXPLAINED_KINDS)[number], string> = {
    'attempt-started': 'Auth & Session Service started its handshake with the CORE on port socket-1.',
    'contract-resolved': 'Auth & Session Service was matched to contract orb-auth v1.0.0.',
    'resources-committed': 'Auth & Session Service was given 128 MB and 1 thread.',
    'resources-released': 'Auth & Session Service gave its resources back to the CORE.',
    active: 'Auth & Session Service is connected and active on port socket-1.',
    degraded: 'Auth & Session Service is weakened on port socket-1: a health check failed.',
    severed: 'Auth & Session Service was cut off on port socket-1: it was isolated after a fault, so the fault could not spread.',
    refused: 'Auth & Session Service was refused on port socket-1: its contract did not match one the CORE recognises.',
  };
  const extra: Partial<Record<string, Partial<ConnectionEvent>>> = {
    'contract-resolved': { resolvedContractId: 'orb-auth', resolvedContractVersion: '1.0.0' },
    'resources-committed': { resources: { requested: { memoryMB: 128, threads: 1, bandwidthNormal: 0, bandwidthPeak: 0, gpu: false } } },
    degraded: { reasonCode: 'HEALTH_CHECK_FAILED' },
    severed: { reasonCode: 'FAULT_ISOLATION' },
    refused: { reasonCode: 'CONTRACT_REFUSED' },
  };
  for (const kind of EXPLAINED_KINDS) {
    const lines = momentLines(moments([event({ kind, attemptId: `a-${kind}`, ...extra[kind] })]));
    assert.equal(lines.length, 1, kind);
    assert.equal(lines[0].text, expected[kind], kind);
  }
});

test('routine steps of one handshake share a line; a refusal stands on its own', () => {
  const lines = momentLines(moments([
    event({ kind: 'attempt-started' }),
    event({ kind: 'contract-resolved', resolvedContractId: 'orb-auth', resolvedContractVersion: '1.0.0' }),
    event({ kind: 'refused', reasonCode: 'RESOURCE_SHORTFALL_WITH_ALTERNATIVES',
      resources: { requested: { memoryMB: 512, threads: 4, bandwidthNormal: 0, bandwidthPeak: 0, gpu: false }, available: { memoryMB: 256, threads: 2, bandwidthCredits: 0, gpu: false } },
      alternatives: [{ profileId: 'Pulse', profileVersion: '1.0.0', memoryMB: 128, threads: 1, bandwidthNormal: 1, bandwidthPeak: 2, gpu: false }] }),
    event({ kind: 'attempt-started', attemptId: 'ctr-2' }),
  ]));
  assert.deepEqual(lines.map((line) => line.text), [
    'Auth & Session Service started its handshake with the CORE on port socket-1 and was matched to contract orb-auth v1.0.0.',
    'Auth & Session Service was refused on port socket-1: the CORE did not have enough free resources for it. It asked for 512 MB and 4 threads; 256 MB and 2 threads were free. The CORE offered a profile that fits instead: Pulse v1.0.0 (128 MB and 1 thread).',
    'Auth & Session Service started its handshake with the CORE on port socket-1.',
  ]);
});

test('active after a weakening reads as a recovery', () => {
  const lines = momentLines(moments([event({ kind: 'active' }), event({ kind: 'degraded', reasonCode: 'HEALTH_CHECK_FAILED' }), event({ kind: 'active' })]));
  assert.equal(lines[2].text, 'Auth & Session Service has recovered and is active again on port socket-1.');
});

test('suspended is not explained yet, and an unknown reason is named, not guessed', () => {
  assert.equal(toMoment(event({ kind: 'suspended' })), null);
  const [line] = momentLines(moments([event({ kind: 'severed', reasonCode: 'NEW_CODE' })]));
  assert.match(line.text, /no plain words for yet \(NEW_CODE\)/);
});

test('only allow-listed fields leave the event: the raw message and anything else are dropped', () => {
  const raw = {
    ...event({
      kind: 'refused', reasonCode: 'CONTRACT_REFUSED', message: 'Error: key sk-secret at C:\\Users\\x\\.env',
      presentedContract: { id: 'orb-auth', version: '1.0.0', digest: 'tumbler-proof-digest' },
    }),
    prompt: 'private prompt', credential: 'sk-secret',
  } as ConnectionEvent;
  const moment = toMoment(raw, names)!;
  const allowed = ['eventId', 'attemptId', 'kind', 'time', 'orbId', 'orbName', 'portId', 'contract', 'profile', 'reasonCode', 'requested', 'available', 'alternatives'];
  for (const key of Object.keys(moment)) assert.ok(allowed.includes(key), key);
  const everything = JSON.stringify(moment) + describeForQuestion(momentLines([moment])[0]);
  for (const secret of ['sk-secret', '.env', 'private prompt', 'tumbler-proof-digest', 'Error:']) assert.ok(!everything.includes(secret), secret);
});

test('the Ask why text carries the sentence and plain facts only', () => {
  const [line] = momentLines(moments([event({ kind: 'degraded', reasonCode: 'HEALTH_CHECK_FAILED', profileId: 'Record', profileVersion: '1.0.0' })]));
  assert.equal(describeForQuestion(line), [
    "A connection moment from the IDE's record:",
    'Auth & Session Service is weakened on port socket-1: a health check failed.',
    '- moment: degraded; time: 2026-10-29T13:40:00.000Z; Orb: Auth & Session Service (orb-auth-service); port: socket-1; Umbilical profile: Record v1.0.0; reason: a health check failed (HEALTH_CHECK_FAILED)',
  ].join('\n'));
});
