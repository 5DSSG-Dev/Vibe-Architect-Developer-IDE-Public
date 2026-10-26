import type { Request, Response } from 'express';
import {
  isSanitizedMessageFlowProjection,
  type OperationEvent,
  type PodTopologySnapshot,
  type SanitizedMessageFlowProjection,
} from '../src/admin/domain/index.ts';
import {
  OperationsProviderStateError,
  type OperationsProvider,
} from './operations-router.js';
import {
  REPLAY_FIXTURE_EVENTS,
  REPLAY_FIXTURE_SNAPSHOT,
} from '../src/admin/data/replayFixture.ts';

const SOURCE_BOUNDARY = 'replay_fixture' as const;
const DEFAULT_HEARTBEAT_MS = 15_000;
const FORBIDDEN_FIELD = /(^|_)(prompt|completion|credential|password|secret|token|witness|fingerprint|score|rationale|prose|raw_message|raw_flag|t0|t1)(_|$)/i;
const COMPONENT_KINDS = new Set(['pod', 'orb', 'satellite', 'umbilical', 'portal']);
const PHASES = new Set(['observed', 'queued', 'running', 'completed', 'fell_short']);
const OPERATION_STATUSES = new Set(['nominal', 'degraded', 'contained', 'rejected', 'rolled_back']);
const MAX_SERIALIZED_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const MAX_REPLAY_EVENTS = 10_000;

export interface ReplayOperationsProviderOptions {
  snapshot?: PodTopologySnapshot;
  events?: readonly OperationEvent[];
  playbackRate?: number;
  heartbeatMs?: number;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizedFieldName(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-.]/g, '_');
}

function assertNoRestrictedFields(value: unknown, path = 'payload'): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRestrictedFields(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_FIELD.test(normalizedFieldName(key))) {
      throw new OperationsProviderStateError(`Restricted operations field at ${path}.${key}`);
    }
    assertNoRestrictedFields(entry, `${path}.${key}`);
  }
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function assertExactKeys(value: unknown, allowed: readonly string[], path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OperationsProviderStateError(`${path} must be an object.`);
  }
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unexpected) throw new OperationsProviderStateError(`Unexpected operations field at ${path}.${unexpected}`);
}

function assertSnapshotProjectionShape(snapshot: PodTopologySnapshot): void {
  assertExactKeys(snapshot, ['schemaVersion', 'capturedAt', 'sourceBoundary', 'pod', 'orbs', 'umbilicals', 'satellites', 'portals'], 'snapshot');
  assertExactKeys(snapshot.pod, ['canonical', 'schema_version', 'pod_id', 'peer_id', 'displayName', 'runtime', 'tensors', 'orbIds', 'orbAttachments', 'evidence', 'status'], 'snapshot.pod');
  if (snapshot.pod.canonical !== true) throw new OperationsProviderStateError('Replay POD projection must be canonical.');
  snapshot.orbs.forEach((orb, index) => {
    assertExactKeys(orb, ['canonical', 'schema_version', 'orb_id', 'orb_version', 'pod_id', 'abilityName', 'purpose', 'runtime', 'capabilities', 'umbilicalIds', 'evidence', 'status'], `snapshot.orbs[${index}]`);
    if (orb.canonical !== true || orb.pod_id !== snapshot.pod.pod_id) throw new OperationsProviderStateError('Replay Orb projection is invalid.');
  });
  snapshot.umbilicals.forEach((umbilical, index) => {
    assertExactKeys(umbilical, ['canonical', 'schema_version', 'umbilical_id', 'pod_id', 'orb_id', 'attachmentPoint', 'runtime', 'orbVersionPin', 'evidence', 'status'], `snapshot.umbilicals[${index}]`);
    if (umbilical.canonical !== true || umbilical.pod_id !== snapshot.pod.pod_id) throw new OperationsProviderStateError('Replay Umbilical projection is invalid.');
  });
  snapshot.satellites.forEach((satellite, index) => {
    assertExactKeys(satellite, ['canonical', 'projectionKind', 'satellite_id', 'parent_orb_id', 'pod_id', 'name', 'capability', 'evidence', 'status'], `snapshot.satellites[${index}]`);
    if (satellite.canonical !== false || satellite.pod_id !== snapshot.pod.pod_id) throw new OperationsProviderStateError('Replay Satellite projection is invalid.');
  });
  snapshot.portals.forEach((portal, index) => {
    assertExactKeys(portal, ['canonical', 'projectionKind', 'schema_version', 'portal_id', 'pod_id', 'name', 'mode', 'enabled', 'scope', 'boundary', 'tender', 'evidence', 'status'], `snapshot.portals[${index}]`);
    if (portal.canonical !== false || portal.pod_id !== snapshot.pod.pod_id) throw new OperationsProviderStateError('Replay Portal projection is invalid.');
  });
}

