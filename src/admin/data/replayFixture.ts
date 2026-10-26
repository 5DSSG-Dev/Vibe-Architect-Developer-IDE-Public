import type {
  CanonicalOrbContract,
  CanonicalPodContract,
  CanonicalUmbilicalContract,
  OperationEvent,
  PodTopologySnapshot,
  PortalProjectionInput,
  RouteDescriptor,
  SanitizedMessageFlowProjection,
} from '../domain/index.ts';
import { mapCanonicalTopology, messageFlowProjection as createMessageFlowProjection } from '../domain/index.ts';
import type {
  OperationsDataSource,
  OperationsSubscription,
  SubscriptionStatus,
} from './operationsDataSource.ts';

const FIXTURE_START_MS = Date.parse('2026-08-09T18:00:00.000Z');
export const REPLAY_FIXTURE_DURATION_MS = 54_000;

const evidence = (source: string, trust_state: 'draft' | 'provisional' | 'verified' = 'verified') => ({
  created_utc: new Date(FIXTURE_START_MS).toISOString(),
  source,
  trust_state,
  evidence_refs: [`fixture:${source}`],
  source_hash: 'A'.repeat(64),
});

function messageFlowProjection(
  traceId: string,
  lane: import('../domain/index.ts').PimLane,
  stage: import('../domain/index.ts').ServicePipelineStage,
  stageOrdinal: number,
  integrity: import('../domain/index.ts').MessageIntegrity,
  rbcRoute: import('../domain/index.ts').RbcRoute,
  terminalOutcome: import('../domain/index.ts').MessageTerminalOutcome,
) {
  const exchangeDirection = traceId === 'trace:ids-shortfall-return' || traceId === 'trace:upstream-unavailable'
    ? 'ai_to_human'
    : 'human_to_ai';
  return createMessageFlowProjection(traceId, exchangeDirection, lane, stage, stageOrdinal, integrity, rbcRoute, terminalOutcome);
}

const tensors: CanonicalPodContract['tensors'] = Object.fromEntries(
  (['PEER', 'PCT', 'NCT', 'SPINE'] as const).map((name) => [name, {
    name,
    purpose: `${name} structural channel`,
    storage: `redacted/${name}.jsonl`,
    output: `redacted/${name}`,
    shape: ['record_count', 384, 8] as [string, number, number],
    dtype: 'float32',
    axis_order: ['record', 'embedding', 'metadata'] as [string, string, string],
    append_only: true,
  }]),
) as CanonicalPodContract['tensors'];

const pod: CanonicalPodContract = {
  schema_version: '1.0.0',
  pod_id: 'pod:service-operations-fixture',
  peer_id: 'CP-SERVICE-ADMIN-FIXTURE',
  runtime: { language: 'TypeScript', implementation: 'deterministic-replay' },
  tensor_spec: {
    spec_id: 'fixture-tensor-spec',
    spec_path: 'redacted',
    active_output_root: 'redacted',
  },
  tensors,
  roles: {
    steward: { purpose: 'Fixture stewardship', owns: ['PCT', 'NCT'], reads: ['PEER', 'PCT', 'NCT', 'SPINE'] },
    advocate: { purpose: 'Fixture advocacy', owns: ['PEER', 'SPINE'], reads: ['PEER', 'PCT', 'NCT', 'SPINE'] },
  },
  processor: { purpose: 'Operation projection', status: 'active' },
  temporal_daemon: { purpose: 'Replay clock', status: 'active' },
  orbs: [
    { orb_id: 'orb:telemetry', required_for_full_function: true, umbilical: 'umbilical:telemetry' },
    { orb_id: 'orb:validation', required_for_full_function: false, umbilical: 'umbilical:validation' },
  ],
  evidence: evidence('pod-contract-fixture'),
};

