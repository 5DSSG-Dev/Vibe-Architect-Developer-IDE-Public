export const UMBILICAL_PROFILE_IDS = ['Pulse', 'Record', 'Archive', 'Interface', 'Conduit'] as const;
export type UmbilicalProfileId = (typeof UMBILICAL_PROFILE_IDS)[number];
export type UmbilicalFlow = 'message' | 'request-response' | 'stream';
export type FlowDirection = 'inbound' | 'outbound' | 'bidirectional';

/** Credits model relative CORE demand. They are not measured network throughput. */
export interface BandwidthEnvelope {
  readonly unit: 'CORE_BANDWIDTH_CREDIT';
  readonly normal: number;
  readonly peak: number;
  readonly provisional: true;
}

export interface UmbilicalProfile {
  readonly id: UmbilicalProfileId;
  readonly version: '0.1.0';
  readonly label: string;
  readonly purpose: string;
  readonly flows: readonly UmbilicalFlow[];
  readonly direction: FlowDirection;
  readonly reach: readonly string[];
  readonly healthSignals: readonly string[];
  readonly bandwidth: BandwidthEnvelope;
  readonly minimumMemoryMB: number;
  readonly memoryProvisional: true;
  readonly visualModelKey?: 'umbilicalShort' | 'umbilicalLong2' | 'umbilical' | 'umbilicalLong';
  readonly visualThickness: number;
}

export const UMBILICAL_PROFILES: Readonly<Record<UmbilicalProfileId, UmbilicalProfile>> = {
  Pulse: {
    id: 'Pulse', version: '0.1.0', label: 'A light connection for signals and quick checks',
    purpose: 'Bounded scheduling, control, health checks, and low-volume notifications.',
    flows: ['message'], direction: 'bidirectional', reach: ['declared control capabilities', 'health signals'],
    healthSignals: ['heartbeat', 'queue depth', 'missed response count'],
    bandwidth: { unit: 'CORE_BANDWIDTH_CREDIT', normal: 2, peak: 4, provisional: true },
    minimumMemoryMB: 128, memoryProvisional: true, visualModelKey: 'umbilicalShort', visualThickness: 0.30
  },
  Record: {
    id: 'Record', version: '0.1.0', label: 'A steady connection for account and database work',
    purpose: 'Stateful transactions and structured records.',
    flows: ['request-response'], direction: 'bidirectional', reach: ['declared record capabilities'],
    healthSignals: ['heartbeat', 'transaction latency', 'pool saturation'],
    bandwidth: { unit: 'CORE_BANDWIDTH_CREDIT', normal: 4, peak: 8, provisional: true },
    minimumMemoryMB: 256, memoryProvisional: true, visualModelKey: 'umbilicalLong2', visualThickness: 0.38
  },
  Archive: {
    id: 'Archive', version: '0.1.0', label: 'A connection for files and saved work',
    purpose: 'Files, documents, artifacts, and bounded file streams, including Library Orb storage.',
    flows: ['request-response', 'stream'], direction: 'bidirectional', reach: ['declared file and artifact capabilities'],
    healthSignals: ['heartbeat', 'transfer progress', 'storage availability'],
    bandwidth: { unit: 'CORE_BANDWIDTH_CREDIT', normal: 4, peak: 16, provisional: true },
    minimumMemoryMB: 384, memoryProvisional: true, visualThickness: 0.44
  },
  Interface: {
    id: 'Interface', version: '0.1.0', label: 'A connection for APIs and app controls',
    purpose: 'Bounded request-response and control APIs.',
    flows: ['request-response'], direction: 'bidirectional', reach: ['declared API routes and control capabilities'],
    healthSignals: ['heartbeat', 'request latency', 'error rate'],
    bandwidth: { unit: 'CORE_BANDWIDTH_CREDIT', normal: 4, peak: 8, provisional: true },
    minimumMemoryMB: 256, memoryProvisional: true, visualModelKey: 'umbilical', visualThickness: 0.48
  },
  Conduit: {
    id: 'Conduit', version: '0.1.0', label: 'A wider connection for model calls and sustained streams',
    purpose: 'Model API calls, media, or sustained high-volume streams.',
    flows: ['request-response', 'stream'], direction: 'bidirectional', reach: ['explicitly declared model, media, or stream capability only'],
    healthSignals: ['heartbeat', 'request latency', 'stream throughput', 'provider availability'],
    bandwidth: { unit: 'CORE_BANDWIDTH_CREDIT', normal: 32, peak: 64, provisional: true },
    minimumMemoryMB: 512, memoryProvisional: true, visualModelKey: 'umbilicalLong', visualThickness: 0.60
  }
};

export function getUmbilicalProfile(id: string): UmbilicalProfile | undefined {
  return UMBILICAL_PROFILE_IDS.includes(id as UmbilicalProfileId) ? UMBILICAL_PROFILES[id as UmbilicalProfileId] : undefined;
}
