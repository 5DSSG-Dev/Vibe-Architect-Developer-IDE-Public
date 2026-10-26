import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AdminSession } from './auth/AdminAuthGate';
import { SameOriginOperationsDataSource } from './data/index.ts';
import type { ComponentKind, OperationEvent } from './domain/index.ts';
import { createMessageFlowProjection, eventStatus, projectOperationEvents, projectPodTopology } from './projection/index.ts';
import {
  createInitialReplayState,
  replayReducer,
  selectIncomingCount,
  selectNeedsResynchronization,
  type OperationFilters,
  type ReplayAction,
  type ReplayState,
} from './store/index.ts';
import { AdminOperationsViewport } from './ui/AdminOperationsViewport';
import { Inspector, OperationsNavigation, OperationsTimeline, TopStatusBar } from './ui/AdminChrome';
import {
  chooseTransportRecovery,
  isUnauthorizedTransportError,
  reconnectDelayMs,
} from './ui/operationsTransportPolicy';
import './styles/admin-operations.css';

type ScreenState = 'loading' | 'ready' | 'denied' | 'error';
type TransportState = 'connecting' | 'open' | 'closed' | 'quarantined' | 'resyncing' | 'error';
type AdminReplayAction = ReplayAction | { type: 'SECURITY_CLEAR' };

function adminReplayReducer(state: ReplayState, action: AdminReplayAction): ReplayState {
  if (action.type === 'SECURITY_CLEAR') return createInitialReplayState();
  return replayReducer(state, action);
}

