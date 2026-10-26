import type { OperationEvent, PodTopologySnapshot } from '../domain/index.ts';
import {
  validateOperationEvent,
  validatePodTopologySnapshot,
} from '../domain/validation.ts';
import type {
  OperationsDataSource,
  OperationsSubscription,
  SubscriptionStatus,
} from './operationsDataSource.ts';

interface EventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

export class OperationsDataSourceError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OperationsDataSourceError';
    this.status = status;
  }
}

export class UnauthorizedOperationsDataSourceError extends OperationsDataSourceError {
  constructor(status: 401 | 403) {
    super('Operations authorization is no longer valid', status);
    this.name = 'UnauthorizedOperationsDataSourceError';
  }
}

class SameOriginSubscription implements OperationsSubscription {
  private readonly eventListeners = new Set<(event: OperationEvent) => void>();
  private readonly statusListeners = new Set<(status: SubscriptionStatus, error?: Error) => void>();
  private status: SubscriptionStatus = 'connecting';
  private closed = false;
  private authCheckPending = false;
  public readonly cursor: string | undefined;
  private readonly source: EventSourceLike;
  private readonly validateEvent: (candidate: unknown) => OperationEvent;
  private readonly recheckAuthorization: () => Promise<Response>;

  constructor(
    cursor: string | undefined,
    source: EventSourceLike,
    validateEvent: (candidate: unknown) => OperationEvent,
    recheckAuthorization: () => Promise<Response>,
  ) {
    this.cursor = cursor;
    this.source = source;
    this.validateEvent = validateEvent;
    this.recheckAuthorization = recheckAuthorization;
    source.onopen = () => this.setStatus('open');
    source.onerror = () => void this.handleStreamError();
    source.addEventListener('operation', (message) => {
      if (this.closed) return;
      try {
        const candidate = this.validateEvent(JSON.parse(message.data) as unknown);
        this.eventListeners.forEach((listener) => listener(candidate));
      } catch (cause) {
        this.fail(cause instanceof Error
          ? cause
          : new OperationsDataSourceError('Invalid operations event payload'));
      }
    });
    source.addEventListener('replay-complete', () => this.close());
  }

  onEvent(listener: (event: OperationEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: (status: SubscriptionStatus, error?: Error) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.source.close();
    this.setStatus('closed');
    this.eventListeners.clear();
    this.statusListeners.clear();
  }

  private setStatus(status: SubscriptionStatus, error?: Error): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status, error));
  }

  private fail(error: Error): void {
    if (this.closed) return;
    this.source.close();
    this.setStatus('error', error);
  }

  private async handleStreamError(): Promise<void> {
    if (this.closed || this.authCheckPending) return;
    this.authCheckPending = true;
    try {
      const response = await this.recheckAuthorization();
      if (response.status === 401 || response.status === 403) {
        this.fail(new UnauthorizedOperationsDataSourceError(response.status));
        return;
      }
      this.setStatus('error', new OperationsDataSourceError('Operations stream disconnected', response.status));
    } catch {
      this.setStatus('error', new OperationsDataSourceError('Operations stream disconnected; authorization could not be rechecked'));
    } finally {
      this.authCheckPending = false;
    }
  }
}

export class SameOriginOperationsDataSource implements OperationsDataSource {
  private readonly subscriptions = new Set<SameOriginSubscription>();
  private readonly fetchImpl: typeof fetch;
  private readonly eventSourceFactory: (url: string) => EventSourceLike;
  private snapshot?: PodTopologySnapshot;

  constructor(
    fetchImpl: typeof fetch | undefined = undefined,
    eventSourceFactory: (url: string) => EventSourceLike = (url) => new EventSource(url, {
      withCredentials: true,
    }),
  ) {
    // Browser-native fetch is receiver-sensitive in some engines. Binding the
    // default here prevents a later `this.fetchImpl(...)` call from supplying
    // the data-source instance as fetch's receiver. Explicit injections remain
    // byte-for-byte the caller's function for deterministic tests/adapters.
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.eventSourceFactory = eventSourceFactory;
  }

  async loadSnapshot(signal: AbortSignal): Promise<PodTopologySnapshot> {
    const response = await this.fetchImpl('/api/admin/operations/snapshot', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new OperationsDataSourceError('Unable to load operations snapshot', response.status);
    }
    const snapshot = validatePodTopologySnapshot(await response.json() as unknown);
    this.snapshot = snapshot;
    return snapshot;
  }

  subscribe(cursor?: string): OperationsSubscription {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const subscription = new SameOriginSubscription(
      cursor,
      this.eventSourceFactory(`/api/admin/operations/stream${query}`),
      (candidate) => {
        if (!this.snapshot) throw new OperationsDataSourceError('Snapshot must be loaded before subscribing');
        return validateOperationEvent(candidate, this.snapshot);
      },
      () => this.fetchImpl('/api/admin/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }),
    );
    this.subscriptions.add(subscription);
    const originalClose = subscription.close.bind(subscription);
    subscription.close = () => {
      originalClose();
      this.subscriptions.delete(subscription);
    };
    return subscription;
  }

  close(): void {
    [...this.subscriptions].forEach((subscription) => subscription.close());
  }
}
