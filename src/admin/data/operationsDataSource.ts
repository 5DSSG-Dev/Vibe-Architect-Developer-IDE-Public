import type { OperationEvent, PodTopologySnapshot } from '../domain/index.ts';

export type SubscriptionStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface OperationsSubscription {
  readonly cursor?: string;
  onEvent(listener: (event: OperationEvent) => void): () => void;
  onStatus(listener: (status: SubscriptionStatus, error?: Error) => void): () => void;
  close(): void;
}

export interface OperationsDataSource {
  loadSnapshot(signal: AbortSignal): Promise<PodTopologySnapshot>;
  subscribe(cursor?: string): OperationsSubscription;
  close(): void;
}
