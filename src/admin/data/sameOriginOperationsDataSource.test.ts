// @ts-nocheck -- executed directly with Node's TypeScript stripping; Node types are not a project dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REPLAY_FIXTURE_EVENTS, REPLAY_FIXTURE_SNAPSHOT } from './replayFixture.ts';
import {
  SameOriginOperationsDataSource,
  UnauthorizedOperationsDataSourceError,
} from './sameOriginOperationsDataSource.ts';

class FakeEventSource {
  listeners = new Map();
  closed = false;
  onopen = null;
  onerror = null;
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  close() { this.closed = true; }
  emit(type, data = '{}') { this.listeners.get(type)?.({ data }); }
}

test('same-origin adapter loads the protected snapshot and resumes with an encoded cursor', async () => {
  const requested = [];
  const sources = [];
  const adapter = new SameOriginOperationsDataSource(
    async (url, init) => {
      requested.push([url, init]);
      return new Response(JSON.stringify(REPLAY_FIXTURE_SNAPSHOT), { status: 200 });
    },
    (url) => {
      requested.push([url]);
      const source = new FakeEventSource();
      sources.push(source);
      return source;
    },
  );
  const snapshot = await adapter.loadSnapshot(new AbortController().signal);
  assert.equal(snapshot.pod.pod_id, REPLAY_FIXTURE_SNAPSHOT.pod.pod_id);
  const subscription = adapter.subscribe('fixture event/1');
  const received = [];
  subscription.onEvent((event) => received.push(event));
  sources[0].emit('operation', JSON.stringify(REPLAY_FIXTURE_EVENTS[0]));
  assert.equal(received[0].eventId, REPLAY_FIXTURE_EVENTS[0].eventId);
  assert.equal(requested[1][0], '/api/admin/operations/stream?cursor=fixture%20event%2F1');
  sources[0].emit('replay-complete');
  assert.equal(sources[0].closed, true);
  adapter.close();
});

test('default constructor binds browser-native fetch to the global receiver', async () => {
  const originalFetch = globalThis.fetch;
  let observedReceiver;
  globalThis.fetch = function receiverSensitiveFetch() {
    observedReceiver = this;
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    return Promise.resolve(new Response(JSON.stringify(REPLAY_FIXTURE_SNAPSHOT), { status: 200 }));
  };
  try {
    const adapter = new SameOriginOperationsDataSource();
    const snapshot = await adapter.loadSnapshot(new AbortController().signal);
    assert.equal(observedReceiver, globalThis);
    assert.equal(snapshot.pod.pod_id, REPLAY_FIXTURE_SNAPSHOT.pod.pod_id);
    adapter.close();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('stream auth loss closes the source and emits a distinct unauthorized error', async () => {
  const source = new FakeEventSource();
  const adapter = new SameOriginOperationsDataSource(
    async (url) => url === '/api/admin/session'
      ? new Response('{}', { status: 401 })
      : new Response(JSON.stringify(REPLAY_FIXTURE_SNAPSHOT), { status: 200 }),
    () => source,
  );
  await adapter.loadSnapshot(new AbortController().signal);
  const statuses = [];
  adapter.subscribe().onStatus((status, error) => statuses.push([status, error]));
  source.onerror?.({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(source.closed, true);
  assert.equal(statuses.at(-1)[0], 'error');
  assert.equal(statuses.at(-1)[1] instanceof UnauthorizedOperationsDataSourceError, true);
});

test('invalid SSE route is rejected with its evidence intact', async () => {
  const source = new FakeEventSource();
  const adapter = new SameOriginOperationsDataSource(
    async () => new Response(JSON.stringify(REPLAY_FIXTURE_SNAPSHOT), { status: 200 }),
    () => source,
  );
  await adapter.loadSnapshot(new AbortController().signal);
  const errors = [];
  const received = [];
  const subscription = adapter.subscribe();
  subscription.onStatus((_status, error) => { if (error) errors.push(error); });
  subscription.onEvent((event) => received.push(event));
  const invalid = structuredClone(REPLAY_FIXTURE_EVENTS[0]);
  invalid.route.orderedRefs = [
    { kind: 'pod', id: REPLAY_FIXTURE_SNAPSHOT.pod.pod_id },
    { kind: 'satellite', id: REPLAY_FIXTURE_SNAPSHOT.satellites[0].satellite_id },
  ];
  invalid.routeRefs = invalid.route.orderedRefs.map((reference) => reference.id);
  source.emit('operation', JSON.stringify(invalid));
  assert.equal(received.length, 0);
  assert.equal(source.closed, true);
  assert.deepEqual(errors[0].invalidEvent.routeRefs, invalid.routeRefs);
});
