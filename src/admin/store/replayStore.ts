import type {
  ComponentKind,
  OperationEvent,
  PodTopologySnapshot,
} from '../domain/index.ts';
import {
  AdminRuntimeValidationError,
  MAX_SEQUENCE_JUMP,
  validateOperationEvent,
  validatePodTopologySnapshot,
  type InvalidOperationEvidence,
} from '../domain/validation.ts';

export const MAX_REPLAY_EVENTS = 10_000;
export const REPLAY_WINDOW_MS = 15 * 60 * 1_000;
export const CHECKPOINT_INTERVAL_MS = 30_000;
const MAX_ANOMALIES = 500;

export interface ReplayCursor {
  eventId: string;
  sequence: number;
}

export interface ReplayCheckpoint {
  replayTimeMs: number;
  eventIndex: number;
  sequence: number;
}

export interface SequenceGapRange {
  start: number;
  end: number;
}

export type StreamAnomaly =
  | { kind: 'duplicate_event'; eventId: string; sequence: number }
  | { kind: 'duplicate_sequence'; eventId: string; sequence: number }
  | { kind: 'out_of_order'; eventId: string; sequence: number; highestSeenSequence: number }
  | { kind: 'gap'; eventId: string; sequence: number; range: SequenceGapRange }
  | { kind: 'invalid_event'; evidence: InvalidOperationEvidence };

export interface ReplayClockState {
  playheadMs: number;
  rangeStartMs: number;
  rangeEndMs: number;
  speed: number;
  paused: boolean;
  followingLive: boolean;
}

export interface ReplayState {
  topology?: PodTopologySnapshot;
  events: OperationEvent[];
  cursor?: ReplayCursor;
  highestSeenSequence: number;
  missingSequenceRanges: SequenceGapRange[];
  missingSequenceCount: number;
  anomalies: StreamAnomaly[];
  checkpoints: ReplayCheckpoint[];
  clock: ReplayClockState;
  selectedComponent?: { kind: ComponentKind; id: string };
  selectedOperationId?: string;
}

export type ReplayAction =
  | { type: 'LOAD_SNAPSHOT'; snapshot: PodTopologySnapshot }
  | { type: 'INGEST_EVENT'; event: OperationEvent }
  | { type: 'INGEST_EVENTS'; events: readonly OperationEvent[] }
  | { type: 'TICK'; elapsedWallMs: number }
  | { type: 'PAUSE_VIEW' }
  | { type: 'PLAY_VIEW' }
  | { type: 'SEEK'; replayTimeMs: number }
  | { type: 'STEP_EVENT'; direction: -1 | 1 }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'JUMP_TO_LIVE' }
  | { type: 'REWIND_REPLAY' }
  | { type: 'RESET_REPLAY'; rangeStartMs?: number; rangeEndMs?: number }
  | { type: 'SELECT_COMPONENT'; component?: { kind: ComponentKind; id: string } }
  | { type: 'SELECT_OPERATION'; operationId?: string };

