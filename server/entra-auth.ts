import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  ConfidentialClientApplication,
  type AuthorizationCodeRequest,
  type Configuration,
} from '@azure/msal-node';
import type { GatewayConfig } from './config.js';
import { hasAuthenticatedServiceRole } from './config.js';
import type { AdminSession, AuthenticatedPrincipal } from './session-store.js';

export interface EntraAuth {
  configured: boolean;
  createAuthorizationUrl(session: AdminSession): Promise<string>;
  completeAuthorization(session: AdminSession, query: Record<string, unknown>): Promise<AuthenticatedPrincipal>;
}

function claimString(claims: Record<string, unknown>, key: string): string | undefined {
  return typeof claims[key] === 'string' ? claims[key] as string : undefined;
}

function equalSecret(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class MsalEntraAuth implements EntraAuth {
  readonly configured: boolean;
  private readonly client?: ConfidentialClientApplication;

  constructor(private readonly config: GatewayConfig) {
    this.configured = Boolean(config.entra);
    if (!config.entra) return;
    const auth: Configuration['auth'] = {
      clientId: config.entra.clientId,
      authority: `https://login.microsoftonline.com/${config.entra.tenantId}`,
      ...(config.entra.certificate
        ? { clientCertificate: config.entra.certificate }
        : { clientSecret: config.entra.clientSecret }),
    };
    this.client = new ConfidentialClientApplication({ auth });
  }

  async createAuthorizationUrl(session: AdminSession): Promise<string> {
    if (!this.client || !this.config.entra) throw new Error('Entra authentication is not configured');
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(64).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    session.pendingAuthorization = {
      state,
      nonce,
      codeVerifier,
      returnTo: '/admin/operations',
      createdAt: Date.now(),
    };
    return this.client.getAuthCodeUrl({
      scopes: ['openid', 'profile'],
      redirectUri: this.config.entra.redirectUri,
      responseMode: 'query',
      state,
      nonce,
      codeChallenge,
      codeChallengeMethod: 'S256',
    });
  }

  async completeAuthorization(session: AdminSession, query: Record<string, unknown>): Promise<AuthenticatedPrincipal> {
    if (!this.client || !this.config.entra) throw new Error('Entra authentication is not configured');
    const pending = session.pendingAuthorization;
    delete session.pendingAuthorization;
    if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000) {
      throw new Error('Authorization request is missing or expired');
    }
    const state = typeof query.state === 'string' ? query.state : '';
    const code = typeof query.code === 'string' ? query.code : '';
    if (!code || !equalSecret(state, pending.state)) throw new Error('Invalid authorization response');

    const request: AuthorizationCodeRequest = {
      code,
      scopes: ['openid', 'profile'],
      redirectUri: this.config.entra.redirectUri,
      codeVerifier: pending.codeVerifier,
    };
    const result = await this.client.acquireTokenByCode(request);
    const claims = (result?.idTokenClaims ?? {}) as Record<string, unknown>;
    const nonce = claimString(claims, 'nonce');
    const tenantId = claimString(claims, 'tid');
    const subject = claimString(claims, 'oid') ?? claimString(claims, 'sub');
    const audience = claimString(claims, 'aud');
    const roles = Array.isArray(claims.roles) ? claims.roles.filter((role): role is string => typeof role === 'string') : [];
    if (!nonce || !equalSecret(nonce, pending.nonce)) throw new Error('Invalid token nonce');
    if (tenantId !== this.config.entra.tenantId || audience !== this.config.entra.clientId || !subject) {
      throw new Error('Token tenant, audience, or subject is invalid');
    }
    if (!hasAuthenticatedServiceRole(roles)) throw new Error('Required application role is missing');
    return {
      subject,
      tenantId,
      name: claimString(claims, 'name'),
      username: claimString(claims, 'preferred_username'),
      roles,
      csrfToken: randomBytes(32).toString('base64url'),
    };
  }
}
