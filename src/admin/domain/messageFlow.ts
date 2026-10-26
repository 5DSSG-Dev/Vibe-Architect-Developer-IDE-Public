export const SERVICE_PIPELINE_STAGES = [
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
] as const;

export type ServicePipelineStage = (typeof SERVICE_PIPELINE_STAGES)[number];
export type PimLane = 'pim_lane_1' | 'pim_lane_2';
export type ExchangeDirection = 'human_to_ai' | 'ai_to_human';
export type MessageIntegrity = 'not_evaluated' | 'coherent' | 'shortfall' | 'unavailable';
export type RbcRoute = 'prism' | 'ids' | 'not_reached' | 'unavailable';
export type MessageTerminalOutcome = 'pending' | 'delivered_to_receiver' | 'returned_to_sender' | 'returned_to_sender_with_shortfall' | 'unavailable';
export type StageImplementationState = 'active_service_stage' | 'presentation_only' | 'placeholder_pass_through' | 'unavailable';
export type StageEvidenceState = 'replay_fixture' | 'fixture_unavailable';

/**
 * An allowlisted operational projection. It intentionally contains no message
 * body, fingerprint, token, score, rationale, prose finding, or raw IDS flag.
 */
export interface SanitizedMessageFlowProjection {
  canonical: false;
  projectionKind: 'sanitized_service_message_flow';
  traceId: string;
  exchangeDirection: ExchangeDirection;
  lane: PimLane;
  stage: ServicePipelineStage;
  stageOrdinal: number;
  presentationOnly: boolean;
  implementationState: StageImplementationState;
  evidenceState: StageEvidenceState;
  integrity: MessageIntegrity;
  rbcRoute: RbcRoute;
  terminalOutcome: MessageTerminalOutcome;
}

const PIPELINE_STAGE_SET = new Set<string>(SERVICE_PIPELINE_STAGES);
const LANE_SET = new Set<string>(['pim_lane_1', 'pim_lane_2']);
const INTEGRITY_SET = new Set<string>(['not_evaluated', 'coherent', 'shortfall', 'unavailable']);
const RBC_ROUTE_SET = new Set<string>(['prism', 'ids', 'not_reached', 'unavailable']);
const DIRECTION_SET = new Set<string>(['human_to_ai', 'ai_to_human']);
const TERMINAL_SET = new Set<string>(['pending', 'delivered_to_receiver', 'returned_to_sender', 'returned_to_sender_with_shortfall', 'unavailable']);
const FLOW_KEYS = new Set([
  'canonical', 'projectionKind', 'traceId', 'exchangeDirection', 'lane', 'stage', 'stageOrdinal',
  'presentationOnly', 'integrity', 'rbcRoute', 'terminalOutcome',
  'implementationState', 'evidenceState',
]);

function implementationFor(stage: ServicePipelineStage): StageImplementationState {
  if (stage === 'core_transit_projection') return 'presentation_only';
  if (stage === 'pim_out') return 'placeholder_pass_through';
  if (stage === 'unavailable') return 'unavailable';
  return 'active_service_stage';
}

export function isSanitizedMessageFlowProjection(value: unknown): value is SanitizedMessageFlowProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !FLOW_KEYS.has(key))) return false;
  const baseValid = candidate.canonical === false
    && candidate.projectionKind === 'sanitized_service_message_flow'
    && typeof candidate.traceId === 'string'
    && candidate.traceId.length > 0
    && candidate.traceId.length <= 128
    && typeof candidate.exchangeDirection === 'string'
    && DIRECTION_SET.has(candidate.exchangeDirection)
    && typeof candidate.lane === 'string'
    && LANE_SET.has(candidate.lane)
    && typeof candidate.stage === 'string'
    && PIPELINE_STAGE_SET.has(candidate.stage)
    && Number.isInteger(candidate.stageOrdinal)
    && Number(candidate.stageOrdinal) >= 0
    && typeof candidate.presentationOnly === 'boolean'
    && candidate.presentationOnly === (candidate.stage === 'core_transit_projection')
    && candidate.implementationState === implementationFor(candidate.stage as ServicePipelineStage)
    && candidate.evidenceState === (candidate.stage === 'unavailable' ? 'fixture_unavailable' : 'replay_fixture')
    && typeof candidate.integrity === 'string'
    && INTEGRITY_SET.has(candidate.integrity)
    && typeof candidate.rbcRoute === 'string'
    && RBC_ROUTE_SET.has(candidate.rbcRoute)
    && typeof candidate.terminalOutcome === 'string'
    && TERMINAL_SET.has(candidate.terminalOutcome);
  if (!baseValid) return false;

  const stage = candidate.stage as ServicePipelineStage;
  const lane = candidate.lane as PimLane;
  const route = candidate.rbcRoute as RbcRoute;
  const integrity = candidate.integrity as MessageIntegrity;
  const outcome = candidate.terminalOutcome as MessageTerminalOutcome;
  if (lane === 'pim_lane_2' && (route !== 'not_reached' || ['irg', 'core_transit_projection', 'rbc', 'prism'].includes(stage))) return false;
  if (['sender_ingress', 'pim_in'].includes(stage) && integrity !== 'not_evaluated') return false;
  if (lane === 'pim_lane_2' && stage !== 'unavailable' && integrity !== 'not_evaluated') return false;
  if (lane === 'pim_lane_1' && ['irg', 'core_transit_projection', 'rbc', 'prism', 'ids', 'pim_out', 'receiver_delivery', 'sender_return'].includes(stage)
    && integrity === 'not_evaluated') return false;
  if (lane === 'pim_lane_1' && stage === 'prism' && route !== 'prism') return false;
  if (lane === 'pim_lane_1' && stage === 'ids' && route !== 'ids') return false;
  if (lane === 'pim_lane_1' && stage === 'rbc' && !['prism', 'ids', 'unavailable'].includes(route)) return false;
  if (stage === 'unavailable') return integrity === 'unavailable' && outcome === 'unavailable';
  if (stage === 'receiver_delivery') return route === 'prism' && outcome === 'delivered_to_receiver';
  if (stage === 'sender_return') return route !== 'prism'
    && outcome === (integrity === 'shortfall' ? 'returned_to_sender_with_shortfall' : 'returned_to_sender');
  return outcome === 'pending' && integrity !== 'unavailable';
}

export function messageFlowProjection(
  traceId: string,
  exchangeDirection: ExchangeDirection,
  lane: PimLane,
  stage: ServicePipelineStage,
  stageOrdinal: number,
  integrity: MessageIntegrity,
  rbcRoute: RbcRoute,
  terminalOutcome: MessageTerminalOutcome,
): SanitizedMessageFlowProjection {
  const projection: SanitizedMessageFlowProjection = {
    canonical: false,
    projectionKind: 'sanitized_service_message_flow',
    traceId,
    exchangeDirection,
    lane,
    stage,
    stageOrdinal,
    presentationOnly: stage === 'core_transit_projection',
    implementationState: implementationFor(stage),
    evidenceState: stage === 'unavailable' ? 'fixture_unavailable' : 'replay_fixture',
    integrity,
    rbcRoute,
    terminalOutcome,
  };
  if (!isSanitizedMessageFlowProjection(projection)) throw new Error('Invalid sanitized message-flow projection.');
  return projection;
}