function assertOperationEventShape(event: OperationEvent, index: number): void {
  const path = `events[${index}]`;
  assertExactKeys(event, ['schemaVersion', 'eventId', 'sequence', 'observedAt', 'operationId', 'podId', 'componentRef', 'phase', 'status', 'route', 'routeRefs', 'evidenceRefs', 'redactedSummary', 'messageFlow'], path);
  assertExactKeys(event.componentRef, ['kind', 'id', 'parentId'], `${path}.componentRef`);
  assertExactKeys(event.route, ['routeId', 'orderedRefs'], `${path}.route`);
  event.route.orderedRefs.forEach((reference, referenceIndex) => {
    assertExactKeys(reference, ['kind', 'id'], `${path}.route.orderedRefs[${referenceIndex}]`);
    if (!COMPONENT_KINDS.has(reference.kind) || typeof reference.id !== 'string' || !reference.id) throw new OperationsProviderStateError('Replay route reference is invalid.');
  });
  if (
    !COMPONENT_KINDS.has(event.componentRef.kind)
    || !PHASES.has(event.phase)
    || !OPERATION_STATUSES.has(event.status)
    || event.routeRefs.some((reference) => typeof reference !== 'string' || !reference)
    || event.evidenceRefs.some((reference) => typeof reference !== 'string' || !reference || reference.length > 512)
    || (event.redactedSummary !== undefined && (typeof event.redactedSummary !== 'string' || event.redactedSummary.length > 2_000))
    || (event.messageFlow !== undefined && !isSanitizedMessageFlowProjection(event.messageFlow))
  ) {
    throw new OperationsProviderStateError('Replay operation event is outside the sanitized schema.');
  }
}

