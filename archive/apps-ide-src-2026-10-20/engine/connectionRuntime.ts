import { ApothecaryItem, SocketBinding, RelationContract } from './relationEngine';
import { allocateFromBudget } from './resourceAllocator';
import { signContract } from './contractStore';
import { registerCapabilities } from './capabilityRegistry';

export function executeUmbilicalHandshake(element: ApothecaryItem, socket: SocketBinding): RelationContract {
  const contractId = `ctr-${element.id}-${socket.id}-${Date.now()}`;
  
  const contract: RelationContract = {
    contractId,
    timestamp: new Date().toISOString(),
    sourceItemId: element.id,
    sourceItemName: element.name,
    targetSocketId: socket.id,
    targetSocketName: socket.name,
    handshakeCompletedStep: 9,
    handshakeStatus: 'SUCCESS',
    negativeSpaceInvariants: {
      never_serializes_witness: true,
      never_persists_prompts: true,
      no_verdict_over_inner_life: true
    },
    capabilitiesExchanged: element.capabilities || [],
    negotiatedProtocolVersion: '4D-VIBE-v1.0',
    allocatedMemoryMB: element.memoryReq || 128,
    allocatedThreads: element.threadsReq || 1,
    checksum: `sha256:mock-${contractId}`
  };

  allocateFromBudget(contractId, {
    memoryMB: contract.allocatedMemoryMB,
    threads: contract.allocatedThreads,
    gpuAccess: false
  });
  
  registerCapabilities(element.id, element.capabilities || []);
  signContract(contract);

  return contract;
}

export function executeTetherHandshake(satellite: ApothecaryItem, hostOrb: ApothecaryItem): RelationContract {
  const contractId = `tether-${satellite.id}-${hostOrb.id}-${Date.now()}`;
  const contract: RelationContract = {
    contractId,
    timestamp: new Date().toISOString(),
    sourceItemId: satellite.id,
    sourceItemName: satellite.name,
    targetSocketId: hostOrb.id,
    targetSocketName: hostOrb.name,
    handshakeCompletedStep: 5,
    handshakeStatus: 'SUCCESS',
    negativeSpaceInvariants: {
      never_serializes_witness: true,
      never_persists_prompts: true,
      no_verdict_over_inner_life: true
    },
    capabilitiesExchanged: satellite.capabilities || [],
    negotiatedProtocolVersion: '4D-VIBE-v1.0',
    allocatedMemoryMB: satellite.memoryReq || 64,
    allocatedThreads: satellite.threadsReq || 1,
    checksum: `sha256:mock-${contractId}`
  };

  registerCapabilities(satellite.id, satellite.capabilities || []);
  signContract(contract);

  return contract;
}

export function executeMeshHandshake(satA: ApothecaryItem, satB: ApothecaryItem, services: string[]): RelationContract {
  const contractId = `mesh-${satA.id}-${satB.id}-${Date.now()}`;
  const contract: RelationContract = {
    contractId,
    timestamp: new Date().toISOString(),
    sourceItemId: satA.id,
    sourceItemName: satA.name,
    targetSocketId: satB.id,
    targetSocketName: satB.name,
    handshakeCompletedStep: 4,
    handshakeStatus: 'SUCCESS',
    negativeSpaceInvariants: {
      never_serializes_witness: true,
      never_persists_prompts: true,
      no_verdict_over_inner_life: true
    },
    capabilitiesExchanged: services,
    negotiatedProtocolVersion: '4D-VIBE-v1.0',
    allocatedMemoryMB: 0,
    allocatedThreads: 0,
    checksum: `sha256:mock-${contractId}`
  };

  signContract(contract);
  return contract;
}