function orb(orb_id: string, ability_name: string, umbilicalId: string): CanonicalOrbContract {
  return {
    schema_version: '1.0.0',
    orb_id,
    orb_version: '1.0.0',
    ability_name,
    purpose: `${ability_name} bounded service operation`,
    runtime: { language: 'TypeScript', form: 'manual_fixture', entrypoint: 'redacted' },
    capabilities: [{ name: ability_name, function: 'Sanitized replay demonstration' }],
    demonstration: {
      input_fixture: 'redacted',
      expected_outputs: ['sanitized-operation-event'],
      observable_events: ['queued', 'running', 'completed'],
    },
    umbilicals: [umbilicalId],
    evidence: evidence(`${orb_id}:contract`),
  };
}

function umbilical(
  umbilical_id: string,
  orb_id: string,
  attachment_point: string,
): CanonicalUmbilicalContract {
  return {
    schema_version: '1.0.0',
    umbilical_id,
    pod_id: pod.pod_id,
    orb_id,
    attachment_point,
    runtime: { language: 'TypeScript', form: 'manual_fixture' },
    invocation: { orb_version: '1.0.0', orb_runtime_hash: 'B'.repeat(64) },
    input_contract: {},
    output_contract: {},
    observation_contract: {},
    evidence_contract: { evidence_refs: [`fixture:${umbilical_id}`] },
    working_parameters: { status: 'verified', outside_parameters_behavior: 'reject_and_record' },
  };
}

const portal: PortalProjectionInput = {
  schema_version: '1.0.0',
  portal_id: 'portal:service-egress',
  pod_id: pod.pod_id,
  name: 'Service Egress Portal',
  mode: 'local-contract',
  enabled: true,
  scope: 'sanitized-operations-only',
  boundary: 'fixture-exterior-service',
  evidence: evidence('portal-contract-fixture', 'provisional'),
};

export const REPLAY_FIXTURE_SNAPSHOT: PodTopologySnapshot = mapCanonicalTopology({
  capturedAt: new Date(FIXTURE_START_MS).toISOString(),
  sourceBoundary: 'replay_fixture',
  pod,
  orbs: [
    orb('orb:telemetry', 'Quantum Telemetry', 'umbilical:telemetry'),
    orb('orb:validation', 'Boundary Validation', 'umbilical:validation'),
  ],
  umbilicals: [
    umbilical('umbilical:telemetry', 'orb:telemetry', 'CORE.socket.0'),
    umbilical('umbilical:validation', 'orb:validation', 'CORE.socket.1'),
  ],
  portals: [portal],
  satellites: [{
    satellite_id: 'satellite:telemetry-sampler',
    parent_orb_id: 'orb:telemetry',
    name: 'Telemetry Sampler',
    capability: 'bounded-sampling',
    projectionKind: 'fixture_satellite',
    evidence: evidence('satellite-projection-fixture', 'provisional'),
  }],
  tenders: [{
    tender_id: 'tender:service-egress',
    portal_id: portal.portal_id,
    safeguards: ['allowlisted-destination', 'redacted-payload', 'failure-is-data'],
    evidence: evidence('tender-projection-fixture', 'provisional'),
  }],
});

const route = (routeId: string, ...orderedRefs: RouteDescriptor['orderedRefs']): RouteDescriptor => ({
  routeId,
  orderedRefs,
});

const baseRoute = route(
  'route:telemetry',
  { kind: 'pod', id: pod.pod_id },
  { kind: 'umbilical', id: 'umbilical:telemetry' },
  { kind: 'orb', id: 'orb:telemetry' },
  { kind: 'umbilical', id: 'umbilical:telemetry' },
  { kind: 'pod', id: pod.pod_id },
);

const satelliteRoute = route(
  'route:telemetry-satellite',
  { kind: 'pod', id: pod.pod_id },
  { kind: 'umbilical', id: 'umbilical:telemetry' },
  { kind: 'orb', id: 'orb:telemetry' },
  { kind: 'satellite', id: 'satellite:telemetry-sampler' },
  { kind: 'orb', id: 'orb:telemetry' },
  { kind: 'umbilical', id: 'umbilical:telemetry' },
  { kind: 'pod', id: pod.pod_id },
);

const validationRoute = route(
  'route:validation',
  { kind: 'pod', id: pod.pod_id },
  { kind: 'umbilical', id: 'umbilical:validation' },
  { kind: 'orb', id: 'orb:validation' },
  { kind: 'umbilical', id: 'umbilical:validation' },
  { kind: 'pod', id: pod.pod_id },
);