function assertMessageFlowTraces(events: readonly OperationEvent[]): void {
  const traces = new Map<string, SanitizedMessageFlowProjection[]>();
  for (const event of events) {
    if (!event.messageFlow) continue;
    if (event.messageFlow.traceId !== event.operationId.replace(/^flow:/, 'trace:')) {
      throw new OperationsProviderStateError('Message-flow trace identity does not match its operation identity.');
    }
    const trace = traces.get(event.messageFlow.traceId) ?? [];
    trace.push(event.messageFlow);
    traces.set(event.messageFlow.traceId, trace);
  }

  for (const trace of traces.values()) {
    const first = trace[0];
    const last = trace[trace.length - 1];
    if (!first || !last || first.stage !== 'sender_ingress' || first.stageOrdinal !== 0) {
      throw new OperationsProviderStateError('Message-flow trace must begin at sender_ingress ordinal 0.');
    }
    for (let index = 0; index < trace.length; index += 1) {
      const stage = trace[index];
      if (stage.stageOrdinal !== index || stage.lane !== first.lane || stage.rbcRoute !== first.rbcRoute
        || stage.exchangeDirection !== first.exchangeDirection) {
        throw new OperationsProviderStateError('Message-flow trace order, direction, lane, or RBC route is inconsistent.');
      }
    }

    const stages = trace.map((stage) => stage.stage);
    const transitions: Record<string, readonly string[]> = first.lane === 'pim_lane_2'
      ? {
          sender_ingress: ['pim_in'], pim_in: ['ids', 'unavailable'], ids: ['pim_out', 'unavailable'],
          pim_out: ['sender_return', 'unavailable'], sender_return: [], unavailable: [],
        }
      : {
          sender_ingress: ['pim_in'], pim_in: ['irg', 'unavailable'], irg: ['core_transit_projection', 'unavailable'],
          core_transit_projection: ['rbc', 'unavailable'], rbc: ['prism', 'ids', 'unavailable'],
          prism: ['pim_out', 'unavailable'], ids: ['pim_out', 'unavailable'],
          pim_out: ['receiver_delivery', 'sender_return', 'unavailable'], receiver_delivery: [], sender_return: [], unavailable: [],
        };
    if (stages.slice(1).some((stage, index) => !transitions[stages[index]]?.includes(stage))) {
      throw new OperationsProviderStateError('Message-flow trace violates the declared PIM lane transitions.');
    }
    if (!['receiver_delivery', 'sender_return', 'unavailable'].includes(last.stage)) {
      throw new OperationsProviderStateError('Message-flow trace must terminate at Receiver, Sender, or unavailable.');
    }
    if (first.lane === 'pim_lane_2' && first.rbcRoute !== 'not_reached') {
      throw new OperationsProviderStateError('PIM lane 2 must bypass RBC and route directly to IDS.');
    }
    const branchIndex = stages.indexOf('rbc');
    const prismIndex = stages.indexOf('prism');
    const idsIndex = stages.indexOf('ids');
    if (prismIndex >= 0 && idsIndex >= 0) throw new OperationsProviderStateError('A message-flow trace cannot traverse both Prism and IDS.');
    if (first.lane === 'pim_lane_1') {
      if (prismIndex >= 0 && (first.rbcRoute !== 'prism' || branchIndex !== prismIndex - 1)) {
        throw new OperationsProviderStateError('Only RBC may select the Prism route.');
      }
      if (idsIndex >= 0 && (first.rbcRoute !== 'ids' || branchIndex !== idsIndex - 1)) {
        throw new OperationsProviderStateError('Only RBC may select the IDS route.');
      }
      const unavailableIndex = stages.indexOf('unavailable');
      const expectedUnavailableRoute = branchIndex >= 0 && unavailableIndex === branchIndex + 1 ? 'unavailable' : 'not_reached';
      if (unavailableIndex >= 0 && first.rbcRoute !== expectedUnavailableRoute) {
        throw new OperationsProviderStateError('Unavailable trace makes an invalid RBC authority claim.');
      }
    }
    if (first.rbcRoute === 'prism' && last.stage !== 'receiver_delivery') {
      throw new OperationsProviderStateError('Prism must terminate by delivery to the Receiver.');
    }
    if ((first.rbcRoute === 'ids' || first.lane === 'pim_lane_2') && last.stage !== 'sender_return') {
      throw new OperationsProviderStateError('IDS must terminate by return to the original Sender.');
    }
    if (last.stage === 'receiver_delivery' && last.terminalOutcome !== 'delivered_to_receiver') {
      throw new OperationsProviderStateError('Receiver delivery terminal outcome is invalid.');
    }
    if (last.stage === 'sender_return') {
      const expectedOutcome = last.integrity === 'shortfall' ? 'returned_to_sender_with_shortfall' : 'returned_to_sender';
      if (last.terminalOutcome !== expectedOutcome) throw new OperationsProviderStateError('Sender return terminal outcome conflicts with integrity.');
    } else if (last.stage === 'unavailable' && (last.integrity !== 'unavailable' || last.terminalOutcome !== 'unavailable')) {
      throw new OperationsProviderStateError('Unavailable terminal stage must retain unavailable integrity and outcome.');
    }
    if (trace.slice(0, -1).some((stage) => stage.terminalOutcome !== 'pending')) {
      throw new OperationsProviderStateError('Only the terminal message-flow stage may declare a terminal outcome.');
    }
    const shortfallIndex = trace.findIndex((stage) => stage.integrity === 'shortfall');
    if (shortfallIndex >= 0 && trace.slice(shortfallIndex).some((stage) => !['shortfall', 'unavailable'].includes(stage.integrity))) {
      throw new OperationsProviderStateError('Message-flow integrity shortfall cannot be rewritten as coherent or unevaluated.');
    }
  }
}

function assertValidReplayState(
  snapshot: PodTopologySnapshot,
  events: readonly OperationEvent[],
): void {
  assertNoRestrictedFields(snapshot, 'snapshot');
  assertNoRestrictedFields(events, 'events');
  if (Buffer.byteLength(JSON.stringify(snapshot), 'utf8') > MAX_SERIALIZED_SNAPSHOT_BYTES || events.length > MAX_REPLAY_EVENTS) {
    throw new OperationsProviderStateError('Replay state exceeds the sanitized transport bounds.');
  }
  assertSnapshotProjectionShape(snapshot);
  if (
    snapshot.sourceBoundary !== SOURCE_BOUNDARY
    || !snapshot.schemaVersion
    || !snapshot.pod?.pod_id
    || !isIsoTimestamp(snapshot.capturedAt)
  ) {
    throw new OperationsProviderStateError('Replay snapshot is not a valid replay_fixture projection.');
  }

  const eventIds = new Set<string>();
  let previousSequence = 0;
  let previousObservedAt = Number.NEGATIVE_INFINITY;
  for (const [index, event] of events.entries()) {
    assertOperationEventShape(event, index);
    const observedAt = Date.parse(event.observedAt);
    if (
      !event.schemaVersion
      || !event.eventId
      || eventIds.has(event.eventId)
      || !Number.isInteger(event.sequence)
      || event.sequence <= previousSequence
      || !Number.isFinite(observedAt)
      || observedAt < previousObservedAt
      || event.podId !== snapshot.pod.pod_id
      || event.routeRefs.length !== event.route.orderedRefs.length
      || event.routeRefs.some((reference, index) => reference !== event.route.orderedRefs[index]?.id)
    ) {
      throw new OperationsProviderStateError('Replay operation events are invalid or non-deterministic.');
    }
    eventIds.add(event.eventId);
    previousSequence = event.sequence;
    previousObservedAt = observedAt;
  }
  assertMessageFlowTraces(events);
}