export function createInitialReplayState(
  rangeStartMs = 0,
  rangeEndMs = rangeStartMs,
): ReplayState {
  return {
    events: [],
    highestSeenSequence: 0,
    missingSequenceRanges: [],
    missingSequenceCount: 0,
    anomalies: [],
    checkpoints: [],
    clock: {
      playheadMs: rangeStartMs,
      rangeStartMs,
      rangeEndMs,
      speed: 1,
      paused: true,
      followingLive: true,
    },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function eventTime(event: OperationEvent): number {
  return Date.parse(event.observedAt);
}

function trimEvents(events: OperationEvent[]): OperationEvent[] {
  if (events.length === 0) return events;
  const newestTime = Math.max(...events.map(eventTime));
  const cutoff = newestTime - REPLAY_WINDOW_MS;
  return events
    .filter((event) => eventTime(event) >= cutoff)
    .sort((left, right) => eventTime(left) - eventTime(right) || left.sequence - right.sequence)
    .slice(-MAX_REPLAY_EVENTS);
}

function findMissingSequenceRanges(events: readonly OperationEvent[]): SequenceGapRange[] {
  if (events.length < 2) return [];
  const sequences = [...new Set(events.map((event) => event.sequence))].sort((a, b) => a - b);
  const ranges: SequenceGapRange[] = [];
  for (let index = 1; index < sequences.length; index += 1) {
    if (sequences[index] > sequences[index - 1] + 1) {
      ranges.push({ start: sequences[index - 1] + 1, end: sequences[index] - 1 });
    }
  }
  return ranges.slice(-MAX_ANOMALIES);
}

function missingSequenceCount(ranges: readonly SequenceGapRange[]): number {
  return ranges.reduce((total, range) => total + range.end - range.start + 1, 0);
}

export function buildReplayCheckpoints(events: readonly OperationEvent[]): ReplayCheckpoint[] {
  if (events.length === 0) return [];
  const checkpoints: ReplayCheckpoint[] = [];
  let nextCheckpoint = eventTime(events[0]);
  events.forEach((event, eventIndex) => {
    const timestamp = eventTime(event);
    if (timestamp >= nextCheckpoint) {
      checkpoints.push({ replayTimeMs: timestamp, eventIndex, sequence: event.sequence });
      nextCheckpoint = timestamp + CHECKPOINT_INTERVAL_MS;
    }
  });
  return checkpoints;
}

function pushAnomalies(existing: StreamAnomaly[], additions: StreamAnomaly[]): StreamAnomaly[] {
  return [...existing, ...additions].slice(-MAX_ANOMALIES);
}

function ingestEvent(state: ReplayState, event: OperationEvent): ReplayState {
  try {
    if (!state.topology) throw new AdminRuntimeValidationError('Invalid operation event', ['active topology is required'], {
      eventId: event?.eventId,
      sequence: event?.sequence,
      operationId: event?.operationId,
      routeRefs: Array.isArray(event?.routeRefs) ? event.routeRefs.slice(0, 256) : [],
      evidenceRefs: Array.isArray(event?.evidenceRefs) ? event.evidenceRefs.slice(0, 256) : [],
      issues: ['active topology is required'],
    });
    validateOperationEvent(event, state.topology);
  } catch (error) {
    const evidence = error instanceof AdminRuntimeValidationError && error.invalidEvent
      ? error.invalidEvent
      : {
        eventId: event?.eventId,
        sequence: event?.sequence,
        operationId: event?.operationId,
        routeRefs: Array.isArray(event?.routeRefs) ? event.routeRefs.slice(0, 256) : [],
        evidenceRefs: Array.isArray(event?.evidenceRefs) ? event.evidenceRefs.slice(0, 256) : [],
        issues: [error instanceof Error ? error.message : 'invalid operation event'],
      };
    return { ...state, anomalies: pushAnomalies(state.anomalies, [{ kind: 'invalid_event', evidence }]) };
  }

  const duplicateEvent = state.events.some((existing) => existing.eventId === event.eventId);
  if (duplicateEvent) {
    return {
      ...state,
      anomalies: pushAnomalies(state.anomalies, [{
        kind: 'duplicate_event',
        eventId: event.eventId,
        sequence: event.sequence,
      }]),
    };
  }

  const duplicateSequence = state.events.some((existing) => existing.sequence === event.sequence);
  if (duplicateSequence) {
    return {
      ...state,
      anomalies: pushAnomalies(state.anomalies, [{
        kind: 'duplicate_sequence',
        eventId: event.eventId,
        sequence: event.sequence,
      }]),
    };
  }

  const additions: StreamAnomaly[] = [];
  if (state.highestSeenSequence > 0 && event.sequence < state.highestSeenSequence) {
    additions.push({
      kind: 'out_of_order',
      eventId: event.eventId,
      sequence: event.sequence,
      highestSeenSequence: state.highestSeenSequence,
    });
  } else if (state.highestSeenSequence > 0 && event.sequence > state.highestSeenSequence + 1) {
    const jump = event.sequence - state.highestSeenSequence;
    if (jump > MAX_SEQUENCE_JUMP) {
      const evidence: InvalidOperationEvidence = {
        eventId: event.eventId,
        sequence: event.sequence,
        operationId: event.operationId,
        routeRefs: [...event.routeRefs],
        evidenceRefs: [...event.evidenceRefs],
        issues: [`sequence jump ${jump} exceeds maximum ${MAX_SEQUENCE_JUMP}`],
      };
      return { ...state, anomalies: pushAnomalies(state.anomalies, [{ kind: 'invalid_event', evidence }]) };
    }
    additions.push({
      kind: 'gap',
      eventId: event.eventId,
      sequence: event.sequence,
      range: { start: state.highestSeenSequence + 1, end: event.sequence - 1 },
    });
  }

  const events = trimEvents([...state.events, event]);
  const rangeStartMs = events.length ? eventTime(events[0]) : state.clock.rangeStartMs;
  const rangeEndMs = events.length ? eventTime(events[events.length - 1]) : state.clock.rangeEndMs;
  const newestBySequence = event.sequence > (state.cursor?.sequence ?? -1)
    ? { eventId: event.eventId, sequence: event.sequence }
    : state.cursor;

  const missingSequenceRanges = findMissingSequenceRanges(events);
  return {
    ...state,
    events,
    cursor: newestBySequence,
    highestSeenSequence: Math.max(state.highestSeenSequence, event.sequence),
    missingSequenceRanges,
    missingSequenceCount: missingSequenceCount(missingSequenceRanges),
    anomalies: pushAnomalies(state.anomalies, additions),
    checkpoints: buildReplayCheckpoints(events),
    clock: {
      ...state.clock,
      rangeStartMs,
      rangeEndMs,
      playheadMs: state.clock.followingLive
        ? Math.max(state.clock.playheadMs, rangeEndMs)
        : clamp(state.clock.playheadMs, rangeStartMs, rangeEndMs),
    },
  };
}

function stepEvent(state: ReplayState, direction: -1 | 1): ReplayState {
  const times = [...new Set(state.events.map(eventTime))].sort((a, b) => a - b);
  if (times.length === 0) return state;
  const target = direction > 0
    ? times.find((timestamp) => timestamp > state.clock.playheadMs) ?? times[times.length - 1]
    : [...times].reverse().find((timestamp) => timestamp < state.clock.playheadMs) ?? times[0];
  return {
    ...state,
    clock: { ...state.clock, playheadMs: target, paused: true, followingLive: false },
  };
}

export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'LOAD_SNAPSHOT': {
      const snapshot = validatePodTopologySnapshot(action.snapshot);
      const snapshotTime = Date.parse(snapshot.capturedAt);
      const boundaryChanged = !!state.topology && (
        state.topology.pod.pod_id !== snapshot.pod.pod_id
        || state.topology.schemaVersion !== snapshot.schemaVersion
        || state.topology.sourceBoundary !== snapshot.sourceBoundary
      );
      if (boundaryChanged) {
        const reset = createInitialReplayState(snapshotTime, snapshotTime);
        return { ...reset, topology: snapshot };
      }
      const hasEvents = state.events.length > 0;
      return {
        ...state,
        topology: snapshot,
        clock: hasEvents ? state.clock : {
          ...state.clock,
          playheadMs: snapshotTime,
          rangeStartMs: snapshotTime,
          rangeEndMs: snapshotTime,
        },
      };
    }
    case 'INGEST_EVENT':
      return ingestEvent(state, action.event);
    case 'INGEST_EVENTS':
      return action.events.reduce(ingestEvent, state);
    case 'TICK': {
      if (state.clock.paused || action.elapsedWallMs <= 0) return state;
      const advanced = state.clock.playheadMs + action.elapsedWallMs * state.clock.speed;
      const playheadMs = state.clock.followingLive
        ? Math.max(state.clock.rangeEndMs, advanced)
        : clamp(advanced, state.clock.rangeStartMs, state.clock.rangeEndMs);
      return {
        ...state,
        clock: {
          ...state.clock,
          playheadMs,
          paused: state.clock.followingLive ? false : playheadMs >= state.clock.rangeEndMs,
        },
      };
    }
    case 'PAUSE_VIEW':
      return {
        ...state,
        clock: {
          ...state.clock,
          playheadMs: Math.min(state.clock.playheadMs, state.clock.rangeEndMs),
          paused: true,
          followingLive: false,
        },
      };
    case 'PLAY_VIEW':
      return { ...state, clock: { ...state.clock, paused: false, followingLive: false } };
    case 'SEEK':
      return {
        ...state,
        clock: {
          ...state.clock,
          playheadMs: clamp(action.replayTimeMs, state.clock.rangeStartMs, state.clock.rangeEndMs),
          paused: true,
          followingLive: false,
        },
      };
    case 'STEP_EVENT':
      return stepEvent(state, action.direction);
    case 'SET_SPEED':
      return Number.isFinite(action.speed) && action.speed > 0
        ? { ...state, clock: { ...state.clock, speed: action.speed } }
        : state;
    case 'JUMP_TO_LIVE':
      return {
        ...state,
        clock: {
          ...state.clock,
          playheadMs: state.clock.rangeEndMs,
          paused: false,
          followingLive: true,
        },
      };
    case 'REWIND_REPLAY':
      return {
        ...state,
        clock: {
          ...state.clock,
          playheadMs: state.clock.rangeStartMs,
          paused: true,
          followingLive: false,
        },
      };
    case 'RESET_REPLAY': {
      const reset = createInitialReplayState(action.rangeStartMs, action.rangeEndMs);
      return { ...reset, topology: state.topology };
    }
    case 'SELECT_COMPONENT':
      return { ...state, selectedComponent: action.component };
    case 'SELECT_OPERATION':
      return { ...state, selectedOperationId: action.operationId };
    default:
      return state;
  }
}
