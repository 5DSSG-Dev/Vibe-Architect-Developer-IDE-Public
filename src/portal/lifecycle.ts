import type {
  PortalState,
  TenderState,
  PortalDescriptor,
  TenderSpec,
  PortalTransition,
} from './contracts.js';
import { VALID_PORTAL_TRANSITIONS, VALID_TENDER_TRANSITIONS } from './contracts.js';
import type { ActionPermission } from '../identity/contracts.js';
import { computeHash } from '../identity/hash.js';

let transitionCounter = 0;

function nextTransitionId(): string {
  return `ptrans-${Date.now()}-${++transitionCounter}`;
}

export function isValidPortalTransition(from: PortalState, to: PortalState): boolean {
  return VALID_PORTAL_TRANSITIONS[from].includes(to);
}

export function isValidTenderTransition(from: TenderState, to: TenderState): boolean {
  return VALID_TENDER_TRANSITIONS[from].includes(to);
}

export interface TransitionRequest {
  targetState: PortalState;
  reason: string;
  permission: ActionPermission | null;
}

export interface TransitionResult {
  success: boolean;
  portal: PortalDescriptor;
  transition: PortalTransition | null;
  failureReason: string | null;
}

export function transitionPortal(
  portal: PortalDescriptor,
  request: TransitionRequest,
): TransitionResult {
  if (!isValidPortalTransition(portal.state, request.targetState)) {
    return {
      success: false,
      portal,
      transition: null,
      failureReason: `Invalid transition from '${portal.state}' to '${request.targetState}'`,
    };
  }

  if (request.permission && !request.permission.permitted) {
    return {
      success: false,
      portal,
      transition: null,
      failureReason: `Identity permission denied: ${request.permission.reason}`,
    };
  }

  const transitionData = {
    portalRef: portal.portalId,
    fromState: portal.state,
    toState: request.targetState,
    reason: request.reason,
  };
  const hash = computeHash(JSON.stringify(transitionData));

  const transition: PortalTransition = {
    transitionId: nextTransitionId(),
    portalRef: portal.portalId,
    fromState: portal.state,
    toState: request.targetState,
    timestamp: new Date().toISOString(),
    reason: request.reason,
    identityPermission: request.permission,
    hash,
  };

  const updatedPortal: PortalDescriptor = {
    ...portal,
    state: request.targetState,
    lastStateChange: transition.timestamp,
    hash: computeHash(JSON.stringify({
      ...portal,
      state: request.targetState,
      lastStateChange: transition.timestamp,
    })),
  };

  return {
    success: true,
    portal: updatedPortal,
    transition,
    failureReason: null,
  };
}

export function transitionTender(
  tender: TenderSpec,
  targetState: TenderState,
): { success: boolean; tender: TenderSpec; failureReason: string | null } {
  if (!isValidTenderTransition(tender.state, targetState)) {
    return {
      success: false,
      tender,
      failureReason: `Invalid tender transition from '${tender.state}' to '${targetState}'`,
    };
  }

  const updatedTender: TenderSpec = {
    ...tender,
    state: targetState,
    hash: computeHash(JSON.stringify({ ...tender, state: targetState })),
  };

  return { success: true, tender: updatedTender, failureReason: null };
}
