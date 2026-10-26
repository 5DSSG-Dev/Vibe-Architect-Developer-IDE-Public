export type {
  PortalState,
  ExternalServiceKind,
  FlowDirection,
  TenderState,
  ExternalEndpoint,
  BoundaryPolicy,
  TenderSpec,
  PortalDescriptor,
  PortalContract,
  PortalTransition,
  PortalOperationResult,
} from './contracts.js';

export {
  PORTAL_STATE_ORDER,
  TENDER_STATE_ORDER,
  VALID_PORTAL_TRANSITIONS,
  VALID_TENDER_TRANSITIONS,
} from './contracts.js';

export { createBoundaryPolicy, evaluateBoundaryPolicy } from './boundary.js';
export type { BoundaryPolicyConfig, BoundaryEvaluation } from './boundary.js';

export { isValidPortalTransition, isValidTenderTransition, transitionPortal, transitionTender } from './lifecycle.js';
export type { TransitionRequest, TransitionResult } from './lifecycle.js';

export { createTender, createEndpoint } from './tender.js';
export type { TenderConfig } from './tender.js';

export { createPortalDescriptor, openPortal, closePortal, suspendPortal, resumePortal } from './operations.js';
