import type { BoundaryPolicy, ExternalEndpoint, FlowDirection, ExternalServiceKind } from './contracts.js';
import { computeHash } from '../identity/hash.js';

let policyCounter = 0;

function nextPolicyId(): string {
  return `policy-${Date.now()}-${++policyCounter}`;
}

export interface BoundaryPolicyConfig {
  allowedFlowDirections?: FlowDirection[];
  allowedServiceKinds?: ExternalServiceKind[];
  maxPayloadBytes?: number;
  requiresIdentityGate?: boolean;
}

const DEFAULT_POLICY_CONFIG: Required<BoundaryPolicyConfig> = {
  allowedFlowDirections: ['inbound', 'outbound', 'bidirectional'],
  allowedServiceKinds: ['api', 'stream', 'storage', 'compute', 'monitor'],
  maxPayloadBytes: 1048576,
  requiresIdentityGate: true,
};

export function createBoundaryPolicy(config?: BoundaryPolicyConfig): BoundaryPolicy {
  const merged = { ...DEFAULT_POLICY_CONFIG, ...config };

  const policyData = {
    allowedFlowDirections: merged.allowedFlowDirections,
    allowedServiceKinds: merged.allowedServiceKinds,
    maxPayloadBytes: merged.maxPayloadBytes,
    requiresIdentityGate: merged.requiresIdentityGate,
  };
  const hash = computeHash(JSON.stringify(policyData));

  return {
    policyId: nextPolicyId(),
    ...merged,
    hash,
  };
}

export interface BoundaryEvaluation {
  permitted: boolean;
  reason: string;
  violations: string[];
}

export function evaluateBoundaryPolicy(
  policy: BoundaryPolicy,
  endpoint: ExternalEndpoint,
  payloadBytes: number,
): BoundaryEvaluation {
  const violations: string[] = [];

  if (!policy.allowedFlowDirections.includes(endpoint.flowDirection)) {
    violations.push(
      `Flow direction '${endpoint.flowDirection}' not permitted; allowed: ${policy.allowedFlowDirections.join(', ')}`,
    );
  }

  if (!policy.allowedServiceKinds.includes(endpoint.serviceKind)) {
    violations.push(
      `Service kind '${endpoint.serviceKind}' not permitted; allowed: ${policy.allowedServiceKinds.join(', ')}`,
    );
  }

  if (payloadBytes > policy.maxPayloadBytes) {
    violations.push(
      `Payload ${payloadBytes} bytes exceeds limit of ${policy.maxPayloadBytes} bytes`,
    );
  }

  const permitted = violations.length === 0;
  const reason = permitted
    ? `Endpoint ${endpoint.endpointId} passes boundary policy`
    : `Boundary violations: ${violations.join('; ')}`;

  return { permitted, reason, violations };
}
