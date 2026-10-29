export interface ResourceRequest {
  memoryMB: number;
  threads: number;
  bandwidthNormalCredits: number;
  bandwidthPeakCredits: number;
  gpuAccess: boolean;
}

export interface ResourceAllocation extends ResourceRequest {
  containmentLevel: 'Sandboxed' | 'Shared' | 'Privileged';
}

export interface ResourceCapacity {
  memoryMB: number;
  threads: number;
  bandwidthCredits: number;
  gpuAccess: boolean;
}

export interface CommittedResourceReservation extends ResourceRequest {
  readonly contractId: string;
}

const coreBudget = { memoryMB: 4096, threads: 16, bandwidthCredits: 256, gpuAccess: true };
const allocations = new Map<string, ResourceAllocation>();

/** Replace allocator state from the authoritative CORE manifest snapshot. */
export function synchronizeCoreResourceState(
  budget: ResourceCapacity,
  committed: readonly CommittedResourceReservation[]
): void {
  if (!Number.isFinite(budget.memoryMB) || budget.memoryMB < 0 || !Number.isFinite(budget.threads) || budget.threads < 0 ||
    !Number.isFinite(budget.bandwidthCredits) || budget.bandwidthCredits < 0) {
    throw new Error('CORE resource budget values must be finite and non-negative.');
  }
  const next = new Map<string, ResourceAllocation>();
  for (const reservation of committed) {
    const { contractId, ...request } = reservation;
    if (!contractId || next.has(contractId) || !isValidRequest(request)) {
      throw new Error('CORE resource reservations must have unique contract IDs and valid non-negative resource values.');
    }
    next.set(contractId, { ...request, containmentLevel: 'Sandboxed' });
  }
  coreBudget.memoryMB = budget.memoryMB;
  coreBudget.threads = budget.threads;
  coreBudget.bandwidthCredits = budget.bandwidthCredits;
  coreBudget.gpuAccess = budget.gpuAccess;
  allocations.clear();
  for (const [contractId, allocation] of next) allocations.set(contractId, allocation);
}

function isValidRequest(request: ResourceRequest): boolean {
  return Number.isFinite(request.memoryMB) && request.memoryMB >= 0 &&
    Number.isFinite(request.threads) && request.threads >= 0 &&
    Number.isFinite(request.bandwidthNormalCredits) && request.bandwidthNormalCredits >= 0 &&
    Number.isFinite(request.bandwidthPeakCredits) && request.bandwidthPeakCredits >= 0;
}

export function configureCoreResourceBudget(budget: ResourceCapacity): void {
  if (!Number.isFinite(budget.memoryMB) || budget.memoryMB < 0 || !Number.isFinite(budget.threads) || budget.threads < 0 ||
    !Number.isFinite(budget.bandwidthCredits) || budget.bandwidthCredits < 0) {
    throw new Error('CORE resource budget values must be finite and non-negative.');
  }
  const occupied = Array.from(allocations.values()).reduce((total, allocation) => ({
    memoryMB: total.memoryMB + allocation.memoryMB,
    threads: total.threads + allocation.threads,
    bandwidthCredits: total.bandwidthCredits + allocation.bandwidthPeakCredits
  }), { memoryMB: 0, threads: 0, bandwidthCredits: 0 });
  if (occupied.memoryMB > budget.memoryMB || occupied.threads > budget.threads || occupied.bandwidthCredits > budget.bandwidthCredits) {
    throw new Error('CORE resource budget cannot be lowered below committed allocations.');
  }
  coreBudget.memoryMB = budget.memoryMB;
  coreBudget.threads = budget.threads;
  coreBudget.bandwidthCredits = budget.bandwidthCredits;
  coreBudget.gpuAccess = budget.gpuAccess;
}

export function getAvailableBudget(): ResourceCapacity {
  let usedMem = 0;
  let usedThreads = 0;
  let usedBandwidth = 0;
  for (const alloc of allocations.values()) {
    usedMem += alloc.memoryMB;
    usedThreads += alloc.threads;
    usedBandwidth += alloc.bandwidthPeakCredits;
  }
  return {
    memoryMB: Math.max(0, coreBudget.memoryMB - usedMem),
    threads: Math.max(0, coreBudget.threads - usedThreads),
    bandwidthCredits: Math.max(0, coreBudget.bandwidthCredits - usedBandwidth),
    gpuAccess: coreBudget.gpuAccess
  };
}

export function wouldExceedBudget(request: ResourceRequest): boolean {
  const avail = getAvailableBudget();
  return request.memoryMB > avail.memoryMB || request.threads > avail.threads || request.bandwidthPeakCredits > avail.bandwidthCredits;
}

export function allocateFromBudget(contractId: string, request: ResourceRequest): boolean {
  if (wouldExceedBudget(request)) return false;
  allocations.set(contractId, { ...request, containmentLevel: 'Sandboxed' });
  return true;
}

export function releaseAllocation(contractId: string): void {
  allocations.delete(contractId);
}
