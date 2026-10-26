export const REQUIRED_ADMIN_ROLE = 'service.operations.read';
export const STELLAR_STEWARD_ROLE = 'service.stellar.contract.issue';
export const STELLAR_EXECUTION_ROLE = 'service.stellar.execute';
export const AUTHENTICATED_SERVICE_ROLES = [REQUIRED_ADMIN_ROLE, STELLAR_STEWARD_ROLE, STELLAR_EXECUTION_ROLE] as const;
export function hasAuthenticatedServiceRole(roles: readonly string[]): boolean { return roles.some(role => (AUTHENTICATED_SERVICE_ROLES as readonly string[]).includes(role)); }

export interface StellarCapabilityConfig {
  cngKeyReference: string;
  machineId: string;
  installId: string;
  policyAuthorityPath: string;
  policyEnvelopePath: string;
  requestSignerRegistryPath: string;
  labGatewayBridge: {
    account: string;
    executablePath: string;
    pipe: string;
    serviceName: string;
  };
  audienceService: 'aegis-stellar-sandbox';
}

export interface GatewayConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  origin: string;
  sessionTtlMs: number;
  cookieSecure: boolean;
  trustProxy: false | number | string[];
  redisUrl?: string;
  stellarCapabilities?: StellarCapabilityConfig;
  entra?: {
    tenantId: string;
    clientId: string;
    clientSecret?: string;
    certificate?: { thumbprint: string; privateKey: string };
    redirectUri: string;
  };
}

function parseTrustProxy(value: string | undefined): GatewayConfig['trustProxy'] {
  if (!value || value.trim().toLowerCase() === 'false') return false;
  const trimmed = value.trim();
  if (/^[1-9]\d*$/.test(trimmed)) return Number(trimmed);
  const entries = trimmed.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0 || entries.some((entry) => entry.toLowerCase() === 'true')) {
    throw new Error('TRUST_PROXY must be false, a positive hop count, or an explicit comma-separated proxy allowlist');
  }
  return entries;
}