const portalRoute = route(
  'route:portal-egress',
  { kind: 'pod', id: pod.pod_id },
  { kind: 'umbilical', id: 'umbilical:telemetry' },
  { kind: 'orb', id: 'orb:telemetry' },
  { kind: 'umbilical', id: 'umbilical:telemetry' },
  { kind: 'pod', id: pod.pod_id },
  { kind: 'portal', id: portal.portal_id },
  { kind: 'pod', id: pod.pod_id },
);

function event(
  sequence: number,
  offsetMs: number,
  operationId: string,
  componentRef: OperationEvent['componentRef'],
  phase: OperationEvent['phase'],
  status: OperationEvent['status'],
  operationRoute: RouteDescriptor,
  redactedSummary: string,
  messageFlow?: SanitizedMessageFlowProjection,
): OperationEvent {
  return {
    schemaVersion: '1.0.0',
    eventId: `fixture-event-${String(sequence).padStart(3, '0')}`,
    sequence,
    observedAt: new Date(FIXTURE_START_MS + offsetMs).toISOString(),
    operationId,
    podId: pod.pod_id,
    componentRef,
    phase,
    status,
    route: operationRoute,
    routeRefs: operationRoute.orderedRefs.map((reference) => reference.id),
    evidenceRefs: [`fixture:evidence:${operationId}:${phase}`],
    redactedSummary,
    ...(messageFlow ? { messageFlow } : {}),
  };
}