export default function AdminOperationsApp({ session }: { session: AdminSession }) {
  const [state, dispatch] = useReducer(adminReplayReducer, undefined, () => createInitialReplayState());
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [connection, setConnection] = useState<TransportState>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState<OperationFilters>({});
  const [viewMode, setViewMode] = useState<'flow' | 'topology'>('flow');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [compactViewport, setCompactViewport] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const [resetRequest, setResetRequest] = useState(0);
  const sourceRef = useRef<SameOriginOperationsDataSource | null>(null);
  const stateRef = useRef(state);
  const requestRecoveryRef = useRef<(forceResynchronization?: boolean) => void>(() => undefined);
  const manualResyncRef = useRef<() => void>(() => undefined);
  stateRef.current = state;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 720px)');
    const syncMotion = () => setReducedMotion(motion.matches);
    const syncCompact = () => setCompactViewport(compact.matches);
    motion.addEventListener('change', syncMotion);
    compact.addEventListener('change', syncCompact);
    return () => {
      motion.removeEventListener('change', syncMotion);
      compact.removeEventListener('change', syncCompact);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const source = new SameOriginOperationsDataSource();
    sourceRef.current = source;
    let active = true;
    let subscription: ReturnType<SameOriginOperationsDataSource['subscribe']> | undefined;
    let reconnectTimer: number | undefined;
    let failureCount = 0;
    let resumeAttempted = false;
    let resyncInFlight = false;

    const detachSubscription = () => {
      const current = subscription;
      subscription = undefined;
      current?.close();
    };

    const deny = (message: string) => {
      if (!active) return;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      detachSubscription();
      source.close();
      dispatch({ type: 'SECURITY_CLEAR' });
      setConnection('error');
      setScreen('denied');
      setErrorMessage(message);
    };

    const subscribe = (cursor?: string) => {
      if (!active) return;
      detachSubscription();
      setConnection('connecting');
      const next = source.subscribe(cursor);
      subscription = next;
      next.onEvent((event) => dispatch({ type: 'INGEST_EVENT', event }));
      next.onStatus((status, error) => {
        if (!active || subscription !== next) return;
        if (status === 'open') {
          failureCount = 0;
          resumeAttempted = false;
          resyncInFlight = false;
          setConnection('open');
          setErrorMessage('');
          dispatch({ type: 'JUMP_TO_LIVE' });
        } else if (status === 'closed') {
          subscription = undefined;
          setConnection('closed');
          dispatch({ type: 'PAUSE_VIEW' });
        } else if (status === 'error') {
          requestRecovery(error ?? new Error('Operations stream disconnected.'));
        } else {
          setConnection('connecting');
        }
      });
    };

    const resynchronize = async () => {
      if (!active || resyncInFlight) return;
      resyncInFlight = true;
      resumeAttempted = true;
      detachSubscription();
      setConnection('resyncing');
      setErrorMessage('Operational evidence is quarantined while the authoritative POD snapshot is reloaded.');
      try {
        const snapshot = await source.loadSnapshot(controller.signal);
        if (!active) return;
        dispatch({ type: 'RESET_REPLAY' });
        dispatch({ type: 'LOAD_SNAPSHOT', snapshot });
        resyncInFlight = false;
        subscribe();
      } catch (error) {
        resyncInFlight = false;
        if (!active || (error as Error).name === 'AbortError') return;
        if (isUnauthorizedTransportError(error as Error & { status?: number })) {
          deny('Your Service Operations session is no longer authorized.');
          return;
        }
        requestRecovery(error as Error);
      }
    };

    const requestRecovery = (streamError: Error, forceResynchronization = false) => {
      if (!active) return;
      if (isUnauthorizedTransportError(streamError as Error & { status?: number })) {
        deny('Your Service Operations session is no longer authorized.');
        return;
      }
      detachSubscription();
      dispatch({ type: 'PAUSE_VIEW' });
      failureCount += 1;
      const current = stateRef.current;
      const recovery = chooseTransportRecovery({
        failureCount,
        hasCursor: Boolean(current.cursor?.eventId),
        resumeAttempted,
        needsResynchronization: forceResynchronization || selectNeedsResynchronization(current),
      });
      setErrorMessage(streamError.message || 'The protected operation stream disconnected.');
      if (recovery === 'stop') {
        setConnection('error');
        return;
      }
      setConnection(recovery === 'resync' ? 'resyncing' : 'quarantined');
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        if (recovery === 'resume') {
          resumeAttempted = true;
          subscribe(stateRef.current.cursor?.eventId);
        } else {
          void resynchronize();
        }
      }, reconnectDelayMs(failureCount));
    };

    requestRecoveryRef.current = (forceResynchronization = false) => {
      requestRecovery(new Error(forceResynchronization
        ? 'A sequence gap requires authoritative resynchronization.'
        : 'Manual operational transport retry requested.'), forceResynchronization);
    };
    manualResyncRef.current = () => {
      failureCount = 0;
      resumeAttempted = true;
      requestRecovery(new Error('Manual authoritative resynchronization requested.'), true);
    };

    void source.loadSnapshot(controller.signal).then((snapshot) => {
      if (!active) return;
      dispatch({ type: 'LOAD_SNAPSHOT', snapshot });
      setScreen('ready');
      subscribe();
    }).catch((error: Error & { status?: number }) => {
      if (!active || error.name === 'AbortError') return;
      if (isUnauthorizedTransportError(error)) {
        deny('Your session does not have Service Operations access.');
        return;
      }
      dispatch({ type: 'SECURITY_CLEAR' });
      setScreen('error');
      setErrorMessage(error.message);
    });

    return () => {
      active = false;
      requestRecoveryRef.current = () => undefined;
      manualResyncRef.current = () => undefined;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      controller.abort();
      detachSubscription();
      source.close();
      sourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (selectNeedsResynchronization(state)) requestRecoveryRef.current(true);
  }, [state.missingSequenceCount]);

  useEffect(() => {
    if (state.clock.paused) return;
    let previous = performance.now();
    const handle = window.setInterval(() => {
      const now = performance.now();
      const elapsedWallMs = Math.min(100, Math.max(0, now - previous));
      previous = now;
      dispatch({ type: 'TICK', elapsedWallMs });
    }, 33);
    return () => window.clearInterval(handle);
  }, [state.clock.paused, state.clock.speed]);

  const sceneProjection = useMemo(() => state.topology ? projectPodTopology(state.topology) : undefined, [state.topology]);
  const eventsAtPlayhead = useMemo(
    () => state.events.filter((event) => Date.parse(event.observedAt) <= state.clock.playheadMs),
    [state.events, state.clock.playheadMs],
  );
  const visibleEvents = useMemo(
    () => viewMode === 'flow'
      ? eventsAtPlayhead.filter((event) => !state.selectedOperationId || event.operationId === state.selectedOperationId)
      : eventsAtPlayhead.filter((event) => eventMatchesFilters(event, filters, state.selectedComponent, state.selectedOperationId)),
    [eventsAtPlayhead, filters, state.selectedComponent, state.selectedOperationId, viewMode],
  );
  const operationIds = useMemo(() => state.selectedOperationId ? new Set([state.selectedOperationId]) : undefined, [state.selectedOperationId]);
  const operationProjection = useMemo(
    () => sceneProjection ? projectOperationEvents(visibleEvents, sceneProjection, operationIds) : [],
    [visibleEvents, sceneProjection, operationIds],
  );
  const selectedFlowIds = useMemo(() => state.selectedOperationId ? new Set([state.selectedOperationId]) : undefined, [state.selectedOperationId]);
  const messageFlowProjection = useMemo(
    () => createMessageFlowProjection(state.events, selectedFlowIds, state.clock.playheadMs),
    [state.events, selectedFlowIds, state.clock.playheadMs],
  );
  const statusByComponent = useMemo(() => {
    const statuses = new Map<string, ReturnType<typeof eventStatus>>();
    for (const event of eventsAtPlayhead) statuses.set(event.componentRef.id, eventStatus(event));
    return statuses;
  }, [eventsAtPlayhead]);
  const latestEventByComponent = useMemo(() => {
    const latest = new Map<string, OperationEvent>();
    for (const event of eventsAtPlayhead) latest.set(event.componentRef.id, event);
    return latest;
  }, [eventsAtPlayhead]);
  const invalidRouteCount = useMemo(() => {
    if (!sceneProjection) return 0;
    return eventsAtPlayhead.filter((event) => event.route.orderedRefs.some((reference) => !sceneProjection.positions.has(reference.id))).length;
  }, [eventsAtPlayhead, sceneProjection]);
  const aggregateHealth = useMemo(() => aggregateOperationalHealth(state.topology, latestEventByComponent), [state.topology, latestEventByComponent]);
  const newestSourceTimestamp = state.events[state.events.length - 1]?.observedAt ?? state.topology?.capturedAt ?? '';
  const environment = state.topology?.sourceBoundary === 'live' ? 'Protected Service' : 'Replay Fixture';
  const dataQuarantined = connection === 'quarantined' || connection === 'resyncing' || connection === 'error';

  const selectComponent = (component?: { kind: ComponentKind; id: string }) => {
    dispatch({ type: 'SELECT_COMPONENT', component });
    dispatch({ type: 'SELECT_OPERATION', operationId: undefined });
  };
  const selectOperation = (operationId?: string) => {
    dispatch({ type: 'SELECT_OPERATION', operationId });
    if (!operationId) return;
    const latest = [...eventsAtPlayhead].reverse().find((event) => event.operationId === operationId);
    if (latest) dispatch({ type: 'SELECT_COMPONENT', component: latest.componentRef });
  };

  const handleKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a')) return;
    if (event.key === 'Escape') {
      selectComponent(undefined);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setResetRequest((value) => value + 1);
    } else if ((event.key === 'Enter' || event.key.toLowerCase() === 'f') && state.selectedComponent) {
      event.preventDefault();
      setFocusRequest((value) => value + 1);
    } else if (event.code === 'Space') {
      event.preventDefault();
      dispatch({ type: state.clock.paused ? 'PLAY_VIEW' : 'PAUSE_VIEW' });
    }
  };

  const logout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setLogoutError('');
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-CSRF-Token': session.csrfToken },
      });
      if (!response.ok) throw new Error(`Sign out was refused (${response.status}).`);
      window.location.assign('/');
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Sign out failed.');
      setLogoutPending(false);
    }
  };

  if (screen === 'loading') return <main className="admin-gate-state" aria-busy="true"><ActivityGlyph /><h1>Opening Service Operations</h1><p>Loading the protected POD topology and evidence stream…</p></main>;
  if (screen === 'denied') return <main className="admin-gate-state"><ShieldGlyph /><h1>Service Operations access required</h1><p>{errorMessage}</p><a href="/auth/entra/login">Sign in with Microsoft Entra</a></main>;
  if (screen === 'error' || !state.topology || !sceneProjection) return <main className="admin-gate-state"><AlertGlyph /><h1>Operations view unavailable</h1><p>{errorMessage || 'No POD topology was returned.'}</p><button onClick={() => window.location.reload()}>Retry protected connection</button></main>;

  return (
    <main className="admin-operations-app" onKeyDown={handleKeyboard} tabIndex={-1}>
      <TopStatusBar
        session={session}
        snapshot={state.topology}
        connection={connection}
        eventCount={state.events.length}
        anomalyCount={state.anomalies.length + invalidRouteCount}
        environment={environment}
        aggregateHealth={aggregateHealth}
        newestSourceTimestamp={newestSourceTimestamp}
        logoutPending={logoutPending}
        onLogout={() => void logout()}
      />
      <div className="admin-workspace">
        {dataQuarantined && (
          <div className="admin-quarantine-banner" role="status" aria-live="assertive">
            <strong>Operational data quarantined</strong>
            <span>{connection === 'resyncing' ? 'Reloading authoritative POD evidence…' : errorMessage || 'The live transport is unavailable. Displayed evidence is stale and frozen.'}</span>
            {connection === 'error' && <button type="button" onClick={() => manualResyncRef.current()}>Retry authoritative sync</button>}
          </div>
        )}
        {logoutError && <div className="admin-logout-error" role="alert">{logoutError}</div>}
        {invalidRouteCount > 0 && <div className="admin-route-warning" role="alert">{invalidRouteCount} operation packet{invalidRouteCount === 1 ? '' : 's'} withheld: declared route references are not present in this POD snapshot.</div>}
        <AdminOperationsViewport
          topology={sceneProjection.topology}
          operations={operationProjection}
          replayTimeMs={state.clock.playheadMs}
          playbackActive={!state.clock.paused}
          reducedMotion={reducedMotion}
          selectedComponent={state.selectedComponent}
          onSelectComponent={selectComponent}
          enabled={!compactViewport}
          focusRequest={focusRequest}
          resetRequest={resetRequest}
          statusByComponent={statusByComponent}
          viewMode={viewMode}
          messageFlow={messageFlowProjection}
        />
        <OperationsNavigation
          snapshot={state.topology}
          events={eventsAtPlayhead}
          viewMode={viewMode}
          selected={state.selectedComponent}
          selectedOperationId={state.selectedOperationId}
          filters={filters}
          onFiltersChange={setFilters}
          onViewModeChange={setViewMode}
          onSelect={selectComponent}
          onSelectOperation={selectOperation}
          latestEvents={latestEventByComponent}
        />
        <Inspector snapshot={state.topology} events={eventsAtPlayhead} selectedComponent={state.selectedComponent} selectedOperationId={state.selectedOperationId} anomalies={state.anomalies} onSelectOperation={selectOperation} />
      </div>
      <OperationsTimeline
        clock={state.clock}
        events={visibleEvents}
        incomingCount={selectIncomingCount(state)}
        selectedOperationId={state.selectedOperationId}
        onPause={() => dispatch({ type: 'PAUSE_VIEW' })}
        onPlay={() => dispatch({ type: 'PLAY_VIEW' })}
        onSeek={(replayTimeMs) => dispatch({ type: 'SEEK', replayTimeMs })}
        onStep={(direction) => dispatch({ type: 'STEP_EVENT', direction })}
        onJumpLive={() => dispatch({ type: 'JUMP_TO_LIVE' })}
        onReset={() => dispatch({ type: 'REWIND_REPLAY' })}
        onSpeedChange={(speed) => dispatch({ type: 'SET_SPEED', speed })}
        onSelectOperation={selectOperation}
      />
      <div className="admin-a11y-help" aria-label="Keyboard controls">Enter or F focus · Escape clear selection · Home reset camera · Space pause view</div>
    </main>
  );
}

