import { randomBytes } from 'node:crypto';
import { createClient } from 'redis';

export interface AuthenticatedPrincipal {
  subject: string;
  tenantId: string;
  name?: string;
  username?: string;
  roles: string[];
  csrfToken: string;
}

export interface PendingAuthorization {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  createdAt: number;
}

export interface AdminSession {
  id: string;
  createdAt: number;
  expiresAt: number;
  pendingAuthorization?: PendingAuthorization;
  principal?: AuthenticatedPrincipal;
}

export interface SessionStore {
  readonly shared: boolean;
  create(ttlMs: number): Promise<AdminSession>;
  get(id: string): Promise<AdminSession | undefined>;
  set(session: AdminSession): Promise<void>;
  delete(id: string): Promise<void>;
  rotate(id: string, ttlMs: number): Promise<AdminSession>;
  close?(): Promise<void>;
}

export class SessionCapacityError extends Error {
  constructor() {
    super('The in-memory session store has reached its configured capacity.');
    this.name = 'SessionCapacityError';
  }
}

export class InMemorySessionStore implements SessionStore {
  readonly shared = false;
  private readonly sessions = new Map<string, AdminSession>();

  constructor(
    private readonly maxSessions = 10_000,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(maxSessions) || maxSessions <= 0) {
      throw new TypeError('maxSessions must be a positive integer.');
    }
  }

  get activeSessionCount(): number {
    this.sweepExpired();
    return this.sessions.size;
  }

  async create(ttlMs: number): Promise<AdminSession> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new TypeError('ttlMs must be a finite positive number.');
    }
    this.sweepExpired();
    if (this.sessions.size >= this.maxSessions) throw new SessionCapacityError();
    const now = this.now();
    const session: AdminSession = {
      id: randomBytes(32).toString('base64url'),
      createdAt: now,
      expiresAt: now + ttlMs,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async get(id: string): Promise<AdminSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  async set(session: AdminSession): Promise<void> {
    this.sweepExpired();
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(session.id);
      return;
    }
    if (!this.sessions.has(session.id) && this.sessions.size >= this.maxSessions) {
      throw new SessionCapacityError();
    }
    this.sessions.set(session.id, session);
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async rotate(id: string, ttlMs: number): Promise<AdminSession> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new TypeError('ttlMs must be a finite positive number.');
    this.sweepExpired();
    if (!this.sessions.has(id)) throw new Error('Cannot rotate an unavailable session.');
    const now = this.now();
    const replacement: AdminSession = {
      id: randomBytes(32).toString('base64url'),
      createdAt: now,
      expiresAt: now + ttlMs,
    };
    this.sessions.delete(id);
    this.sessions.set(replacement.id, replacement);
    return replacement;
  }

  async close(): Promise<void> {}

  private sweepExpired(): void {
    const now = this.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(id);
    }
  }
}

export interface RedisSessionClient {
  readonly isOpen: boolean;
  on(event: 'error', listener: (error: Error) => void): unknown;
  connect(): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { PX: number }): Promise<unknown>;
  del(key: string): Promise<number>;
  close(): Promise<unknown>;
}

export class RedisSessionStore implements SessionStore {
  readonly shared = true;
  constructor(private readonly client: RedisSessionClient, private readonly prefix = 'aegis:admin:session:') {}

  static async connect(url: string): Promise<RedisSessionStore> {
    if (!url) throw new Error('A Redis URL is required.');
    const client = createClient({ url }) as unknown as RedisSessionClient;
    client.on('error', (error) => console.error('Redis session store error', error));
    await client.connect();
    return new RedisSessionStore(client);
  }

  async create(ttlMs: number): Promise<AdminSession> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new TypeError('ttlMs must be a finite positive number.');
    const now = Date.now();
    const session: AdminSession = { id: randomBytes(32).toString('base64url'), createdAt: now, expiresAt: now + ttlMs };
    await this.set(session);
    return session;
  }

  async get(id: string): Promise<AdminSession | undefined> {
    const serialized = await this.client.get(this.key(id));
    if (!serialized) return undefined;
    try {
      const session = JSON.parse(serialized) as AdminSession;
      if (session.id !== id || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
        await this.delete(id);
        return undefined;
      }
      return session;
    } catch {
      await this.delete(id);
      return undefined;
    }
  }

  async set(session: AdminSession): Promise<void> {
    const ttlMs = session.expiresAt - Date.now();
    if (ttlMs <= 0) {
      await this.delete(session.id);
      return;
    }
    await this.client.set(this.key(session.id), JSON.stringify(session), { PX: Math.ceil(ttlMs) });
  }

  async delete(id: string): Promise<void> {
    await this.client.del(this.key(id));
  }

  async rotate(id: string, ttlMs: number): Promise<AdminSession> {
    const existing = await this.get(id);
    if (!existing) throw new Error('Cannot rotate an unavailable session.');
    const replacement = await this.create(ttlMs);
    await this.delete(id);
    return replacement;
  }

  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.close();
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }
}
