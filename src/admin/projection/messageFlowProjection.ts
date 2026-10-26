import type { OperationEvent } from '../domain/index.ts';
import type {
  MessageFlowConduitProjection,
  MessageFlowProjection,
  MessageFlowStageId,
  MessageFlowStageProjection,
  MessageFlowTransactionProjection,
  MessageFlowVisualAnchorId,
  OperationalStatus,
} from '../../three/index.ts';

const STAGE_LAYOUT: Readonly<Record<MessageFlowVisualAnchorId, readonly [number, number, number]>> = {
  sender_ingress: [-6.1, 1.9, 0],
  pim_in: [-5.6, -0.35, 0],
  irg: [-3.8, 0.45, 0],
  core_transit_projection: [-1.4, 0, 0],
  rbc: [0.9, 0, 0],
  prism: [3.2, 1.65, 0],
  ids: [3.2, -1.65, 0],
  pim_out_receiver_projection: [5.3, 0.25, 0],
  pim_out_sender_projection: [-5.5, -2.55, 0],
  receiver_delivery: [6.1, 1.75, 0],
  sender_return: [-6.1, -3.0, 0],
  unavailable: [1.6, -3.5, 0],
};

const LABELS: Readonly<Record<MessageFlowVisualAnchorId, string>> = {
  sender_ingress: 'Sender ingress', pim_in: 'PIM in', irg: 'IRG',
  core_transit_projection: 'CORE transit', rbc: 'RBC', prism: 'Prism',
  ids: 'IDS', pim_out_receiver_projection: 'PIM out · Receiver side',
  pim_out_sender_projection: 'PIM out · Sender side', receiver_delivery: 'Receiver delivery', sender_return: 'Sender return',
  unavailable: 'Unavailable',
};

const CONDUITS: readonly MessageFlowConduitProjection[] = [
  { id: 'ingress:pim', from: 'sender_ingress', to: 'pim_in', branch: 'shared' },
  { id: 'pim:irg', from: 'pim_in', to: 'irg', branch: 'shared' },
  { id: 'irg:core', from: 'irg', to: 'core_transit_projection', branch: 'shared' },
  { id: 'core:rbc', from: 'core_transit_projection', to: 'rbc', branch: 'shared' },
  { id: 'rbc:prism', from: 'rbc', to: 'prism', branch: 'prism' },
  { id: 'rbc:ids', from: 'rbc', to: 'ids', branch: 'ids' },
  { id: 'pim:ids', from: 'pim_in', to: 'ids', branch: 'lane_2' },
  { id: 'prism:pim-out-receiver', from: 'prism', to: 'pim_out_receiver_projection', branch: 'prism' },
  { id: 'ids:pim-out-sender', from: 'ids', to: 'pim_out_sender_projection', branch: 'ids' },
  { id: 'pim-out-receiver:receiver', from: 'pim_out_receiver_projection', to: 'receiver_delivery', branch: 'prism' },
  { id: 'pim-out-sender:sender', from: 'pim_out_sender_projection', to: 'sender_return', branch: 'ids' },
  { id: 'pim:unavailable', from: 'pim_in', to: 'unavailable', branch: 'unavailable' },
  { id: 'irg:unavailable', from: 'irg', to: 'unavailable', branch: 'unavailable' },
  { id: 'rbc:unavailable', from: 'rbc', to: 'unavailable', branch: 'unavailable' },
  { id: 'ids:unavailable', from: 'ids', to: 'unavailable', branch: 'unavailable' },
  { id: 'pim-out-receiver:unavailable', from: 'pim_out_receiver_projection', to: 'unavailable', branch: 'unavailable' },
  { id: 'pim-out-sender:unavailable', from: 'pim_out_sender_projection', to: 'unavailable', branch: 'unavailable' },
];

function visualRouteFor(route: readonly MessageFlowStageId[]): readonly MessageFlowVisualAnchorId[] {
  const senderReturn = route.includes('ids');
  return route.map((stage) => stage === 'pim_out'
    ? senderReturn ? 'pim_out_sender_projection' : 'pim_out_receiver_projection'
    : stage as MessageFlowVisualAnchorId);
}

function semanticStageFor(anchor: MessageFlowVisualAnchorId): MessageFlowStageId {
  return anchor === 'pim_out_receiver_projection' || anchor === 'pim_out_sender_projection' ? 'pim_out' : anchor;
}

type FlowEvidence = NonNullable<OperationEvent['messageFlow']>;

function operationalStatus(event: OperationEvent): OperationalStatus {
  if (event.status !== 'nominal') return event.status;
  return event.phase === 'queued' ? 'queued' : 'nominal';
}

const LEGAL_TRANSITIONS: Readonly<Record<MessageFlowStageId, readonly MessageFlowStageId[]>> = {
  sender_ingress: ['pim_in'],
  pim_in: ['irg', 'ids', 'unavailable'],
  irg: ['core_transit_projection', 'unavailable'],
  core_transit_projection: ['rbc', 'unavailable'],
  rbc: ['prism', 'ids', 'unavailable'],
  prism: ['pim_out', 'unavailable'],
  ids: ['pim_out', 'unavailable'],
  pim_out: ['receiver_delivery', 'sender_return', 'unavailable'],
  receiver_delivery: [],
  sender_return: [],
  unavailable: [],
};