function eventMatchesFilters(
  event: OperationEvent,
  filters: OperationFilters,
  selectedComponent?: { kind: ComponentKind; id: string },
  selectedOperationId?: string,
): boolean {
  if (filters.componentKinds && !filters.componentKinds.includes(event.componentRef.kind)) return false;
  if (filters.phases && !filters.phases.includes(event.phase)) return false;
  if (filters.statuses && !filters.statuses.includes(event.status)) return false;
  if (selectedComponent && (event.componentRef.kind !== selectedComponent.kind || event.componentRef.id !== selectedComponent.id)) return false;
  if (selectedOperationId && event.operationId !== selectedOperationId) return false;
  return true;
}

function ActivityGlyph() { return <span className="admin-gate-glyph">◌</span>; }
function ShieldGlyph() { return <span className="admin-gate-glyph">◇</span>; }
function AlertGlyph() { return <span className="admin-gate-glyph">!</span>; }

function aggregateOperationalHealth(snapshot: ReplayState['topology'], latestEvents: ReadonlyMap<string, OperationEvent>): OperationEvent['status'] | 'unknown' {
  if (!snapshot) return 'unknown';
  const priority: Record<OperationEvent['status'] | 'unknown', number> = {
    nominal: 0,
    contained: 1,
    degraded: 2,
    rolled_back: 3,
    rejected: 4,
    unknown: 5,
  };
  const snapshotHealth = [snapshot.pod, ...snapshot.orbs, ...snapshot.umbilicals, ...snapshot.satellites, ...snapshot.portals]
    .map((component) => component.status.health)
    .filter((health): health is OperationEvent['status'] | 'unknown' => health in priority);
  const eventHealth = [...latestEvents.values()].map((event) => event.status);
  return [...snapshotHealth, ...eventHealth].reduce<OperationEvent['status'] | 'unknown'>((worst, health) => priority[health] > priority[worst] ? health : worst, 'nominal');
}
