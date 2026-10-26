import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasAuthenticatedServiceRole, loadConfig, REQUIRED_ADMIN_ROLE, STELLAR_EXECUTION_ROLE, STELLAR_STEWARD_ROLE } from './config.js';

const productionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://architect.example.com',
  ENTRA_TENANT_ID: 'tenant',
  ENTRA_CLIENT_ID: 'client',
  ENTRA_REDIRECT_URI: 'https://architect.example.com/auth/entra/callback',
  ENTRA_CLIENT_CERT_THUMBPRINT: 'thumbprint',
  ENTRA_CLIENT_CERT_PRIVATE_KEY: 'private-key',
  REDIS_URL: 'rediss://redis.example.com:6380',
  TRUST_PROXY: '1',
  STELLAR_CONTRACT_CNG_KEY_REFERENCE: 'Microsoft Platform Crypto Provider\\aegis-stellar-signing',
  STELLAR_MACHINE_ID: 'machine-production-1',
  STELLAR_INSTALL_ID: 'install-production-1',
  STELLAR_CUSTODIAN_POLICY_AUTHORITY_PATH: 'C:\\Program Files\\AEGIS\\Stellar\\v0.1\\config\\stellar-custodian-policy-authority.canonical.json',
  STELLAR_CUSTODIAN_POLICY_ENVELOPE_PATH: 'C:\\ProgramData\\AEGIS\\Stellar\\v0.1\\config\\custodian-policy.json',
  STELLAR_REQUEST_SIGNER_REGISTRY_PATH: 'C:\\ProgramData\\AEGIS\\Stellar\\v0.1\\config\\request-signers.json',
  STELLAR_LAB_GATEWAY_BRIDGE_ACCOUNT: 'NT SERVICE\\AegisStellarLabGateway',
  STELLAR_LAB_GATEWAY_BRIDGE_SERVICE_NAME: 'AegisStellarLabGateway',
  STELLAR_LAB_GATEWAY_BRIDGE_PATH: 'C:\\Program Files\\AEGIS\\Stellar\\v0.1\\bin\\AegisStellarLabGateway.exe',
  STELLAR_LAB_GATEWAY_BRIDGE_PIPE: '\\\\.\\pipe\\AegisStellarLabGateway.v0.1',
};

test('production configuration requires exact same-origin HTTPS redirect and shared sessions', () => {
  const config = loadConfig(productionEnv);
  assert.equal(config.entra?.redirectUri, `${config.origin}/auth/entra/callback`);
  assert.equal(config.redisUrl, productionEnv.REDIS_URL);
  assert.equal(config.trustProxy, 1);
  assert.equal(config.stellarCapabilities?.audienceService, 'aegis-stellar-sandbox');
  assert.equal(config.stellarCapabilities?.policyAuthorityPath, productionEnv.STELLAR_CUSTODIAN_POLICY_AUTHORITY_PATH);
  assert.equal(config.stellarCapabilities?.labGatewayBridge.serviceName, 'AegisStellarLabGateway');
  assert.throws(() => loadConfig({ ...productionEnv, REDIS_URL: '' }), /REDIS_URL/);
  assert.throws(() => loadConfig({ ...productionEnv, TRUST_PROXY: undefined }), /TRUST_PROXY/);
  assert.throws(() => loadConfig({ ...productionEnv, ENTRA_REDIRECT_URI: 'https://other.example.com/auth/entra/callback' }), /exactly equal/);
  assert.throws(() => loadConfig({ ...productionEnv, ENTRA_REDIRECT_URI: 'http://architect.example.com/auth/entra/callback' }), /exactly equal/);
});

test('production and LAB modes require provisioned CNG identity and durable Redis without development fallback', () => {
  assert.throws(() => loadConfig({ ...productionEnv, STELLAR_CONTRACT_CNG_KEY_REFERENCE: '' }), /configured together|Production\/LAB/);
  assert.throws(() => loadConfig({ STELLAR_LAB_MODE: 'true', STELLAR_CONTRACT_CNG_KEY_REFERENCE: 'Microsoft Platform Crypto Provider\\key', STELLAR_MACHINE_ID: 'machine', STELLAR_INSTALL_ID: 'install' }), /configured together|policy authority/i);
  assert.throws(() => loadConfig({ ...productionEnv, STELLAR_LAB_MODE: 'true', STELLAR_CUSTODIAN_POLICY_AUTHORITY_PATH: 'relative.json' }), /absolute Windows JSON path/i);
  assert.throws(() => loadConfig({ ...productionEnv, STELLAR_LAB_MODE: 'true', REDIS_URL: '' }), /(durable Redis|REDIS_URL.*in-memory sessions)/i);
  assert.throws(() => loadConfig({ STELLAR_CONTRACT_CNG_KEY_REFERENCE: 'provider\\key', STELLAR_MACHINE_ID: 'machine' }), /configured together/);
  assert.throws(() => loadConfig({ ...productionEnv, STELLAR_LAB_GATEWAY_BRIDGE_PATH: 'relative.exe' }), /absolute Windows executable/i);
  const development = loadConfig({ STELLAR_LAB_MODE: 'false' });
  assert.equal(development.stellarCapabilities, undefined);
});

test('unrestricted proxy trust is rejected', () => {
  assert.throws(() => loadConfig({ TRUST_PROXY: 'true' }), /TRUST_PROXY/);
});

test('gateway authentication recognizes only the three explicit service roles', () => {
  assert.equal(hasAuthenticatedServiceRole([REQUIRED_ADMIN_ROLE]), true);
  assert.equal(hasAuthenticatedServiceRole([STELLAR_STEWARD_ROLE]), true);
  assert.equal(hasAuthenticatedServiceRole([STELLAR_EXECUTION_ROLE]), true);
  assert.equal(hasAuthenticatedServiceRole(['service.operations.write', 'roles.read']), false);
});
