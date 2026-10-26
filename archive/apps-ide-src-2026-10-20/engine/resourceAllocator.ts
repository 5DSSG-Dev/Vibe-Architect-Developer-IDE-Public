export interface ResourceRequest {
  memoryMB: number;
  threads: number;
  gpuAccess: boolean;
}

export interface ResourceAllocation extends ResourceRequest {
  containmentLevel: 'Sandboxed' | 'Shared' | 'Privileged';
}

const coreBudget = { memoryMB: 4096, threads: 16, gpuAccess: true };
const allocations = new Map<string, ResourceAllocation>();

export function getAvailableBudget(): ResourceRequest {
  let usedMem = 0;
  let usedThreads = 0;
  for (const alloc of allocations.values()) {
    usedMem += alloc.memoryMB;
    usedThreads += alloc.threads;
  }
  return {
    memoryMB: coreBudget.memoryMB - usedMem,
    threads: coreBudget.threads - usedThreads,
    gpuAccess: coreBudget.gpuAccess
  };
}

export function wouldExceedBudget(request: ResourceRequest): boolean {
  const avail = getAvailableBudget();
  return request.memoryMB > avail.memoryMB || request.threads > avail.threads;
}

export function allocateFromBudget(contractId: string, request: ResourceRequest): boolean {
  if (wouldExceedBudget(request)) return false;
  allocations.set(contractId, { ...request, containmentLevel: 'Sandboxed' });
  return true;
}

export function releaseAllocation(contractId: string): void {
  allocations.delete(contractId);
}
