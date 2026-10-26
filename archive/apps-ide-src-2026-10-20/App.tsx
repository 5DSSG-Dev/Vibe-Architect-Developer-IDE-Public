import React, { useState, useEffect } from 'react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { Header } from './components/Header';
import { LeftDrawer } from './components/LeftDrawer';
import { RightPanel } from './components/RightPanel';
import { Footer } from './components/Footer';
import { HandshakeModal } from './components/HandshakeModal';
import { CoreMatrixModal } from './components/CoreMatrixModal';
import { ViewContentsModal } from './components/ViewContentsModal';
import { EditObjectModal } from './components/EditObjectModal';
import { CodeEditorOverlayModal } from './components/CodeEditorOverlayModal';
import { CodeModeView } from './components/CodeModeView';
import { SimulateModeView } from './components/SimulateModeView';
import { DeployModeView } from './components/DeployModeView';
import {
  ApothecaryItem,
  SocketBinding,
  CoreManifest,
  RelationContract,
  HardwareBudget,
  ActiveDaemons,
  DEFAULT_APOTHECARY_CATALOG,
  createInitialCoreManifest
} from './engine/relationEngine';
import { globalSimulationEngine, SimulationTelemetry } from './engine/simulationEngine';
import { runComprehensiveCoreAudit } from './engine/auditEngine';

