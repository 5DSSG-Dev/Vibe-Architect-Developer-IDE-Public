import { RelationContract } from './relationEngine';

const contractLedger = new Map<string, RelationContract>();

export function signContract(contract: RelationContract): void {
  contractLedger.set(contract.contractId, contract);
}

export function getContract(contractId: string): RelationContract | undefined {
  return contractLedger.get(contractId);
}

export function getContractsByElement(elementId: string): RelationContract[] {
  return Array.from(contractLedger.values()).filter(c => 
    c.sourceItemId === elementId || c.targetSocketId === elementId
  );
}

export function voidContract(contractId: string): void {
  const c = contractLedger.get(contractId);
  if (c) {
    c.handshakeStatus = 'FAILED';
  }
}

export function exportContractManifest(): RelationContract[] {
  return Array.from(contractLedger.values());
}
