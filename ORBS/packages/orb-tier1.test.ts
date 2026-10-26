import { AbstractSyntaxWeaverOrb } from './orb-ast/src';
import { CodeGenerationEngineOrb } from './orb-codegen/src';
import { RefactoringLoomOrb } from './orb-refactor/src';
import { HandshakeEngine } from '../runtime/HandshakeEngine';
import { RelationContract } from '../contracts/relation-contract';

describe('Phase 2 — Tier 1 Orbs Integration Test', () => {
  let activeContract: RelationContract;

  beforeEach(() => {
    activeContract = {
      contractId: 'contract-tier1-orbs',
      connectionType: 'umbilical',
      lifecycle: 'PROPOSED',
      partyA: { elementId: 'orb-codegen', category: 'orb', boundaryRole: 'initiator', trustState: 'provisional' },
      partyB: { elementId: 'core-crystal', category: 'core', boundaryRole: 'receiver', trustState: 'verified' },
      capabilities: {
        partyA: { offered: ['code_generation', 'ast_parse', 'code_refactoring'], required: ['pod_context'] },
        partyB: { offered: ['pod_context', 'telemetry_sink'], required: ['code_generation'] }
      },
      resources: { maxMemoryMB: 512, threadQuota: 4, maxPacketChars: 3200 },
      invariants: {
        refuseIdentityMutation: true,
        refuseRawFilesystemEscapes: true,
        refuseImplicitNetworkAccess: true,
        failClosedOnOverflow: true
      }
    };

    HandshakeEngine.executeHandshake(activeContract);
  });

  it('orb-codegen emits valid Stellar slice and orb-ast parses it cleanly', () => {
    const codegen = new CodeGenerationEngineOrb();
    const astOrb = new AbstractSyntaxWeaverOrb();

    const { source } = codegen.generateContract({
      intentName: 'SensorPipeline',
      category: 'contract',
      capabilities: { offers: ['telemetry_stream'], requires: ['pod_context'] },
      budget: { memoryMB: 128, threads: 1, packetLimit: 3200 }
    }, activeContract);

    const parseResult = astOrb.parseSource(source, activeContract);
    expect(parseResult.success).toBe(true);
    expect(parseResult.rootNode?.children?.length).toBeGreaterThan(0);
  });

  it('orb-refactor strictly refuses Pod identity mutations', () => {
    const refactor = new RefactoringLoomOrb();
    const mockAst: any = { type: 'Ident', value: 'pod_id = 1003' };

    expect(() => {
      refactor.renameSymbol(mockAst, 'pod_id', 'mutated_id', activeContract);
    }).toThrow("Refused operation");
  });
});