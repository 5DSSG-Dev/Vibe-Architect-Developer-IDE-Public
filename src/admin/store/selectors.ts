import type {
  ComponentKind,
  ComponentStatusAxes,
  OperationEvent,
  RouteDescriptor,
} from '../domain/index.ts';
import type { ReplayState } from './replayStore.ts';

export interface OperationFilters {
  componentKinds?: ComponentKind[];
  phases?: OperationEvent['phase'][];
  statuses?: OperationEvent['status'][];
  operationId?: string;
}

export function selectEventsAtPlayhead(state: ReplayState): OperationEvent[] {
  return state.events.filter((event) => Date.parse(event.observedAt) <= state.clock.playheadMs);
}

export function selectVisibleEvents(
  state: ReplayState,
  filters: OperationFilters = {},
): OperationEvent[] {
  return selectEventsAtPlayhead(state).filter((event) => {
    if (filters.componentKinds && !filters.componentKinds.includes(event.componentRef.kind)) return false;
    if (filters.phases && !filters.phases.includes(event.phase)) return false;
    if (filters.statuses && !filters.statuses.includes(event.status)) return false;
    if (filters.operationId && event.operationId !== filters.operationId) return false;
    if (state.selectedComponent && (
      event.componentRef.kind !== state.selectedComponent.kind
      || event.componentRef.id !== state.selectedComponent.id
    )) return false;
    return true;
  });
}

export function selectOperationEvents(state: ReplayState, operationId: string): OperationEvent[] {
  return selectEventsAtPlayhead(state).filter((event) => event.operationId === operationId);
}

export function selectOperationRoute(state: ReplayState, operationId: string): RouteDescriptor | undefined {
  return selectOperationEvents(state, operationId)[0]?.route;
}

export function selectLatestComponentEvent(
  state: ReplayState,
  kind: ComponentKind,
  id: string,
): OperationEvent | undefined {
  return [...selectEventsAtPlayhead(state)].reverse().find(
    (event) => event.componentRef.kind === kind && event.componentRef.id === id,
  );
}

export function selectComponentStatus(
  state: ReplayState,
  kind: ComponentKind,
  id: string,
  fallback: ComponentStatusAxes,
): ComponentStatusAxes {
  const latest = selectLatestComponentEvent(state, kind, id);
  if (!latest) return fallback;
  return {
    ...fallback,
    activity: latest.phase === 'fell_short' ? 'fell_short' : latest.phase,
    health: latest.status,
  };
}

export function selectIncomingCount(state: ReplayState): number {
  return state.events.filter((event) => Date.parse(event.observedAt) > state.clock.playheadMs).length;
}

export function selectNeedsResynchronization(state: ReplayState): boolean {
  return state.missingSequenceRanges.length > 0;
}

export function selectOperationIds(state: ReplayState): string[] {
  return [...new Set(selectEventsAtPlayhead(state).map((event) => event.operationId))];
}