export class ReplayOperationsProvider implements OperationsProvider {
  private readonly snapshot: PodTopologySnapshot;
  private readonly events: readonly OperationEvent[];
  private readonly playbackRate: number;
  private readonly heartbeatMs: number;
  private activeConnections = 0;

  constructor(options: ReplayOperationsProviderOptions = {}) {
    this.snapshot = cloneJson(options.snapshot ?? REPLAY_FIXTURE_SNAPSHOT);
    this.events = cloneJson(options.events ?? REPLAY_FIXTURE_EVENTS);
    this.playbackRate = options.playbackRate ?? 1;
    this.heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
    if (!Number.isFinite(this.playbackRate) || this.playbackRate <= 0) {
      throw new OperationsProviderStateError('Replay playbackRate must be a finite positive number.');
    }
    if (!Number.isFinite(this.heartbeatMs) || this.heartbeatMs <= 0) {
      throw new OperationsProviderStateError('Replay heartbeatMs must be a finite positive number.');
    }
    assertValidReplayState(this.snapshot, this.events);
  }

  get activeStreamCount(): number {
    return this.activeConnections;
  }

  async sendSnapshot(_req: Request, res: Response): Promise<void> {
    assertValidReplayState(this.snapshot, this.events);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-AEGIS-Source-Boundary', SOURCE_BOUNDARY);
    res.json(this.snapshot);
  }

  async openStream(req: Request, res: Response): Promise<void> {
    assertValidReplayState(this.snapshot, this.events);
    const requestedCursor = (req.header('last-event-id')
      ?? (typeof req.query.cursor === 'string' ? req.query.cursor : undefined))?.trim();
    const cursorIndex = requestedCursor
      ? this.events.findIndex(event => event.eventId === requestedCursor)
      : -1;
    if (requestedCursor && cursorIndex < 0) {
      res.status(409).json({ error: 'operations_cursor_not_found', resetRequired: true });
      return;
    }
    const events = this.events.slice(cursorIndex + 1);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-AEGIS-Source-Boundary', SOURCE_BOUNDARY);
    res.flushHeaders();
    res.write('retry: 2000\n\n');
    res.write(`event: replay-start\ndata: ${JSON.stringify({
      sourceBoundary: SOURCE_BOUNDARY,
      requestedCursor: requestedCursor ?? null,
      resetMode: 'omit_cursor',
    })}\n\n`);

    this.activeConnections += 1;
    let closed = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const heartbeat = setInterval(() => {
      if (!closed && !res.writableEnded && !res.destroyed) {
        res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      }
    }, this.heartbeatMs);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      timers.forEach(clearTimeout);
      timers.clear();
      clearInterval(heartbeat);
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    };
    res.once('close', cleanup);
    req.once('aborted', cleanup);

    const baseline = events[0] ? Date.parse(events[0].observedAt) : 0;
    for (const event of events) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!closed && !res.writableEnded && !res.destroyed) {
          res.write(`id: ${event.eventId}\n`);
          res.write('event: operation\n');
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      }, Math.max(0, (Date.parse(event.observedAt) - baseline) / this.playbackRate));
      timers.add(timer);
    }

    const endDelay = events.length
      ? (Date.parse(events[events.length - 1].observedAt) - baseline) / this.playbackRate + 1
      : 0;
    const endTimer = setTimeout(() => {
      timers.delete(endTimer);
      if (!closed && !res.writableEnded && !res.destroyed) {
        const finalEvent = this.events[this.events.length - 1];
        res.write(`event: replay-complete\ndata: ${JSON.stringify({
          sourceBoundary: SOURCE_BOUNDARY,
          finalEventId: finalEvent?.eventId ?? null,
          finalSequence: finalEvent?.sequence ?? null,
          resetRequired: true,
          resetMode: 'omit_cursor',
        })}\n\n`);
        res.end();
      }
      cleanup();
    }, endDelay);
    timers.add(endTimer);
  }
}