function isLegalObservedRoute(events: readonly (OperationEvent & { messageFlow: FlowEvidence })[]): boolean {
  if (events.length === 0) return false;
  if (events[0].messageFlow.stage !== 'sender_ingress') return false;
  for (let index = 1; index < events.length; index += 1) {
    if (events[index].messageFlow.lane !== events[0].messageFlow.lane) return false;
    const previous = events[index - 1].messageFlow.stage;
    const current = events[index].messageFlow.stage;
    if (!LEGAL_TRANSITIONS[previous].includes(current)) return false;
    if (events[0].messageFlow.lane === 'pim_lane_1' && previous === 'pim_in' && current === 'ids') return false;
  }
  const stages = events.map((event) => event.messageFlow.stage);
  const terminal = stages[stages.length - 1];
  if (terminal === 'receiver_delivery' && !stages.includes('prism')) return false;
  if (terminal === 'sender_return' && !stages.includes('ids')) return false;
  return true;
}

export function createMessageFlowProjection(
  events: readonly OperationEvent[] = [],
  selectedOperationIds?: ReadonlySet<string>,
  replayTimeMs = Number.POSITIVE_INFINITY,
): MessageFlowProjection {
  const eventsByTrace = new Map<string, Array<OperationEvent & { messageFlow: FlowEvidence }>>();
  for (const event of events) {
    if (!event.messageFlow) continue;
    const traceEvents = eventsByTrace.get(event.messageFlow.traceId) ?? [];
    traceEvents.push(event as OperationEvent & { messageFlow: FlowEvidence });
    eventsByTrace.set(event.messageFlow.traceId, traceEvents);
  }

  const normalizedTraces = [...eventsByTrace.entries()].map(([traceId, traceEvents]) => {
    const byOrdinal = new Map<number, OperationEvent & { messageFlow: FlowEvidence }>();
    for (const event of traceEvents) {
      const current = byOrdinal.get(event.messageFlow.stageOrdinal);
      if (!current || event.sequence > current.sequence) byOrdinal.set(event.messageFlow.stageOrdinal, event);
    }
    return [traceId, [...byOrdinal.values()].sort((left, right) =>
      left.messageFlow.stageOrdinal - right.messageFlow.stageOrdinal || left.sequence - right.sequence)] as const;
  }).sort(([left], [right]) => left.localeCompare(right));

  const transactions: MessageFlowTransactionProjection[] = normalizedTraces.flatMap(([, traceEvents]) => {
      if (!isLegalObservedRoute(traceEvents)) return [];
      const first = traceEvents[0];
      const latest = traceEvents[traceEvents.length - 1];
      const stageObservedAtMs = traceEvents.map((event) => Date.parse(event.observedAt));
      if (stageObservedAtMs.some((timestamp) => !Number.isFinite(timestamp))) return [];
      const route = traceEvents.map((event) => event.messageFlow.stage);
      return [{
        id: latest.operationId,
        traceId: latest.messageFlow.traceId,
        exchangeDirection: latest.messageFlow.exchangeDirection,
        startedAtMs: stageObservedAtMs[0],
        durationMs: Math.max(0, stageObservedAtMs[stageObservedAtMs.length - 1] - stageObservedAtMs[0]),
        route,
        visualRoute: visualRouteFor(route),
        stageObservedAtMs,
        status: operationalStatus(latest),
        selected: selectedOperationIds?.has(latest.operationId) ?? false,
      }];
    });

  const reached = new Set<MessageFlowVisualAnchorId>();
  const active = new Set<MessageFlowVisualAnchorId>();
  for (const transaction of transactions) {
    let latestReached: MessageFlowVisualAnchorId | undefined;
    transaction.visualRoute.forEach((stage, index) => {
      if (transaction.stageObservedAtMs[index] <= replayTimeMs) {
        reached.add(stage);
        latestReached = stage;
      }
    });
    if (latestReached) active.add(latestReached);
  }
  const latestEvidenceByStage = new Map<MessageFlowStageId, FlowEvidence>();
  for (const [, traceEvents] of normalizedTraces) {
    for (const event of traceEvents) latestEvidenceByStage.set(event.messageFlow.stage, event.messageFlow);
  }
  const stages: MessageFlowStageProjection[] = (Object.keys(STAGE_LAYOUT) as MessageFlowVisualAnchorId[]).map((id) => ({
    id,
    semanticStage: semanticStageFor(id),
    label: LABELS[id],
    position: STAGE_LAYOUT[id],
    state: active.has(id) ? (id === 'unavailable' ? 'unavailable' : 'active') : reached.has(id) ? 'completed' : 'idle',
    canonical: false,
    metadata: {
      canonical: false,
      presentationOnly: true,
      projectionKind: id === 'core_transit_projection' ? 'core_transit_projection' : 'service_stage_anchor',
      routingAuthority: id === 'rbc',
      semanticStage: semanticStageFor(id),
      implementationState: latestEvidenceByStage.get(semanticStageFor(id))?.implementationState ?? 'unavailable',
      evidenceState: latestEvidenceByStage.get(semanticStageFor(id))?.evidenceState ?? 'fixture_unavailable',
    },
  }));

  return {
    version: `message-flow:${events.length}:${transactions.map((item) => `${item.traceId}:${item.selected ? 'selected' : 'plain'}`).join('|')}:${[...active].sort().join(',')}`,
    presentationOnly: true,
    stages,
    conduits: CONDUITS,
    transactions,
  };
}

export const MESSAGE_FLOW_STAGE_POSITIONS = STAGE_LAYOUT;