function normalizedNodeEnv(value: string | undefined): GatewayConfig['nodeEnv'] {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const nodeEnv = normalizedNodeEnv(env.NODE_ENV);
  const port = Number(env.PORT ?? 3002);
  const origin = env.APP_ORIGIN ?? `http://localhost:${port}`;
  const tenantId = env.ENTRA_TENANT_ID?.trim();
  const clientId = env.ENTRA_CLIENT_ID?.trim();
  const clientSecret = env.ENTRA_CLIENT_SECRET?.trim();
  const thumbprint = env.ENTRA_CLIENT_CERT_THUMBPRINT?.trim();
  const privateKey = env.ENTRA_CLIENT_CERT_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  const trustProxy = parseTrustProxy(env.TRUST_PROXY);
  const redisUrl = env.REDIS_URL?.trim();
  if (redisUrl && !['redis:', 'rediss:'].includes(new URL(redisUrl).protocol)) {
    throw new Error('REDIS_URL must use the redis: or rediss: scheme');
  }
  const stellarLab = env.STELLAR_LAB_MODE === 'true';
  const cngKeyReference = env.STELLAR_CONTRACT_CNG_KEY_REFERENCE?.trim();
  const machineId = env.STELLAR_MACHINE_ID?.trim();
  const installId = env.STELLAR_INSTALL_ID?.trim();
  const policyAuthorityPath = env.STELLAR_CUSTODIAN_POLICY_AUTHORITY_PATH?.trim();
  const policyEnvelopePath = env.STELLAR_CUSTODIAN_POLICY_ENVELOPE_PATH?.trim();
  const requestSignerRegistryPath = env.STELLAR_REQUEST_SIGNER_REGISTRY_PATH?.trim();
  const labGatewayBridgeAccount = env.STELLAR_LAB_GATEWAY_BRIDGE_ACCOUNT?.trim();
  const labGatewayBridgeServiceName = env.STELLAR_LAB_GATEWAY_BRIDGE_SERVICE_NAME?.trim();
  const labGatewayBridgePath = env.STELLAR_LAB_GATEWAY_BRIDGE_PATH?.trim();
  const labGatewayBridgePipe = env.STELLAR_LAB_GATEWAY_BRIDGE_PIPE?.trim();
  const stellarValues = [cngKeyReference, machineId, installId, policyAuthorityPath, policyEnvelopePath, requestSignerRegistryPath, labGatewayBridgeAccount, labGatewayBridgeServiceName, labGatewayBridgePath, labGatewayBridgePipe];
  const anyStellarValue = stellarValues.some(Boolean);
  const allStellarValues = stellarValues.every(Boolean);
  if (anyStellarValue && !allStellarValues) throw new Error('all Stellar capability issuance settings, including installed policy, signer registry, and Lab Gateway bridge identity, must be configured together');
  if (cngKeyReference && !/^[A-Za-z0-9 ._-]{1,128}\\[A-Za-z0-9._-]{1,128}$/.test(cngKeyReference)) throw new Error('STELLAR_CONTRACT_CNG_KEY_REFERENCE must name a provisioned Windows CNG provider and non-exportable key');
  if (policyAuthorityPath && !/^[A-Za-z]:\\(?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]+\.json$/i.test(policyAuthorityPath)) throw new Error('STELLAR_CUSTODIAN_POLICY_AUTHORITY_PATH must be an absolute Windows JSON path');
  const absoluteJsonPath = /^[A-Za-z]:\\(?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]+\.json$/i;
  const absoluteExePath = /^[A-Za-z]:\\(?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]+\.exe$/i;
  const serviceAccount = /^NT SERVICE\\[A-Za-z0-9._ -]{1,128}$/;
  const serviceName = /^[A-Za-z0-9._-]{1,128}$/;
  const pipeName = /^\\\\\.\\pipe\\[A-Za-z0-9._-]{1,128}$/;
  if (policyEnvelopePath && !absoluteJsonPath.test(policyEnvelopePath)) throw new Error('STELLAR_CUSTODIAN_POLICY_ENVELOPE_PATH must be an absolute Windows JSON path');
  if (requestSignerRegistryPath && !absoluteJsonPath.test(requestSignerRegistryPath)) throw new Error('STELLAR_REQUEST_SIGNER_REGISTRY_PATH must be an absolute Windows JSON path');
  if (labGatewayBridgeAccount && !serviceAccount.test(labGatewayBridgeAccount)) throw new Error('STELLAR_LAB_GATEWAY_BRIDGE_ACCOUNT must be an NT SERVICE account');
  if (labGatewayBridgeServiceName && !serviceName.test(labGatewayBridgeServiceName)) throw new Error('STELLAR_LAB_GATEWAY_BRIDGE_SERVICE_NAME is invalid');
  if (labGatewayBridgePath && !absoluteExePath.test(labGatewayBridgePath)) throw new Error('STELLAR_LAB_GATEWAY_BRIDGE_PATH must be an absolute Windows executable path');
  if (labGatewayBridgePipe && !pipeName.test(labGatewayBridgePipe)) throw new Error('STELLAR_LAB_GATEWAY_BRIDGE_PIPE must be an absolute local named pipe');
  const stellarCapabilities: GatewayConfig['stellarCapabilities'] = allStellarValues ? {
    cngKeyReference: cngKeyReference!, machineId: machineId!, installId: installId!, policyAuthorityPath: policyAuthorityPath!, policyEnvelopePath: policyEnvelopePath!, requestSignerRegistryPath: requestSignerRegistryPath!,
    labGatewayBridge: { account: labGatewayBridgeAccount!, serviceName: labGatewayBridgeServiceName!, executablePath: labGatewayBridgePath!, pipe: labGatewayBridgePipe! },
    audienceService: 'aegis-stellar-sandbox',
  } : undefined;

  let entra: GatewayConfig['entra'];
  if (tenantId && clientId && (clientSecret || (thumbprint && privateKey))) {
    entra = {
      tenantId,
      clientId,
      redirectUri: env.ENTRA_REDIRECT_URI ?? `${origin}/auth/entra/callback`,
      ...(clientSecret ? { clientSecret } : {}),
      ...(thumbprint && privateKey
        ? { certificate: { thumbprint, privateKey } }
        : {}),
    };
  }

  if (nodeEnv === 'production') {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) throw new Error('APP_ORIGIN must be an exact HTTPS origin in production');
    if (!entra?.certificate) {
      throw new Error('A certificate credential is required for Entra in production');
    }
    const expectedRedirect = `${origin}/auth/entra/callback`;
    if (entra.redirectUri !== expectedRedirect) throw new Error(`ENTRA_REDIRECT_URI must exactly equal ${expectedRedirect} in production`);
    if (!redisUrl) throw new Error('REDIS_URL is required in production; in-memory sessions are not permitted');
    if (env.TRUST_PROXY === undefined) throw new Error('TRUST_PROXY must be explicitly configured in production');
  }
  if (nodeEnv === 'production' || stellarLab) {
    if (!stellarCapabilities) throw new Error('Production/LAB requires provisioned CNG identity, protected policy/registry artifacts, and a pinned Lab Gateway bridge identity');
    if (!redisUrl) throw new Error('Production/LAB requires durable Redis for the Stellar capability replay ledger');
  }

  return {
    nodeEnv,
    port,
    origin,
    sessionTtlMs: Number(env.SESSION_TTL_MS ?? 8 * 60 * 60 * 1000),
    cookieSecure: nodeEnv === 'production' || env.COOKIE_SECURE === 'true',
    trustProxy,
    redisUrl,
    stellarCapabilities,
    entra,
  };
}