export const REPLAY_FIXTURE_EVENTS: readonly OperationEvent[] = [
  event(1, 2_000, 'flow:prism-delivery', { kind: 'pod', id: pod.pod_id }, 'queued', 'nominal', portalRoute, 'Sender ingress observed.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'sender_ingress', 0, 'not_evaluated', 'prism', 'pending')),
  event(2, 4_000, 'flow:prism-delivery', { kind: 'umbilical', id: 'umbilical:telemetry' }, 'running', 'nominal', portalRoute, 'Inbound policy stage observed.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'pim_in', 1, 'not_evaluated', 'prism', 'pending')),
  event(3, 6_000, 'flow:prism-delivery', { kind: 'orb', id: 'orb:telemetry' }, 'running', 'nominal', portalRoute, 'Intent routing stage observed.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'irg', 2, 'coherent', 'prism', 'pending')),
  event(4, 8_000, 'flow:prism-delivery', { kind: 'pod', id: pod.pod_id }, 'running', 'nominal', portalRoute, 'Presentation-only CORE transit observed.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'core_transit_projection', 3, 'coherent', 'prism', 'pending')),
  event(5, 10_000, 'flow:prism-delivery', { kind: 'pod', id: pod.pod_id }, 'running', 'nominal', portalRoute, 'Branch authority selected the Prism route.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'rbc', 4, 'coherent', 'prism', 'pending')),
  event(6, 12_000, 'flow:prism-delivery', { kind: 'portal', id: portal.portal_id }, 'running', 'nominal', portalRoute, 'Prism route stage observed.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'prism', 5, 'coherent', 'prism', 'pending')),
  event(7, 14_000, 'flow:prism-delivery', { kind: 'umbilical', id: 'umbilical:telemetry' }, 'running', 'nominal', portalRoute, 'Outbound policy stage observed.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'pim_out', 6, 'coherent', 'prism', 'pending')),
  event(8, 16_000, 'flow:prism-delivery', { kind: 'pod', id: pod.pod_id }, 'completed', 'nominal', portalRoute, 'Receiver delivery completed.', messageFlowProjection('trace:prism-delivery', 'pim_lane_1', 'receiver_delivery', 7, 'coherent', 'prism', 'delivered_to_receiver')),

  event(9, 20_000, 'flow:ids-shortfall-return', { kind: 'pod', id: pod.pod_id }, 'queued', 'nominal', validationRoute, 'Sender ingress observed.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'sender_ingress', 0, 'not_evaluated', 'ids', 'pending')),
  event(10, 22_000, 'flow:ids-shortfall-return', { kind: 'umbilical', id: 'umbilical:validation' }, 'running', 'nominal', validationRoute, 'Inbound policy stage observed.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'pim_in', 1, 'not_evaluated', 'ids', 'pending')),
  event(11, 24_000, 'flow:ids-shortfall-return', { kind: 'orb', id: 'orb:validation' }, 'running', 'nominal', validationRoute, 'Intent routing stage observed.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'irg', 2, 'coherent', 'ids', 'pending')),
  event(12, 26_000, 'flow:ids-shortfall-return', { kind: 'pod', id: pod.pod_id }, 'running', 'nominal', validationRoute, 'Presentation-only CORE transit observed.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'core_transit_projection', 3, 'coherent', 'ids', 'pending')),
  event(13, 28_000, 'flow:ids-shortfall-return', { kind: 'pod', id: pod.pod_id }, 'running', 'nominal', validationRoute, 'Branch authority selected the IDS route.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'rbc', 4, 'coherent', 'ids', 'pending')),
  event(14, 30_000, 'flow:ids-shortfall-return', { kind: 'orb', id: 'orb:validation' }, 'fell_short', 'contained', validationRoute, 'Integrity shortfall observed at IDS.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'ids', 5, 'shortfall', 'ids', 'pending')),
  event(15, 32_000, 'flow:ids-shortfall-return', { kind: 'umbilical', id: 'umbilical:validation' }, 'running', 'contained', validationRoute, 'Contained return entered outbound policy.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'pim_out', 6, 'shortfall', 'ids', 'pending')),
  event(16, 34_000, 'flow:ids-shortfall-return', { kind: 'pod', id: pod.pod_id }, 'completed', 'contained', validationRoute, 'Sender return completed with shortfall evidence.', messageFlowProjection('trace:ids-shortfall-return', 'pim_lane_1', 'sender_return', 7, 'shortfall', 'ids', 'returned_to_sender_with_shortfall')),

  event(17, 38_000, 'flow:lane2-direct-ids', { kind: 'pod', id: pod.pod_id }, 'queued', 'nominal', validationRoute, 'Sender ingress observed.', messageFlowProjection('trace:lane2-direct-ids', 'pim_lane_2', 'sender_ingress', 0, 'not_evaluated', 'not_reached', 'pending')),
  event(18, 40_000, 'flow:lane2-direct-ids', { kind: 'umbilical', id: 'umbilical:validation' }, 'running', 'nominal', validationRoute, 'Inbound policy selected lane 2.', messageFlowProjection('trace:lane2-direct-ids', 'pim_lane_2', 'pim_in', 1, 'not_evaluated', 'not_reached', 'pending')),
  event(19, 42_000, 'flow:lane2-direct-ids', { kind: 'orb', id: 'orb:validation' }, 'running', 'nominal', validationRoute, 'Lane 2 arrived directly at IDS.', messageFlowProjection('trace:lane2-direct-ids', 'pim_lane_2', 'ids', 2, 'not_evaluated', 'not_reached', 'pending')),
  event(20, 44_000, 'flow:lane2-direct-ids', { kind: 'umbilical', id: 'umbilical:validation' }, 'running', 'nominal', validationRoute, 'Outbound policy stage observed.', messageFlowProjection('trace:lane2-direct-ids', 'pim_lane_2', 'pim_out', 3, 'not_evaluated', 'not_reached', 'pending')),
  event(21, 46_000, 'flow:lane2-direct-ids', { kind: 'pod', id: pod.pod_id }, 'completed', 'nominal', validationRoute, 'Sender return completed.', messageFlowProjection('trace:lane2-direct-ids', 'pim_lane_2', 'sender_return', 4, 'not_evaluated', 'not_reached', 'returned_to_sender')),

  event(22, 50_000, 'flow:upstream-unavailable', { kind: 'pod', id: pod.pod_id }, 'queued', 'nominal', baseRoute, 'Sender ingress observed.', messageFlowProjection('trace:upstream-unavailable', 'pim_lane_1', 'sender_ingress', 0, 'not_evaluated', 'not_reached', 'pending')),
  event(23, 52_000, 'flow:upstream-unavailable', { kind: 'umbilical', id: 'umbilical:telemetry' }, 'running', 'degraded', baseRoute, 'Inbound policy stage observed.', messageFlowProjection('trace:upstream-unavailable', 'pim_lane_1', 'pim_in', 1, 'not_evaluated', 'not_reached', 'pending')),
  event(24, 54_000, 'flow:upstream-unavailable', { kind: 'orb', id: 'orb:telemetry' }, 'fell_short', 'degraded', baseRoute, 'Next service stage unavailable; no branch decision was claimed.', messageFlowProjection('trace:upstream-unavailable', 'pim_lane_1', 'unavailable', 2, 'unavailable', 'not_reached', 'unavailable')),
] as const;

class FixtureSubscription implements OperationsSubscription {
  private readonly eventListeners = new Set<(event: OperationEvent) => void>();
  private readonly statusListeners = new Set<(status: SubscriptionStatus, error?: Error) => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private started = false;
  private closed = false;
  public readonly cursor: string | undefined;
  private readonly events: readonly OperationEvent[];
  private readonly playbackRate: number;

  constructor(
    cursor: string | undefined,
    events: readonly OperationEvent[],
    playbackRate: number,
  ) {
    this.cursor = cursor;
    this.events = events;
    this.playbackRate = playbackRate;
  }

  onEvent(listener: (event: OperationEvent) => void): () => void {
    this.eventListeners.add(listener);
    this.start();
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: (status: SubscriptionStatus, error?: Error) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.closed ? 'closed' : this.started ? 'open' : 'connecting');
    return () => this.statusListeners.delete(listener);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.emitStatus('closed');
    this.eventListeners.clear();
    this.statusListeners.clear();
  }

  private start(): void {
    if (this.started || this.closed) return;
    this.started = true;
    this.emitStatus('open');
    const cursorIndex = this.cursor
      ? this.events.findIndex((candidate) => candidate.eventId === this.cursor)
      : -1;
    const remaining = this.events.slice(cursorIndex + 1);
    const baseline = remaining[0] ? Date.parse(remaining[0].observedAt) : FIXTURE_START_MS;
    for (const candidate of remaining) {
      const delay = Math.max(0, (Date.parse(candidate.observedAt) - baseline) / this.playbackRate);
      this.timers.push(setTimeout(() => {
        if (!this.closed) this.eventListeners.forEach((listener) => listener(candidate));
      }, delay));
    }
    const finalDelay = remaining.length
      ? (Date.parse(remaining[remaining.length - 1].observedAt) - baseline) / this.playbackRate + 1
      : 0;
    this.timers.push(setTimeout(() => this.close(), finalDelay));
  }

  private emitStatus(status: SubscriptionStatus, error?: Error): void {
    this.statusListeners.forEach((listener) => listener(status, error));
  }
}

export class ReplayFixtureDataSource implements OperationsDataSource {
  private subscriptions = new Set<FixtureSubscription>();
  private readonly playbackRate: number;

  constructor(playbackRate = 1) {
    if (!Number.isFinite(playbackRate) || playbackRate <= 0) {
      throw new Error('playbackRate must be a finite positive number');
    }
    this.playbackRate = playbackRate;
  }

  async loadSnapshot(signal: AbortSignal): Promise<PodTopologySnapshot> {
    if (signal.aborted) throw new DOMException('Snapshot load aborted', 'AbortError');
    return REPLAY_FIXTURE_SNAPSHOT;
  }

  subscribe(cursor?: string): OperationsSubscription {
    const subscription = new FixtureSubscription(cursor, REPLAY_FIXTURE_EVENTS, this.playbackRate);
    this.subscriptions.add(subscription);
    const originalClose = subscription.close.bind(subscription);
    subscription.close = () => {
      originalClose();
      this.subscriptions.delete(subscription);
    };
    return subscription;
  }

  close(): void {
    [...this.subscriptions].forEach((subscription) => subscription.close());
  }
}