export function App() {
  const [activeMode, setActiveMode] = useState<'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY'>('DESIGN');
  const [coreManifest, setCoreManifest] = useState<CoreManifest>(() => createInitialCoreManifest());
  const [telemetry, setTelemetry] = useState<SimulationTelemetry>(() => globalSimulationEngine.getState());
  const [isFooterExpanded, setIsFooterExpanded] = useState<boolean>(true);

  // Modal states
  const [attachingItem, setAttachingItem] = useState<ApothecaryItem | null>(null);
  const [isCoreMatrixOpen, setIsCoreMatrixOpen] = useState<boolean>(false);
  const [selectedSocketId, setSelectedSocketId] = useState<string | undefined>(undefined);

  // 3-Tier Object Inspection Modal States
  const [inspectingItem, setInspectingItem] = useState<ApothecaryItem | null>(null);
  const [inspectingSocket, setInspectingSocket] = useState<SocketBinding | null>(null);
  const [activeInspectorTier, setActiveInspectorTier] = useState<'NONE' | 'MANIFEST' | 'EDIT_PROPERTIES' | 'EDIT_CODE'>('NONE');

  // Subscribe to simulation tick clock & telemetry updates
  useEffect(() => {
    const unsubscribe = globalSimulationEngine.subscribe((newTelemetry) => {
      setTelemetry(newTelemetry);
    });

    const tickInterval = setInterval(() => {
      globalSimulationEngine.tick();
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(tickInterval);
    };
  }, []);

  // Handshake Commit Handler
  const handleCommitHandshake = (
    item: ApothecaryItem,
    targetSocketId: string,
    contract: RelationContract
  ) => {
    setCoreManifest((prev) => {
      const updatedSockets = prev.sockets.map((s) => {
        if (s.id === targetSocketId) {
          return {
            ...s,
            state: 'Active' as const,
            connectedItem: item,
            contractId: contract.contractId
          };
        }
        return s;
      });

      return {
        ...prev,
        sockets: updatedSockets,
        contracts: [contract, ...prev.contracts]
      };
    });

    globalSimulationEngine.addLog(
      'SUCCESS',
      `[UMBILICAL HANDSHAKE SUCCESS] Bound ${item.name} to ${targetSocketId} via contract ${contract.contractId}`
    );

    setAttachingItem(null);
  };

  const handleUpdateHardwareBudget = (budget: HardwareBudget) => {
    setCoreManifest((prev) => ({
      ...prev,
      hardwareBudget: budget
    }));
  };

  const handleToggleDaemon = (daemonKey: keyof ActiveDaemons) => {
    setCoreManifest((prev) => ({
      ...prev,
      activeDaemons: {
        ...prev.activeDaemons,
        [daemonKey]: !prev.activeDaemons[daemonKey]
      }
    }));
  };

  const handleSelectSocket = (socket: SocketBinding, item?: ApothecaryItem) => {
    setSelectedSocketId(socket.id);
    if (item) {
      setAttachingItem(item);
    } else {
      setAttachingItem(DEFAULT_APOTHECARY_CATALOG[0]);
    }
  };

  const handleDropAttachItem = (item: ApothecaryItem, targetSocketId: string) => {
    setSelectedSocketId(targetSocketId);
    setAttachingItem(item);
  };

  // Right-Click Element Inspector Handler (Triggers Tier 1 Manifest Modal)
  const handleRightClickElement = (socket?: SocketBinding, item?: ApothecaryItem) => {
    setInspectingSocket(socket || null);
    setInspectingItem(item || socket?.connectedItem || null);
    setActiveInspectorTier('MANIFEST');
  };

  // Save updated element properties / manifest JSON
  const handleSaveInspectedItem = (updatedItem: ApothecaryItem) => {
    setCoreManifest((prev) => {
      const updatedSockets = prev.sockets.map((s) => {
        if ((inspectingSocket && s.id === inspectingSocket.id) || (s.connectedItem && s.connectedItem.id === updatedItem.id)) {
          return {
            ...s,
            name: updatedItem.name,
            connectedItem: updatedItem
          };
        }
        return s;
      });

      return {
        ...prev,
        sockets: updatedSockets
      };
    });

    setInspectingItem(updatedItem);
    globalSimulationEngine.addLog('SUCCESS', `[MANIFEST RE-VALIDATION SUCCESS] Updated ${updatedItem.name} specs & contracts.`);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080b10] text-slate-100 font-sans select-none">
      {/* 1. 3D WebGL Canvas Layer */}
      <ThreeCanvas
        sockets={coreManifest.sockets}
        selectedSocketId={selectedSocketId}
        activeMode={activeMode}
        onSelectSocket={handleSelectSocket}
        onDropAttachItem={handleDropAttachItem}
        onRightClickElement={handleRightClickElement}
      />

      {/* 2. UI Overlay Controls */}
      <Header
        activeMode={activeMode}
        onSelectMode={(mode) => setActiveMode(mode)}
        hardwareBudget={coreManifest.hardwareBudget}
        onOpenCoreMatrix={() => setIsCoreMatrixOpen(true)}
        onRunAudit={() => setActiveMode('DEPLOY')}
      />

      {/* Mode View overlays or side drawers */}
      {activeMode === 'DESIGN' && (
        <>
          <LeftDrawer
            catalog={DEFAULT_APOTHECARY_CATALOG}
            isFooterExpanded={isFooterExpanded}
            onSelectAttachItem={(item) => setAttachingItem(item)}
            onRightClickItem={(item) => {
              setInspectingItem(item);
              setInspectingSocket(null);
              setActiveInspectorTier('MANIFEST');
            }}
          />

          <RightPanel
            catalog={DEFAULT_APOTHECARY_CATALOG}
            isFooterExpanded={isFooterExpanded}
            onSelectAttachItem={(item) => setAttachingItem(item)}
            selectedItem={attachingItem || coreManifest.sockets.find(s => s.connectedItem)?.connectedItem}
          />
        </>
      )}

      {activeMode === 'CODE' && (
        <CodeModeView manifest={coreManifest} />
      )}

      {activeMode === 'SIMULATE' && (
        <SimulateModeView
          telemetry={telemetry}
          onSetPressure={(p) => globalSimulationEngine.setEnvironmentalPressure(p)}
          onInjectSatelliteFault={() => globalSimulationEngine.injectSatelliteFailure()}
          onInjectHostOrbCrash={() => globalSimulationEngine.injectHostOrbCrash()}
          onClearFaults={() => globalSimulationEngine.clearFaults()}
        />
      )}

      {activeMode === 'DEPLOY' && (
        <DeployModeView manifest={coreManifest} />
      )}

      {/* Footer HUD */}
      <Footer
        telemetry={telemetry}
        coreManifest={coreManifest}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        onSetPressure={(p) => globalSimulationEngine.setEnvironmentalPressure(p)}
        onValidateCore={() => runComprehensiveCoreAudit(coreManifest)}
        showTelemetryDeck={isFooterExpanded}
        onToggleTelemetryDeck={() => setIsFooterExpanded(!isFooterExpanded)}
        onExportCore={() => {
          const blob = new Blob([JSON.stringify(coreManifest, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${coreManifest.name.toLowerCase().replace(/\s+/g, '-')}-manifest.json`;
          a.click();
        }}
      />

      {/* 3. Interactive Modals */}
      {attachingItem && (
        <HandshakeModal
          item={attachingItem}
          availableSockets={coreManifest.sockets}
          initialTargetSocketId={selectedSocketId}
          onClose={() => setAttachingItem(null)}
          onCommitHandshake={handleCommitHandshake}
        />
      )}

      {isCoreMatrixOpen && (
        <CoreMatrixModal
          hardwareBudget={coreManifest.hardwareBudget}
          activeDaemons={coreManifest.activeDaemons}
          onUpdateHardwareBudget={handleUpdateHardwareBudget}
          onToggleDaemon={handleToggleDaemon}
          onClose={() => setIsCoreMatrixOpen(false)}
        />
      )}

      {/* 4. 3-Tier Object Inspection & Editing Modals */}
      {activeInspectorTier === 'MANIFEST' && (
        <ViewContentsModal
          item={inspectingItem || undefined}
          socket={inspectingSocket || undefined}
          onClose={() => setActiveInspectorTier('NONE')}
          onOpenEditProperties={() => setActiveInspectorTier('EDIT_PROPERTIES')}
          onOpenCodeEditor={() => setActiveInspectorTier('EDIT_CODE')}
        />
      )}

      {activeInspectorTier === 'EDIT_PROPERTIES' && (
        <EditObjectModal
          item={inspectingItem || undefined}
          socket={inspectingSocket || undefined}
          onClose={() => setActiveInspectorTier('NONE')}
          onSaveProperties={(updated) => {
            handleSaveInspectedItem(updated);
            setActiveInspectorTier('NONE');
          }}
          onOpenCodeEditor={() => setActiveInspectorTier('EDIT_CODE')}
        />
      )}

      {activeInspectorTier === 'EDIT_CODE' && (
        <CodeEditorOverlayModal
          item={inspectingItem || undefined}
          socket={inspectingSocket || undefined}
          onClose={() => setActiveInspectorTier('NONE')}
          onSaveManifestJson={(updated) => {
            handleSaveInspectedItem(updated);
          }}
        />
      )}
    </div>
  );
}

export default App;
