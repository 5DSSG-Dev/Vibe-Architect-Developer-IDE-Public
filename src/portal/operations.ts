import type {
  PortalDescriptor,
  PortalContract,
  ExternalEndpoint,
  PortalOperationResult,
  BoundaryPolicy,
} from './contracts.js';
import type { AdaptiveIdentitySurface } from '../identity/contracts.js';
import { checkActionPermission } from '../identity/surface.js';
import { transitionPortal, transitionTender } from './lifecycle.js';
import { createTender } from './tender.js';
import { createBoundaryPolicy, evaluateBoundaryPolicy } from './boundary.js';
import type { BoundaryPolicyConfig } from './boundary.js';
import { computeHash } from '../identity/hash.js';

let portalCounter = 0;
let contractCounter = 0;

function nextPortalId(): string {
  return `portal-${Date.now()}-${++portalCounter}`;
}

function nextContractId(): string {
  return `pcontract-${Date.now()}-${++contractCounter}`;
}

export function createPortalDescriptor(
  name: string,
  angleDeg: number,
  policyConfig?: BoundaryPolicyConfig,
): PortalDescriptor {
  const boundaryPolicy = createBoundaryPolicy(policyConfig);
  const now = new Date().toISOString();

  const portalData = { name, angleDeg, boundaryPolicy: boundaryPolicy.policyId };
  const hash = computeHash(JSON.stringify(portalData));

  return {
    portalId: nextPortalId(),
    name,
    angleDeg,
    state: 'dormant',
    tender: null,
    boundaryPolicy,
    createdAt: now,
    lastStateChange: now,
    hash,
  };
}

function buildPortalContract(
  portal: PortalDescriptor,
  endpoint: ExternalEndpoint,
  tenderRef: string,
): PortalContract {
  const contractData = {
    portalRef: portal.portalId,
    tenderRef,
    endpointRef: endpoint.endpointId,
    negotiatedProtocol: endpoint.protocol,
    flowDirection: endpoint.flowDirection,
    boundaryPolicyRef: portal.boundaryPolicy.policyId,
  };
  const hash = computeHash(JSON.stringify(contractData));

  return {
    contractId: nextContractId(),
    portalRef: portal.portalId,
    tenderRef,
    endpointRef: endpoint.endpointId,
    timestamp: new Date().toISOString(),
    state: 'active',
    negotiatedProtocol: endpoint.protocol,
    flowDirection: endpoint.flowDirection,
    boundaryPolicyRef: portal.boundaryPolicy.policyId,
    negativeSpaceInvariants: {
      never_serializes_witness: true,
      never_persists_prompts: true,
      no_verdict_over_inner_life: true,
    },
    hash,
  };
}

export function openPortal(
  portal: PortalDescriptor,
  endpoint: ExternalEndpoint,
  surface: AdaptiveIdentitySurface | null,
): PortalOperationResult {
  const permission = checkActionPermission(surface, 'reversible_bounded');

  if (!permission.permitted) {
    return {
      success: false,
      portal,
      transition: null,
      contract: null,
      failureReason: `Identity permission denied for portal opening: ${permission.reason}`,
    };
  }

  const boundaryEval = evaluateBoundaryPolicy(portal.boundaryPolicy, endpoint, 0);
  if (!boundaryEval.permitted) {
    return {
      success: false,
      portal,
      transition: null,
      contract: null,
      failureReason: boundaryEval.reason,
    };
  }

  const negotiateResult = transitionPortal(portal, {
    targetState: 'negotiating',
    reason: `Opening portal to ${endpoint.address}`,
    permission,
  });

  if (!negotiateResult.success) {
    return {
      success: false,
      portal,
      transition: null,
      contract: null,
      failureReason: negotiateResult.failureReason,
    };
  }

  const tender = createTender(portal.portalId, endpoint);
  const tenderReady = transitionTender(tender, 'ready');
  if (!tenderReady.success) {
    return {
      success: false,
      portal: negotiateResult.portal,
      transition: negotiateResult.transition,
      contract: null,
      failureReason: tenderReady.failureReason,
    };
  }

  const activateResult = transitionPortal(negotiateResult.portal, {
    targetState: 'active',
    reason: `Tender ready, activating portal to ${endpoint.address}`,
    permission: null,
  });

  if (!activateResult.success) {
    return {
      success: false,
      portal: negotiateResult.portal,
      transition: negotiateResult.transition,
      contract: null,
      failureReason: activateResult.failureReason,
    };
  }

  const tenderServing = transitionTender(tenderReady.tender, 'serving');
  const activeTender = tenderServing.success ? tenderServing.tender : tenderReady.tender;

  const portalWithTender: PortalDescriptor = {
    ...activateResult.portal,
    tender: activeTender,
  };

  const contract = buildPortalContract(portalWithTender, endpoint, activeTender.tenderId);

  return {
    success: true,
    portal: portalWithTender,
    transition: activateResult.transition,
    contract,
    failureReason: null,
  };
}

export function closePortal(portal: PortalDescriptor): PortalOperationResult {
  if (portal.tender) {
    const drainResult = transitionTender(portal.tender, 'draining');
    if (drainResult.success) {
      transitionTender(drainResult.tender, 'terminated');
    }
  }

  const severResult = transitionPortal(portal, {
    targetState: 'severed',
    reason: 'Portal closed by operator',
    permission: null,
  });

  if (!severResult.success) {
    return {
      success: false,
      portal,
      transition: null,
      contract: null,
      failureReason: severResult.failureReason,
    };
  }

  const dormantResult = transitionPortal(severResult.portal, {
    targetState: 'dormant',
    reason: 'Portal reset after closure',
    permission: null,
  });

  const finalPortal: PortalDescriptor = {
    ...(dormantResult.success ? dormantResult.portal : severResult.portal),
    tender: null,
  };

  return {
    success: true,
    portal: finalPortal,
    transition: severResult.transition,
    contract: null,
    failureReason: null,
  };
}

export function suspendPortal(
  portal: PortalDescriptor,
  reason: string,
): PortalOperationResult {
  const result = transitionPortal(portal, {
    targetState: 'suspended',
    reason,
    permission: null,
  });

  if (!result.success) {
    return {
      success: false,
      portal,
      transition: null,
      contract: null,
      failureReason: result.failureReason,
    };
  }

  let updatedPortal = result.portal;
  if (portal.tender) {
    const drainResult = transitionTender(portal.tender, 'draining');
    if (drainResult.success) {
      updatedPortal = { ...updatedPortal, tender: drainResult.tender };
    }
  }

  return {
    success: true,
    portal: updatedPortal,
    transition: result.transition,
    contract: null,
    failureReason: null,
  };
}

export function resumePortal(
  portal: PortalDescriptor,
  surface: AdaptiveIdentitySurface | null,
): PortalOperationResult {
  const permission = checkActionPermission(surface, 'reversible_bounded');

  const result = transitionPortal(portal, {
    targetState: 'active',
    reason: 'Portal resumed',
    permission,
  });

  if (!result.success) {
    return {
      success: false,
      portal,
      transition: null,
      contract: null,
      failureReason: result.failureReason,
    };
  }

  return {
    success: true,
    portal: result.portal,
    transition: result.transition,
    contract: null,
    failureReason: null,
  };
}
