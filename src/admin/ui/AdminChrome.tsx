import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Box,
  CircleDot,
  Clock3,
  Eye,
  Filter,
  Home,
  LogOut,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Satellite,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Waypoints,
} from 'lucide-react';
import type { AdminSession } from '../auth/AdminAuthGate';
import type {
  ComponentKind,
  ComponentStatusAxes,
  OperationEvent,
  PodTopologySnapshot,
  SafeEvidenceSummary,
  SanitizedMessageFlowProjection,
  ServicePipelineStage,
} from '../domain/index.ts';
import type { OperationFilters } from '../store/index.ts';
import type { ReplayClockState, StreamAnomaly } from '../store/replayStore.ts';

export interface TopStatusBarProps {
  session: AdminSession;
  snapshot: PodTopologySnapshot;
  connection: 'connecting' | 'open' | 'closed' | 'quarantined' | 'resyncing' | 'error';
  eventCount: number;
  anomalyCount: number;
  environment: string;
  aggregateHealth: OperationEvent['status'] | 'unknown';
  newestSourceTimestamp: string;
  logoutPending: boolean;
  onLogout(): void;
}

export function TopStatusBar({ session, snapshot, connection, eventCount, anomalyCount, environment, aggregateHealth, newestSourceTimestamp, logoutPending, onLogout }: TopStatusBarProps) {
  const isReplay = snapshot.sourceBoundary === 'replay_fixture';
  return (
    <header className="admin-statusbar">
      <div className="admin-brand">
        <ShieldCheck size={18} aria-hidden="true" />
        <div><strong>Service Operations</strong><span>Message Flow Observatory</span></div>
      </div>
      <div className="admin-core-identity">
        <span className="admin-kicker">ACTIVE POD</span>
        <strong>{snapshot.pod.displayName}</strong>
        <span>{snapshot.pod.pod_id}</span>
      </div>
      <div className="admin-status-cluster">
        <span className={`admin-boundary-badge ${isReplay ? 'is-replay' : 'is-live'}`}>
          <Radio size={13} aria-hidden="true" /> {isReplay ? 'REPLAY DATA' : 'LIVE'}
        </span>
        <span className={`admin-connection is-${connection}`}><i />{connection}</span>
        <span className="admin-environment">{environment}</span>
        <span className={`admin-aggregate is-${aggregateHealth}`}>Health: {humanize(aggregateHealth)}</span>
        <span className="admin-freshness" title={newestSourceTimestamp}>Source: {formatFreshness(newestSourceTimestamp)}</span>
        <span>{eventCount} events</span>
        {anomalyCount > 0 && <span className="admin-warning"><AlertTriangle size={13} /> {anomalyCount}</span>}
        <span className="admin-user" title={session.username}>{session.name ?? session.username ?? session.subject}</span>
        <button className="admin-logout" type="button" onClick={onLogout} disabled={logoutPending} aria-label="Sign out of Service Operations">
          <LogOut size={13} /> {logoutPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}

interface OperationsNavigationProps {
  snapshot: PodTopologySnapshot;
  events: readonly OperationEvent[];
  viewMode: 'flow' | 'topology';
  selected?: { kind: ComponentKind; id: string };
  selectedOperationId?: string;
  filters: OperationFilters;
  onFiltersChange(filters: OperationFilters): void;
  onViewModeChange(viewMode: 'flow' | 'topology'): void;
  onSelect(component: { kind: ComponentKind; id: string }): void;
  onSelectOperation(operationId?: string): void;
  latestEvents: ReadonlyMap<string, OperationEvent>;
}

const FLOW_STAGES: readonly ServicePipelineStage[] = [
  'sender_ingress',
  'pim_in',
  'irg',
  'core_transit_projection',
  'rbc',
  'prism',
  'ids',
  'pim_out',
  'receiver_delivery',
  'sender_return',
  'unavailable',
];

const STAGE_LABELS: Record<ServicePipelineStage, string> = {
  sender_ingress: 'Sender Ingress',
  pim_in: 'PIM Inbound',
  irg: 'IRG',
  core_transit_projection: 'CORE Transit',
  rbc: 'RBC',
  prism: 'Prism',
  ids: 'IDS',
  pim_out: 'PIM Outbound',
  receiver_delivery: 'Receiver Delivery',
  sender_return: 'Return to Sender',
  unavailable: 'Unavailable',
};

const KIND_OPTIONS: Array<{ kind: ComponentKind; label: string }> = [
  { kind: 'pod', label: 'CORE' },
  { kind: 'orb', label: 'Orbs' },
  { kind: 'satellite', label: 'Satellites' },
  { kind: 'umbilical', label: 'Umbilicals' },
  { kind: 'portal', label: 'Portals' },
];

const STATUS_OPTIONS: Array<{ status: OperationEvent['status']; label: string }> = [
  { status: 'nominal', label: 'Nominal' },
  { status: 'degraded', label: 'Degraded' },
  { status: 'contained', label: 'Contained' },
  { status: 'rejected', label: 'Rejected' },
  { status: 'rolled_back', label: 'Rolled back' },
];

export function OperationsNavigation({ snapshot, events, viewMode, selected, selectedOperationId, filters, onFiltersChange, onViewModeChange, onSelect, onSelectOperation, latestEvents }: OperationsNavigationProps) {
  const flowEvents = useMemo(() => events.filter(hasMessageFlow), [events]);
  const activeByTransaction = useMemo(() => latestFlowByOperation(flowEvents), [flowEvents]);
  const activeTransactionCount = [...activeByTransaction.values()].filter((event) => event.messageFlow.terminalOutcome === 'pending').length;
  const selectedTrace = selectedOperationId ? flowEvents.filter((event) => event.operationId === selectedOperationId) : [];
  const selectedFlow = last([...selectedTrace].sort(compareFlowEvents))?.messageFlow;

  const toggleKind = (kind: ComponentKind) => {
    const current = filters.componentKinds ?? KIND_OPTIONS.map((option) => option.kind);
    const next = current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind];
    onFiltersChange({ ...filters, componentKinds: next });
  };
  const toggleStatus = (status: OperationEvent['status']) => {
    const current = filters.statuses ?? STATUS_OPTIONS.map((option) => option.status);
    const next = current.includes(status) ? current.filter((value) => value !== status) : [...current, status];
    onFiltersChange({ ...filters, statuses: next });
  };
  const selectClass = (kind: ComponentKind, id: string) => selected?.kind === kind && selected.id === id ? 'is-selected' : '';

  return (
    <aside className="admin-drawer admin-topology-drawer" aria-label="Message flow and POD topology navigation">
      <div className="admin-panel-heading"><Waypoints size={16} /><div><strong>Operations Map</strong><span>Observation only</span></div></div>
      <div className="admin-primary-tabs" role="tablist" aria-label="Operations map views">
        <button type="button" role="tab" aria-selected={viewMode === 'flow'} onClick={() => onViewModeChange('flow')}>Flow</button>
        <button type="button" role="tab" aria-selected={viewMode === 'topology'} onClick={() => onViewModeChange('topology')}>Topology</button>
      </div>

      {viewMode === 'flow' ? (
        <div className="admin-flow-panel" role="tabpanel" aria-label="Sanitized service message flow">
          <div className="admin-flow-summary">
            <span><strong>{activeTransactionCount}</strong> active transactions</span>
            <span><strong>{flowEvents.length}</strong> stage observations</span>
          </div>
          {selectedFlow && (
            <div className="admin-exchange-summary" aria-label="Selected exchange direction and terminal party">
              <span><small>Exchange</small><strong>{exchangeDirectionLabel(selectedFlow)}</strong></span>
              <span><small>Terminal party</small><strong>{terminalPartyLabel(selectedFlow)}</strong></span>
            </div>
          )}
          <ol className="admin-flow-rail" aria-label="Service stage rail">
            {FLOW_STAGES.map((stage) => {
              const active = [...activeByTransaction.values()].filter((event) => event.messageFlow.stage === stage);
              const inSelectedTrace = selectedTrace.some((event) => event.messageFlow.stage === stage);
              const newest = last(active);
              const isExchangeEndpoint = stage === 'sender_ingress' || stage === 'receiver_delivery' || stage === 'sender_return';
              return (
                <li key={stage} className={`${stage === 'prism' || stage === 'ids' ? 'is-fork' : ''} ${isExchangeEndpoint ? 'is-endpoint' : ''} ${inSelectedTrace ? 'is-in-trace' : ''}`}>
                  <button
                    type="button"
                    className={newest?.operationId === selectedOperationId ? 'is-selected' : ''}
                    onClick={() => newest && onSelectOperation(newest.operationId)}
                    disabled={!newest}
                    aria-label={`${STAGE_LABELS[stage]}, ${active.length} active transactions`}
                  >
                    <span className="admin-flow-node" aria-hidden="true" />
                    <span><strong>{STAGE_LABELS[stage]}</strong><small>{stageDescription(stage)}</small></span>
                    <b>{active.length}</b>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="admin-flow-truth-notes">
            <p><strong>RBC</strong> is the sole branch authority after IRG.</p>
            <p><strong>Prism</strong> proceeds to Receiver. <strong>IDS</strong> returns to the original Sender.</p>
            <p><strong>CORE Transit</strong> is a noncanonical coordination projection.</p>
            <p><strong>PIM Outbound</strong> is currently a placeholder / pass-through.</p>
          </div>
          {flowEvents.length === 0 && <div className="admin-empty-inline admin-flow-empty">Awaiting sanitized message-flow evidence. No stage was inferred from summaries.</div>}
        </div>
      ) : (
        <div className="admin-topology-panel" role="tabpanel" aria-label="POD topology">
          <section className="admin-filter-section" aria-labelledby="filter-heading">
            <h2 id="filter-heading"><Filter size={13} /> Visible operation kinds</h2>
            <div className="admin-filter-grid">
              {KIND_OPTIONS.map(({ kind, label }) => (
                <label key={kind}>
                  <input type="checkbox" checked={!filters.componentKinds || filters.componentKinds.includes(kind)} onChange={() => toggleKind(kind)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <h2 className="admin-filter-subheading">Operation status</h2>
            <div className="admin-filter-grid">
              {STATUS_OPTIONS.map(({ status, label }) => (
                <label key={status}>
                  <input type="checkbox" checked={!filters.statuses || filters.statuses.includes(status)} onChange={() => toggleStatus(status)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>
          <nav className="admin-topology-tree" aria-label="CORE object hierarchy">
            <button className={selectClass('pod', snapshot.pod.pod_id)} onClick={() => onSelect({ kind: 'pod', id: snapshot.pod.pod_id })}>
              <Box size={15} /><span><strong>{snapshot.pod.displayName}</strong><small>{statusText(withEventStatus(snapshot.pod.status, latestEvents.get(snapshot.pod.pod_id)))}</small></span><StatusMark status={withEventStatus(snapshot.pod.status, latestEvents.get(snapshot.pod.pod_id))} />
            </button>
            <ul>
              {snapshot.orbs.map((orb) => {
                const satellites = snapshot.satellites.filter((candidate) => candidate.parent_orb_id === orb.orb_id);
                const relations = snapshot.umbilicals.filter((candidate) => candidate.orb_id === orb.orb_id);
                return (
                  <li key={orb.orb_id}>
                    <button className={selectClass('orb', orb.orb_id)} onClick={() => onSelect({ kind: 'orb', id: orb.orb_id })}>
                      <CircleDot size={15} /><span><strong>{orb.abilityName}</strong><small>Orb · canonical</small></span><StatusMark status={withEventStatus(orb.status, latestEvents.get(orb.orb_id))} />
                    </button>
                    <ul>
                      {relations.map((relation) => (
                        <li key={relation.umbilical_id}><button className={selectClass('umbilical', relation.umbilical_id)} onClick={() => onSelect({ kind: 'umbilical', id: relation.umbilical_id })}>
                          <Activity size={14} /><span><strong>{relation.attachmentPoint}</strong><small>Umbilical relation</small></span><StatusMark status={withEventStatus(relation.status, latestEvents.get(relation.umbilical_id))} />
                        </button></li>
                      ))}
                      {satellites.map((satellite) => (
                        <li key={satellite.satellite_id}><button className={selectClass('satellite', satellite.satellite_id)} onClick={() => onSelect({ kind: 'satellite', id: satellite.satellite_id })}>
                          <Satellite size={14} /><span><strong>{satellite.name}</strong><small>Noncanonical projection</small></span><StatusMark status={withEventStatus(satellite.status, latestEvents.get(satellite.satellite_id))} />
                        </button></li>
                      ))}
                    </ul>
                  </li>
                );
              })}
              {snapshot.portals.map((portal) => (
                <li key={portal.portal_id}><button className={selectClass('portal', portal.portal_id)} onClick={() => onSelect({ kind: 'portal', id: portal.portal_id })}>
                  <Waypoints size={14} /><span><strong>{portal.name}</strong><small>Noncanonical conceptual projection</small></span><StatusMark status={withEventStatus(portal.status, latestEvents.get(portal.portal_id))} />
                </button></li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </aside>
  );
}

type InspectorTab = 'summary' | 'stage_trace' | 'boundary_evidence' | 'topology';

interface InspectorProps {
  snapshot: PodTopologySnapshot;
  events: readonly OperationEvent[];
  selectedComponent?: { kind: ComponentKind; id: string };
  selectedOperationId?: string;
  anomalies: readonly StreamAnomaly[];
  onSelectOperation(operationId?: string): void;
}

export function Inspector({ snapshot, events, selectedComponent, selectedOperationId, anomalies, onSelectOperation }: InspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('summary');
  const flowEvents = events.filter(hasMessageFlow);
  const activeOperationId = selectedOperationId ?? last(flowEvents)?.operationId ?? last(events)?.operationId;
  const transactionEvents = activeOperationId ? events.filter((event) => event.operationId === activeOperationId) : [];
  const transactionFlow = transactionEvents.filter(hasMessageFlow).sort(compareFlowEvents);
  const latestEvent = last(transactionEvents);
  const latestFlow = last(transactionFlow)?.messageFlow;
  const componentRef = selectedComponent ?? latestEvent?.componentRef;
  const component = componentRef ? findComponent(snapshot, componentRef.kind, componentRef.id) : snapshot.pod;
  const fallbackStatus = 'status' in component ? component.status : snapshot.pod.status;
  const status = withEventStatus(fallbackStatus, latestEvent);
  const evidence = 'evidence' in component ? component.evidence : snapshot.pod.evidence;

  return (
    <aside className="admin-drawer admin-inspector" aria-label="Transaction inspector">
      <div className="admin-panel-heading"><Eye size={16} /><div><strong>{activeOperationId ?? 'Awaiting transaction'}</strong><span>{latestFlow?.traceId ?? 'sanitized message-flow inspector'}</span></div></div>
      <div className="admin-inspector-tabs" role="tablist" aria-label="Transaction inspector views">
        {(['summary', 'stage_trace', 'boundary_evidence', 'topology'] as InspectorTab[]).map((name) => (
          <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{humanize(name)}</button>
        ))}
      </div>
      <div className="admin-inspector-body">
        {tab === 'summary' && (
          <>
            {latestFlow ? <FlowSummary flow={latestFlow} event={latestEvent!} /> : <div className="admin-empty"><Activity size={24} /><strong>No classified transaction</strong><span>Legacy operational evidence is not interpreted as message-flow semantics.</span></div>}
            <section className="admin-detail-section">
              <h3>Transactions at playhead</h3>
              <OperationList events={events} selectedOperationId={activeOperationId} onSelect={onSelectOperation} compact />
            </section>
          </>
        )}
        {tab === 'stage_trace' && (
          <section className="admin-detail-section admin-stage-trace-section">
            <h3>Sanitized stage trace</h3>
            {transactionFlow.length === 0 ? <p>No service-stage trace is available for this transaction.</p> : (
              <ol className="admin-stage-trace">
                {transactionFlow.map((event, index) => (
                  <li key={event.eventId} className={index === transactionFlow.length - 1 ? 'is-current' : ''}>
                    <span className="admin-flow-node" aria-hidden="true" />
                    <div><strong>{STAGE_LABELS[event.messageFlow.stage]}</strong><small>{humanize(event.messageFlow.implementationState)} · {humanize(event.phase)} · {humanize(event.status)}</small></div>
                    <time>{formatTime(Date.parse(event.observedAt))}</time>
                  </li>
                ))}
              </ol>
            )}
            <div className="admin-flow-truth-notes">
              <p><strong>RBC</strong> is the sole branch authority. IRG does not select Prism or IDS.</p>
              <p><strong>Exchange</strong> {latestFlow ? exchangeDirectionLabel(latestFlow) : 'unavailable'} · <strong>Terminal party</strong> {latestFlow ? terminalPartyLabel(latestFlow) : 'unavailable'}.</p>
              <p><strong>Prism</strong> proceeds to Receiver. <strong>IDS</strong> returns to the original Sender.</p>
              <p><strong>CORE Transit</strong> is presentation-only and noncanonical.</p>
            </div>
          </section>
        )}
        {tab === 'boundary_evidence' && (
          <>
            <EvidenceSummary evidence={evidence} />
            <section className="admin-detail-section">
              <h3>Transaction evidence references</h3>
              {transactionEvents.length === 0 ? <p>No bounded evidence references at this playhead.</p> : <ul>{[...new Set(transactionEvents.flatMap((event) => event.evidenceRefs))].map((reference) => <li key={reference}>{reference}</li>)}</ul>}
            </section>
            <div className="admin-projection-notice"><AlertTriangle size={15} />Outbound PIM is an explicit placeholder / pass-through. This view does not claim completed outbound screening.</div>
            {snapshot.portals.some((portal) => portal.tender) && <section className="admin-detail-section"><h3>Tender safeguards</h3><ul>{snapshot.portals.flatMap((portal) => portal.tender?.safeguards ?? []).map((safeguard) => <li key={safeguard}>{safeguard}</li>)}</ul><small>Noncanonical conceptual safeguard projection</small></section>}
            {anomalies.length > 0 && <section className="admin-detail-section"><h3>Stream anomalies</h3><ul>{anomalies.slice(-8).map((anomaly, index) => <li key={`${anomaly.kind}-${index}`}>{humanize(anomaly.kind)}</li>)}</ul></section>}
          </>
        )}
        {tab === 'topology' && (
          <>
            <AxisGrid status={status} />
            {'canonical' in component && !component.canonical && <div className="admin-projection-notice"><AlertTriangle size={15} />This is an explicit fixture/conceptual projection, not a canonical POD contract.</div>}
            <section className="admin-detail-section"><h3>{componentLabel(component)}</h3><dl>{componentFacts(component).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></section>
          </>
        )}
      </div>
    </aside>
  );
}

interface TimelineProps {
  clock: ReplayClockState;
  events: readonly OperationEvent[];
  incomingCount: number;
  selectedOperationId?: string;
  onPause(): void;
  onPlay(): void;
  onSeek(timeMs: number): void;
  onStep(direction: -1 | 1): void;
  onJumpLive(): void;
  onReset(): void;
  onSpeedChange(speed: number): void;
  onSelectOperation(operationId?: string): void;
}

export function OperationsTimeline({ clock, events, incomingCount, selectedOperationId, onPause, onPlay, onSeek, onStep, onJumpLive, onReset, onSpeedChange, onSelectOperation }: TimelineProps) {
  const operations = useMemo(() => [...new Set(events.map((event) => event.operationId))], [events]);
  const activeOperationId = selectedOperationId ?? last(events.filter(hasMessageFlow))?.operationId ?? last(operations);
  const activeTrace = useMemo(() => events.filter((event): event is MessageFlowEvent => event.operationId === activeOperationId && hasMessageFlow(event)).sort(compareFlowEvents), [events, activeOperationId]);
  const latestFlow = last(activeTrace)?.messageFlow;
  const hasRange = clock.rangeEndMs > clock.rangeStartMs;
  return (
    <section className="admin-timeline" aria-label="Operations replay timeline">
      <div className="admin-timeline-controls">
        <button title="Reset replay" aria-label="Reset replay" onClick={onReset}><RotateCcw size={15} /></button>
        <button title="Previous event" aria-label="Previous event" onClick={() => onStep(-1)}><SkipBack size={15} /></button>
        <button className="is-primary" title={clock.paused ? 'Play view' : 'Pause view'} aria-label={clock.paused ? 'Play view' : 'Pause view'} onClick={clock.paused ? onPlay : onPause}>{clock.paused ? <Play size={16} /> : <Pause size={16} />}</button>
        <button title="Next event" aria-label="Next event" onClick={() => onStep(1)}><SkipForward size={15} /></button>
        <button title="Return home" aria-label="Rewind replay" onClick={() => onSeek(clock.rangeStartMs)}><Home size={15} /></button>
      </div>
      <div className="admin-timeline-track">
        <div className="admin-timeline-meta">
          <span><Clock3 size={13} />{formatTime(clock.playheadMs)}</span>
          <strong>{activeOperationId ?? 'Awaiting transaction'}</strong>
          <span>{clock.followingLive ? 'Following stream' : clock.paused ? 'View paused' : `${clock.speed}× replay`}</span>
        </div>
        <input type="range" min={clock.rangeStartMs} max={Math.max(clock.rangeStartMs + 1, clock.rangeEndMs)} value={Math.min(clock.playheadMs, Math.max(clock.rangeStartMs + 1, clock.rangeEndMs))} disabled={!hasRange} aria-label="Replay playhead" onChange={(event) => onSeek(Number(event.target.value))} />
        <div className="admin-timeline-flow" aria-label="Selected transaction stage route and fork">
          {activeTrace.length === 0 ? <span className="admin-empty-inline">Awaiting sanitized stage trace…</span> : activeTrace.map((event) => (
            <span key={event.eventId} className={`is-${event.status}`}><i />{STAGE_LABELS[event.messageFlow.stage]}</span>
          ))}
          {latestFlow && <b>Exchange: {exchangeDirectionLabel(latestFlow)}</b>}
          {latestFlow && <b>RBC branch: {humanize(latestFlow.rbcRoute)}</b>}
          {latestFlow && <b>Terminal party: {terminalPartyLabel(latestFlow)}</b>}
        </div>
        <div className="admin-operation-chips" aria-label="Transactions at current playhead">
          {operations.length === 0 ? <span className="admin-empty-inline">Awaiting operation evidence…</span> : operations.slice(-8).map((operationId) => (
            <button className={activeOperationId === operationId ? 'is-selected' : ''} key={operationId} onClick={() => onSelectOperation(activeOperationId === operationId ? undefined : operationId)}>{operationId.replace('op:', '')}</button>
          ))}
        </div>
      </div>
      <div className="admin-live-controls">
        <label className="admin-speed-control"><span>Speed</span><select aria-label="Replay speed" value={clock.speed} onChange={(event) => onSpeedChange(Number(event.target.value))}>{[0.25, 0.5, 1, 2, 4].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
        {incomingCount > 0 && <span>{incomingCount} incoming</span>}
        <button className="is-live" onClick={onJumpLive}><Radio size={14} /> Jump to Live</button>
      </div>
    </section>
  );
}

type MessageFlowEvent = OperationEvent & { messageFlow: SanitizedMessageFlowProjection };

function hasMessageFlow(event: OperationEvent): event is MessageFlowEvent {
  return event.messageFlow !== undefined;
}

function compareFlowEvents(left: MessageFlowEvent, right: MessageFlowEvent): number {
  return left.messageFlow.stageOrdinal - right.messageFlow.stageOrdinal || left.sequence - right.sequence;
}

function latestFlowByOperation(events: readonly MessageFlowEvent[]): Map<string, MessageFlowEvent> {
  const result = new Map<string, MessageFlowEvent>();
  for (const event of events) {
    const current = result.get(event.operationId);
    if (!current || event.sequence > current.sequence) result.set(event.operationId, event);
  }
  return result;
}

function stageDescription(stage: ServicePipelineStage): string {
  if (stage === 'sender_ingress') return 'exchange begins at Sender';
  if (stage === 'rbc') return 'sole branch authority';
  if (stage === 'core_transit_projection') return 'noncanonical coordination projection';
  if (stage === 'pim_out') return 'placeholder / pass-through';
  if (stage === 'prism') return 'RBC branch toward Receiver';
  if (stage === 'ids') return 'RBC branch returning to Sender';
  if (stage === 'receiver_delivery') return 'Prism terminal · Receiver';
  if (stage === 'sender_return') return 'IDS terminal · original Sender';
  if (stage === 'unavailable') return 'explicit terminal outcome';
  return 'sanitized stage observation';
}

function FlowSummary({ flow, event }: { flow: SanitizedMessageFlowProjection; event: OperationEvent }) {
  return <>
    <div className="admin-transaction-summary">
      <div><span>Current stage</span><strong>{STAGE_LABELS[flow.stage]}</strong></div>
      <div><span>Exchange</span><strong>{exchangeDirectionLabel(flow)}</strong></div>
      <div><span>Terminal party</span><strong>{terminalPartyLabel(flow)}</strong></div>
      <div><span>Lane</span><strong>{humanize(flow.lane)}</strong></div>
      <div><span>Integrity</span><strong>{integrityLabel(flow)}</strong></div>
      <div><span>RBC route</span><strong>{humanize(flow.rbcRoute)}</strong></div>
      <div><span>Outcome</span><strong>{humanize(flow.terminalOutcome)}</strong></div>
      <div><span>Implementation</span><strong>{humanize(flow.implementationState)}</strong></div>
      <div><span>Evidence</span><strong>{humanize(flow.evidenceState)}</strong></div>
      <div><span>Observed</span><strong>{formatTime(Date.parse(event.observedAt))}</strong></div>
    </div>
    <div className="admin-authority-callout"><ShieldCheck size={15} /><span><strong>RBC is the sole branch authority.</strong> Prism proceeds to Receiver; IDS returns to the original Sender. CORE Transit is a presentation-only, noncanonical coordination projection.</span></div>
    {flow.stage === 'pim_out' && <div className="admin-projection-notice"><AlertTriangle size={15} />Outbound PIM is a placeholder / pass-through, not a completed screen.</div>}
  </>;
}

function exchangeParties(flow: SanitizedMessageFlowProjection): { sender: 'Human' | 'AI'; receiver: 'Human' | 'AI' } {
  return flow.exchangeDirection === 'human_to_ai'
    ? { sender: 'Human', receiver: 'AI' }
    : { sender: 'AI', receiver: 'Human' };
}

function exchangeDirectionLabel(flow: SanitizedMessageFlowProjection): string {
  const { sender, receiver } = exchangeParties(flow);
  return `${sender} → ${receiver}`;
}

function terminalPartyLabel(flow: SanitizedMessageFlowProjection): string {
  const { sender, receiver } = exchangeParties(flow);
  if (flow.terminalOutcome === 'delivered_to_receiver') return `Receiver · ${receiver}`;
  if (flow.terminalOutcome === 'returned_to_sender' || flow.terminalOutcome === 'returned_to_sender_with_shortfall') return `Sender · ${sender}`;
  if (flow.terminalOutcome === 'unavailable') return 'Unavailable';
  return 'Pending';
}

function StatusMark({ status }: { status: ComponentStatusAxes }) {
  return <span className={`admin-status-mark is-${status.health}`} title={`${status.health}; ${status.activity}`} aria-label={`${status.health}; ${status.activity}`} />;
}

function AxisGrid({ status }: { status: ComponentStatusAxes }) {
  return <div className="admin-axis-grid">{([
    ['Contract', status.contract], ['Attachment', status.attachment], ['Activity', status.activity],
    ['Evidence', status.evidence], ['Health', status.health], ['Source', status.sourceBoundary],
  ] as const).map(([label, value]) => <div key={label}><span>{label}</span><strong>{humanize(value)}</strong></div>)}</div>;
}

function OperationList({ events, selectedOperationId, onSelect, compact = false }: { events: readonly OperationEvent[]; selectedOperationId?: string; onSelect(id?: string): void; compact?: boolean }) {
  const latest = [...events].reverse().filter((event, index, source) => source.findIndex((candidate) => candidate.operationId === event.operationId) === index);
  if (latest.length === 0) return <div className="admin-empty"><Activity size={24} /><strong>No transactions at this playhead</strong><span>Incoming evidence remains visible in the timeline.</span></div>;
  return <div className={`admin-operation-list ${compact ? 'is-compact' : ''}`}>{latest.map((event) => (
    <button key={event.operationId} className={selectedOperationId === event.operationId ? 'is-selected' : ''} onClick={() => onSelect(event.operationId)}>
      <span className={`admin-event-symbol is-${event.status}`}>{event.status === 'nominal' ? '●' : event.status === 'contained' ? '⬡' : event.status === 'rolled_back' ? '↶' : '!'}</span>
      <span><strong>{event.operationId}</strong><small>{hasMessageFlow(event) ? STAGE_LABELS[event.messageFlow.stage] : `${humanize(event.phase)} · unclassified flow`}</small></span>
      <time>{formatTime(Date.parse(event.observedAt))}</time>
    </button>
  ))}</div>;
}

function EvidenceSummary({ evidence }: { evidence: SafeEvidenceSummary }) {
  return <section className="admin-detail-section"><h3>Safe evidence summary</h3><dl>
    <div><dt>Trust</dt><dd>{evidence.trustState}</dd></div>
    <div><dt>Observed</dt><dd>{new Date(evidence.observedAt).toLocaleString()}</dd></div>
    <div><dt>Source</dt><dd>{evidence.sourceLabel}</dd></div>
    <div><dt>References</dt><dd>{evidence.evidenceRefs.length}</dd></div>
    <div><dt>Hashes</dt><dd>{evidence.hashes.length}</dd></div>
  </dl><p className="admin-redaction-note">Only allowlisted operational metadata is shown.</p></section>;
}

function statusText(status: ComponentStatusAxes) { return `${status.health} · ${status.activity}`; }
function withEventStatus(status: ComponentStatusAxes, event?: OperationEvent): ComponentStatusAxes {
  if (!event) return status;
  return { ...status, activity: event.phase, health: event.status };
}
function formatTime(value: number) { return Number.isFinite(value) && value > 0 ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'; }
function formatFreshness(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'unknown';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1_000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3_600)}h ago`;
}

function findComponent(snapshot: PodTopologySnapshot, kind: ComponentKind, id: string): any {
  if (kind === 'pod') return snapshot.pod;
  if (kind === 'orb') return snapshot.orbs.find((item) => item.orb_id === id) ?? snapshot.pod;
  if (kind === 'satellite') return snapshot.satellites.find((item) => item.satellite_id === id) ?? snapshot.pod;
  if (kind === 'umbilical') return snapshot.umbilicals.find((item) => item.umbilical_id === id) ?? snapshot.pod;
  return snapshot.portals.find((item) => item.portal_id === id) ?? snapshot.pod;
}

function componentLabel(component: any): string {
  return component.displayName ?? component.abilityName ?? component.name ?? component.attachmentPoint ?? component.pod_id ?? 'CORE';
}

function componentFacts(component: any): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const keys = ['pod_id', 'peer_id', 'orb_id', 'satellite_id', 'parent_orb_id', 'umbilical_id', 'portal_id', 'capability', 'purpose', 'scope', 'boundary', 'mode'];
  keys.forEach((key) => { if (typeof component[key] === 'string') rows.push([humanize(key), component[key]]); });
  return rows;
}

function humanize(value: string): string { return value.split('_').join(' '); }
function last<T>(values: readonly T[]): T | undefined { return values.length > 0 ? values[values.length - 1] : undefined; }
function integrityLabel(flow: SanitizedMessageFlowProjection): string {
  if (flow.integrity === 'not_evaluated') return flow.lane === 'pim_lane_2' ? 'Not evaluated · IRG bypassed' : 'Not evaluated';
  return humanize(flow.integrity);
}
