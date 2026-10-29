import React, { useState, useEffect } from 'react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { Header } from './components/Header';
import { LeftDrawer } from './components/LeftDrawer';
import { ElementRail } from './components/ElementRail';
import { RightPanel } from './components/RightPanel';
import { Footer, WorkspaceSaveStatus } from './components/Footer';
import { HandshakeModal } from './components/HandshakeModal';
import { CoreMatrixModal } from './components/CoreMatrixModal';
import { ViewContentsModal } from './components/ViewContentsModal';
import { EditObjectModal } from './components/EditObjectModal';
import { CodeEditorOverlayModal } from './components/CodeEditorOverlayModal';
import { OrbBuilderModal } from './components/OrbBuilderModal';
import { AlchemistReliquaryModal } from './components/AlchemistReliquaryModal.tsx';
import { BuiltInBrowserModal } from './components/BuiltInBrowserModal';
import { SimulateModeView } from './components/SimulateModeView';
import { DeployModeView } from './components/DeployModeView';
import { EnvironmentView } from './components/EnvironmentView';
import { Wayfinder } from './components/Wayfinder';
import { LuminaryHost } from './components/LuminaryHost';
import { describeElement } from './luminary/knowledge';
import {
  ApothecaryItem,
  SocketBinding,
  CoreManifest,
  RelationContract,
  HardwareBudget,
  ActiveDaemons,
  DEFAULT_APOTHECARY_CATALOG,
  createInitialCoreManifest,
  ensureElementCodeFrame,
  nextFreePortalAngle,
  getElementChildren,
  isOrbItem
} from './engine/relationEngine';
import { getAvailableCoreResources, getCoreRuntimeCapabilities } from './engine/coreCapabilities';
import { MODEL_CATALOG } from './engine/modelCatalog';
import { globalSimulationEngine, SimulationTelemetry } from './engine/simulationEngine';
import { runComprehensiveCoreAudit } from './engine/auditEngine';
import { appendConnectionEventEvidence, appendRelationContractEvidence, readEvidenceArchive } from './engine/evidenceArchive';
import { describeCurrentTask } from './utils/wayfinder';
import { NavigationPosition, readNavigationPosition, resolveEnvironmentStack } from './utils/navigationSnapshot';
import { getRegisteredOrbManifest, registerCustomOrbManifest, registerOrbManifest } from './contracts/orbManifest';
import { restoreConnectionEvents, subscribeConnectionEvents, type ConnectionEvent } from './contracts/connectionEvents';

// The key keeps its original name so version 1 workspaces are still found;
// the `version` field inside the snapshot drives migration.
const WORKSPACE_STORAGE_KEY = 'aegis-vibe-architect.workspace.v1';

type OverlayId =
  | 'NONE'
  | 'HANDSHAKE'
  | 'CORE_MATRIX'
  | 'ORB_BUILDER'
  | 'RELIQUARY'
  | 'BROWSER'
  | 'INSPECT_MANIFEST'
  | 'INSPECT_PROPERTIES'
  | 'INSPECT_CODE';

interface PersistedWorkspace {
  version: 2;
  activeMode: 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY';
  coreManifest: CoreManifest;
  apothecaryCatalog: ApothecaryItem[];
  /** Added in version 2. A version 1 snapshot migrates to the CORE root. */
  navigation: NavigationPosition;
}

const BUILT_IN_CATALOG: ApothecaryItem[] = [
  ...DEFAULT_APOTHECARY_CATALOG,
  ...MODEL_CATALOG
].map(ensureElementCodeFrame);

function replaceElementById(item: ApothecaryItem, updatedItem: ApothecaryItem): ApothecaryItem {
  return item.id === updatedItem.id ? updatedItem : item;
}

function replaceElementInSocket(socket: SocketBinding, updatedItem: ApothecaryItem): SocketBinding {
  return {
    ...socket,
    connectedItem: socket.connectedItem ? replaceElementById(socket.connectedItem, updatedItem) : undefined,
    attachedSatellites: socket.attachedSatellites?.map((satellite) => replaceElementById(satellite, updatedItem))
  };
}

function ensureSocketCodeFrames(socket: SocketBinding): SocketBinding {
  return {
    ...socket,
    connectedItem: socket.connectedItem ? ensureElementCodeFrame(socket.connectedItem) : undefined,
    attachedSatellites: socket.attachedSatellites?.map(ensureElementCodeFrame)
  };
}

/**
 * Enforces the Umbilical handshake invariant on load: only an Orb can be bound
 * to a socket, because only an Orb carries the handshake code. Any non-Orb that
 * slipped in through the older permissive drop path — e.g. persisted in a saved
 * workspace — is vacated back to an empty socket.
 */
function vacateNonOrbSocket(socket: SocketBinding): SocketBinding {
  if (socket.connectedItem && !isOrbItem(socket.connectedItem)) {
    return {
      id: socket.id,
      name: socket.name,
      angleDeg: socket.angleDeg,
      radius: socket.radius,
      state: 'Vacant'
    };
  }
  return socket;
}

function ensureManifestCodeFrames(manifest: CoreManifest): CoreManifest {
  // Restore CORE-owned custom contract copies before Orb references are used.
  for (const orbManifest of manifest.orbManifestLibrary ?? []) registerOrbManifest(orbManifest);
  return {
    ...manifest,
    sockets: manifest.sockets.map(vacateNonOrbSocket).map(ensureSocketCodeFrames)
  };
}

function mergeCatalog(saved: ApothecaryItem[] | undefined): ApothecaryItem[] {
  const merged = new Map<string, ApothecaryItem>();

  // Current shipped entries establish the baseline so newly added canonical
  // Apothecary elements appear even when an older workspace is restored.
  for (const item of BUILT_IN_CATALOG) merged.set(item.id, item);

  // Persisted entries then restore user-created and user-edited objects.
  for (const item of saved ?? []) merged.set(item.id, item);

  return [...merged.values()];
}

function loadPersistedWorkspace(): PersistedWorkspace | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Omit<Partial<PersistedWorkspace>, 'version'> & { version?: number };
    if ((parsed.version !== 1 && parsed.version !== 2) || !parsed.coreManifest) return null;

    return {
      version: 2,
      activeMode: parsed.activeMode ?? 'DESIGN',
      coreManifest: ensureManifestCodeFrames(parsed.coreManifest),
      apothecaryCatalog: mergeCatalog(parsed.apothecaryCatalog),
      navigation: readNavigationPosition(parsed.version === 2 ? parsed.navigation : undefined)
    };
  } catch (error) {
    console.warn('[WORKSPACE] Persisted workspace could not be restored.', error);
    return null;
  }
}

export function App() {
  const [restoredWorkspace] = useState<PersistedWorkspace | null>(() => loadPersistedWorkspace());

  const [activeMode, setActiveMode] = useState<'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY'>(
    () => restoredWorkspace?.activeMode ?? 'DESIGN'
  );
  const [coreManifest, setCoreManifest] = useState<CoreManifest>(
    () => {
      if (!restoredWorkspace?.coreManifest) return ensureManifestCodeFrames(createInitialCoreManifest());
      // Workspaces saved before 2026-10-28 carry the old built-in starter Portal, which the
      // Architect never added. Portals now appear only once added, so that one is left out.
      const restored = restoredWorkspace.coreManifest;
      return { ...restored, portals: restored.portals.filter((portal) => portal.id !== 'portal-primary') };
    }
  );
  const [telemetry, setTelemetry] = useState<SimulationTelemetry>(() => globalSimulationEngine.getState());
  const [isFooterExpanded, setIsFooterExpanded] = useState<boolean>(true);
  // The Apothecary Cabinet opens as a window from the bottom bar's Apothecary button.
  const [isApothecaryOpen, setIsApothecaryOpen] = useState(false);

  // Apothecary Catalog State. Built-in catalogue items are merged with restored
  // user-created items so a refresh never erases the working cabinet.
  const [apothecaryCatalog, setApothecaryCatalog] = useState<ApothecaryItem[]>(
    () => restoredWorkspace?.apothecaryCatalog ?? BUILT_IN_CATALOG
  );

  // Overlay state. Exactly one overlay can be open at a time: opening one
  // replaces whatever was open, so modals never stack. The item/socket states
  // below are the payloads the open overlay reads.
  const [activeOverlay, setActiveOverlay] = useState<OverlayId>('NONE');
  const openOverlay = (id: OverlayId) => setActiveOverlay(id);
  // Closing only clears the overlay if it is still the open one, so a late
  // close from a replaced overlay never closes its successor.
  const closeOverlay = (id: OverlayId) => setActiveOverlay((current) => (current === id ? 'NONE' : current));

  const [attachingItem, setAttachingItem] = useState<ApothecaryItem | null>(null);
  const [selectedSocketId, setSelectedSocketId] = useState<string | undefined>(
    () => restoredWorkspace?.navigation.selectedSocketId
  );

  // Apothecary Studio Orb Builder payload
  const [orbBuilderTargetItem, setOrbBuilderTargetItem] = useState<ApothecaryItem | undefined>(undefined);
  
  // Drill-down Environment navigation: CORE (empty) → Orb → Satellite → Actuator.
  // Each entry is the Element centred in that Environment.
  const [environmentStack, setEnvironmentStack] = useState<ApothecaryItem[]>([]);
  const handleEnterElement = (item: ApothecaryItem) => {
    // Moving on replaces the old resume point with the new position.
    setResumeStack([]);
    setEnvironmentStack((prev) => [...prev, item]);
  };
  const popEnvironmentTo = (depth: number) => setEnvironmentStack((prev) => prev.slice(0, depth));
  const currentEnvironment = environmentStack[environmentStack.length - 1];

  // Resume point: a reload starts at the CORE root and offers, once, to return
  // to the drill-down position the Architect left. Nothing moves until they ask.
  const [resumeStack, setResumeStack] = useState<ApothecaryItem[]>(() =>
    restoredWorkspace
      ? resolveEnvironmentStack(
          restoredWorkspace.navigation.environmentIds,
          restoredWorkspace.apothecaryCatalog,
          restoredWorkspace.coreManifest.sockets
        )
      : []
  );
  const handleResume = () => {
    setActiveMode('DESIGN');
    setEnvironmentStack(resumeStack);
    setResumeStack([]);
  };

  // 3-Tier Object Inspection payload
  const [inspectingItem, setInspectingItem] = useState<ApothecaryItem | null>(null);
  const [inspectingSocket, setInspectingSocket] = useState<SocketBinding | null>(null);

  // What the Architect may add to the Luminary as context with one click. Offered, never sent on its own.
  const selectedForLuminary = inspectingItem ?? currentEnvironment ?? attachingItem ?? undefined;
  const luminarySelection = selectedForLuminary
    ? {
        label: `Selected: ${selectedForLuminary.name}`,
        // The same wording as the Knowledge Pack (P23), with its Satellites or Actuators named.
        text: describeElement(selectedForLuminary, apothecaryCatalog),
      }
    : undefined;

  const [saveStatus, setSaveStatus] = useState<WorkspaceSaveStatus>({ state: 'pending' });

  // Persist the architectural workspace, not transient modal/selection state.
  // This preserves placed Elements, active Relations, Portals, hardware settings,
  // contracts and custom Apothecary entries across a normal browser refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const snapshot: PersistedWorkspace = {
      version: 2,
      activeMode,
      coreManifest,
      apothecaryCatalog,
      navigation: {
        // Until the Architect resumes or moves, keep the position they left so
        // a second reload still offers it.
        environmentIds: (environmentStack.length > 0 ? environmentStack : resumeStack).map((el) => el.id),
        selectedSocketId
      }
    };

    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
      setSaveStatus({ state: 'saved', at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (error) {
      console.warn('[WORKSPACE] Workspace could not be persisted.', error);
      setSaveStatus({ state: 'failed' });
    }
  }, [activeMode, coreManifest, apothecaryCatalog, environmentStack, resumeStack, selectedSocketId]);

  // Persist sanitized connection events to the append-only evidence archive and
  // restore their read-only history after the archive has been verified on load.
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeConnectionEvents((event) => {
      void appendConnectionEventEvidence(event).catch((error) => {
        globalSimulationEngine.addLog('ERROR', `[CONNECTION EVENT SHORTFALL] ${error instanceof Error ? error.message : 'Event could not be archived'}`);
      });
    });
    readEvidenceArchive()
      .then((records) => {
        if (active) {
          const events = records
            .filter((record) => record.kind === 'CONNECTION_EVENT')
            .map((record) => record.payload as ConnectionEvent);
          restoreConnectionEvents(events);
        }
        if (active && records.length > 0) {
          const eventCount = records.filter((record) => record.kind === 'CONNECTION_EVENT').length;
          globalSimulationEngine.addLog('SUCCESS', `[EVIDENCE REPLAY VERIFIED] ${records.length} record(s), ${eventCount} connection event(s)`);
        }
      })
      .catch((error) => {
        if (active) {
          globalSimulationEngine.addLog('ERROR', `[EVIDENCE INTEGRITY SHORTFALL] ${error instanceof Error ? error.message : 'Archive verification failed'}`);
        }
      });
    return () => { active = false; unsubscribe(); };
  }, []);

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
  const handleCommitHandshake = async (
    item: ApothecaryItem,
    targetSocketId: string,
    contract: RelationContract
  ) => {
    // Architectural guard: only an Orb carries the Umbilical handshake code, so
    // only an Orb may ever be bound to a socket. This is the universal bind
    // chokepoint, so the invariant holds no matter which path opened the modal.
    if (!isOrbItem(item)) {
      globalSimulationEngine.addLog(
        'WARN',
        `[UMBILICAL] ${item.name} is a ${item.category}, not an Orb — only Orbs carry the handshake code for the Umbilical.`
      );
      setAttachingItem(null);
      closeOverlay('HANDSHAKE');
      return;
    }

    await appendRelationContractEvidence(contract);
    const itemWithCodeFrame = ensureElementCodeFrame(item);
    setCoreManifest((prev) => {
      const updatedSockets = prev.sockets.map((s) => {
        if (s.id === targetSocketId) {
          return {
            ...s,
            state: 'Active' as const,
            connectedItem: itemWithCodeFrame,
            contractId: contract.contractId,
            resolvedProfileId: contract.resolvedProfileId,
            resolvedProfileVersion: contract.resolvedProfileVersion
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
    closeOverlay('HANDSHAKE');
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

  // Click Vacant Socket -> Opens Apothecary Studio Orb Builder focused on socket
  const handleSelectSocket = (socket: SocketBinding, item?: ApothecaryItem) => {
    setSelectedSocketId(socket.id);
    setOrbBuilderTargetItem(item || socket.connectedItem || undefined);
    openOverlay('ORB_BUILDER');
  };

  // Direct 3D Drag-and-Drop Drop -> Opens Handshake Execution Modal Directly.
  // Only an Orb can handshake with the Umbilical, so a non-Orb never even opens
  // the modal.
  const handleDropAttachItem = (item: ApothecaryItem, targetSocketId: string) => {
    if (!isOrbItem(item)) {
      globalSimulationEngine.addLog(
        'WARN',
        `[UMBILICAL] ${item.name} is a ${item.category}, not an Orb — only Orbs handshake with the Umbilical.`
      );
      return;
    }
    setSelectedSocketId(targetSocketId);
    setAttachingItem(item);
    openOverlay('HANDSHAKE');
  };

  // Tether a Satellite to the Orb docked at a socket. Unlike docking an Orb this
  // needs no handshake — a Satellite operates through its host rather than
  // crossing the CORE boundary itself, so it binds directly.
  const handleAttachSatellite = (satellite: ApothecaryItem, hostSocketId: string) => {
    const satelliteWithCodeFrame = ensureElementCodeFrame(satellite);
    setCoreManifest((prev) => ({
      ...prev,
      sockets: prev.sockets.map((s) => {
        if (s.id !== hostSocketId || !s.connectedItem) return s;
        const existing = s.attachedSatellites ?? [];
        if (existing.some((sat) => sat.id === satellite.id)) return s;
        return { ...s, attachedSatellites: [...existing, satelliteWithCodeFrame] };
      })
    }));

    globalSimulationEngine.addLog(
      'SUCCESS',
      `[SATELLITE TETHERED] ${satelliteWithCodeFrame.name} attached to host orb at ${hostSocketId}`
    );
  };

  // Click a Satellite -> opens the same 3-tier inspector used for Orbs, so a
  // satellite gets its manifest, editable properties and code window.
  const handleSelectSatellite = (satellite: ApothecaryItem) => {
    const host = coreManifest.sockets.find(
      (s) => s.attachedSatellites?.some((sat) => sat.id === satellite.id)
    );
    setInspectingSocket(host || null);
    setInspectingItem(satellite);
    openOverlay('INSPECT_MANIFEST');
  };

  // Drop a Portal from the Apothecary -> place a new boundary gateway in the
  // next free slot. Slots are offset 22.5 degrees from the arms so a Portal
  // never lands on top of an umbilical.
  const handleAddPortal = () => {
    setCoreManifest((prev) => {
      const angle = nextFreePortalAngle(prev.portals);
      if (angle === null) {
        globalSimulationEngine.addLog('WARN', '[PORTAL] All 8 boundary slots occupied.');
        return prev;
      }
      const id = `portal-${Date.now().toString(36)}`;
      globalSimulationEngine.addLog('SUCCESS', `[PORTAL PLACED] Gateway ${id} at ${angle} degrees`);
      return {
        ...prev,
        portals: [...prev.portals, { id, name: 'Prismatic Iris Portal', angleDeg: angle }]
      };
    });
  };

  // Right-Click Element Inspector Handler (Triggers Tier 1 Manifest Modal)
  const handleRightClickElement = (socket?: SocketBinding, item?: ApothecaryItem) => {
    setInspectingSocket(socket || null);
    setInspectingItem(item || socket?.connectedItem || null);
    openOverlay('INSPECT_MANIFEST');
  };

  // Save updated element properties / manifest JSON
  const handleSaveInspectedItem = (updatedItem: ApothecaryItem) => {
    setCoreManifest((prev) => {
      return {
        ...prev,
        sockets: prev.sockets.map((socket) => replaceElementInSocket(socket, updatedItem))
      };
    });

    setApothecaryCatalog((prev) => prev.map((catalogItem) => replaceElementById(catalogItem, updatedItem)));
    setInspectingItem(updatedItem);
    globalSimulationEngine.addLog('SUCCESS', `[MANIFEST RE-VALIDATION SUCCESS] Updated ${updatedItem.name} specs & contracts.`);
  };

  const handleSaveInspectedCodeFrame = (updatedItem: ApothecaryItem) => {
    setCoreManifest((prev) => ({
      ...prev,
      sockets: prev.sockets.map((socket) => replaceElementInSocket(socket, updatedItem))
    }));

    setApothecaryCatalog((prev) => prev.map((catalogItem) => replaceElementById(catalogItem, updatedItem)));
    setInspectingItem(updatedItem);
    globalSimulationEngine.addLog('SUCCESS', `[CODE FRAME SAVED] Updated functional source for ${updatedItem.name}.`);
  };

  const ensureCustomOrbContract = (item: ApothecaryItem): ApothecaryItem => {
    let prepared = item;
    if (item.category === 'Orbs' && !item.umbilicalContractRef && item.umbilicalProfileId) {
      const reference = registerCustomOrbManifest(item, item.umbilicalProfileId);
      const manifest = getRegisteredOrbManifest(reference);
      prepared = {
        ...item,
        memoryReq: manifest?.resources.memoryMB ?? item.memoryReq,
        umbilicalContractRef: reference
      };
      if (manifest) {
        setCoreManifest((previous) => {
          const library = previous.orbManifestLibrary ?? [];
          if (library.some(entry => entry.id === manifest.id && entry.version === manifest.version)) return previous;
          return { ...previous, orbManifestLibrary: [...library, manifest] };
        });
      }
    }
    return ensureElementCodeFrame(prepared);
  };

  // Save custom configured Orb to Apothecary Palette Catalog
  const handleSaveToCatalog = (customItem: ApothecaryItem) => {
    const customItemWithCodeFrame = ensureCustomOrbContract(customItem);
    setApothecaryCatalog((prev) => {
      const exists = prev.some(i => i.id === customItemWithCodeFrame.id);
      if (exists) {
        return prev.map(i => i.id === customItemWithCodeFrame.id ? customItemWithCodeFrame : i);
      }
      return [customItemWithCodeFrame, ...prev];
    });

    closeOverlay('ORB_BUILDER');
    globalSimulationEngine.addLog('SUCCESS', `[APOTHECARY CATALOG] Saved custom Orb [${customItemWithCodeFrame.name}] to palette.`);
  };

  const handleSynthesizeOrb = (customItem: ApothecaryItem) => {
    const customItemWithCodeFrame = ensureCustomOrbContract(customItem);
    setApothecaryCatalog((prev) => [customItemWithCodeFrame, ...prev]);
    closeOverlay('RELIQUARY');
    globalSimulationEngine.addLog('SUCCESS', `[ALCHEMIST SYNTHESIS] Created new custom orb: ${customItemWithCodeFrame.name}`);
  };

  // Explicit Handshake Initiation from Apothecary Studio
  const handleInitiateHandshakeFromBuilder = (item: ApothecaryItem, targetSocketId: string) => {
    setSelectedSocketId(targetSocketId);
    setAttachingItem(ensureCustomOrbContract(item));
    openOverlay('HANDSHAKE');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080b10] text-slate-100 font-sans select-none">
      {/* 1. 3D WebGL Canvas Layer */}
      <ThreeCanvas
        sockets={coreManifest.sockets}
        selectedSocketId={selectedSocketId}
        activeMode={activeMode}
        onSelectSocket={handleSelectSocket}
        onEnterElement={handleEnterElement}
        onDropAttachItem={handleDropAttachItem}
        onAttachSatellite={handleAttachSatellite}
        onSelectSatellite={handleSelectSatellite}
        portals={coreManifest.portals}
        onAddPortal={handleAddPortal}
        onRightClickElement={handleRightClickElement}
      />

      {/* 2. UI Overlay Controls */}
      <Header
        activeMode={activeMode}
        onSelectMode={(mode) => setActiveMode(mode)}
        hardwareBudget={coreManifest.hardwareBudget}
        onOpenCoreMatrix={() => openOverlay('CORE_MATRIX')}
      />

      {/* Mode View overlays or side drawers */}
      {activeMode === 'DESIGN' && environmentStack.length === 0 && (
        <>
          <ElementRail
            catalog={apothecaryCatalog}
            onSelectItem={(item) => {
              setOrbBuilderTargetItem(item);
              openOverlay('ORB_BUILDER');
            }}
            onRightClickItem={(item) => {
              setInspectingItem(item);
              setInspectingSocket(null);
              openOverlay('INSPECT_MANIFEST');
            }}
          />

          <LeftDrawer
            catalog={apothecaryCatalog}
            isOpen={isApothecaryOpen}
            onClose={() => setIsApothecaryOpen(false)}
            isFooterExpanded={isFooterExpanded}
            onSelectAttachItem={(item) => {
              setOrbBuilderTargetItem(item);
              openOverlay('ORB_BUILDER');
            }}
            onRightClickItem={(item) => {
              setInspectingItem(item);
              setInspectingSocket(null);
              openOverlay('INSPECT_MANIFEST');
            }}
            onOpenOrbBuilder={() => {
              setOrbBuilderTargetItem(undefined);
              openOverlay('ORB_BUILDER');
            }}
          />

          <RightPanel
            catalog={apothecaryCatalog}
            isFooterExpanded={isFooterExpanded}
            telemetry={telemetry}
            coreManifest={coreManifest}
            onSetPressure={(p) => globalSimulationEngine.setEnvironmentalPressure(p)}
            onSelectAttachItem={(item) => {
              setOrbBuilderTargetItem(item);
              openOverlay('ORB_BUILDER');
            }}
            selectedItem={attachingItem || coreManifest.sockets.find(s => s.connectedItem)?.connectedItem}
          />
        </>
      )}

      {/* Drill-down Element Environment (Orb → Satellites, Satellite → Actuators) */}
      {activeMode === 'DESIGN' && currentEnvironment && (
        <div className="absolute inset-0 z-10 bg-[#05070c]">
          <EnvironmentView
            center={currentEnvironment}
            children={getElementChildren(currentEnvironment, apothecaryCatalog)}
            onEnterChild={handleEnterElement}
          />

          {/* Back control beside the content; the full path lives in the Wayfinder. */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 font-mono">
            <button
              onClick={() => popEnvironmentTo(environmentStack.length - 1)}
              className="mr-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/20"
            >
              ← Back
            </button>
            <span className="px-2 py-1 text-[10px] font-bold tracking-wide text-cyan-200">{currentEnvironment.name}</span>
          </div>
        </div>
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
        saveStatus={saveStatus}
        wayfinder={
          <Wayfinder
            mode={activeMode}
            path={environmentStack.map((el) => el.name)}
            task={describeCurrentTask({
              mode: activeMode,
              environmentStack,
              childCount: currentEnvironment ? getElementChildren(currentEnvironment, apothecaryCatalog).length : 0,
              dockedOrbCount: coreManifest.sockets.filter((s) => s.connectedItem).length
            })}
            onNavigate={popEnvironmentTo}
          />
        }
        onSetPressure={(p) => globalSimulationEngine.setEnvironmentalPressure(p)}
        onValidateCore={() => runComprehensiveCoreAudit(coreManifest)}
        showTelemetryDeck={isFooterExpanded}
        onToggleTelemetryDeck={() => setIsFooterExpanded(!isFooterExpanded)}
        isApothecaryOpen={isApothecaryOpen && activeMode === 'DESIGN' && environmentStack.length === 0}
        onToggleApothecary={() => {
          if (activeMode !== 'DESIGN') setActiveMode('DESIGN');
          if (environmentStack.length > 0) popEnvironmentTo(0);
          setIsApothecaryOpen((open) => !(open && activeMode === 'DESIGN' && environmentStack.length === 0));
        }}
        onOpenReliquary={() => openOverlay('RELIQUARY')}
        onOpenBrowser={() => {
          openOverlay('BROWSER');
        }}
        onExportCore={() => {
          const blob = new Blob([JSON.stringify(coreManifest, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${coreManifest.name.toLowerCase().replace(/\s+/g, '-')}-manifest.json`;
          a.click();
        }}
      />

      {resumeStack.length > 0 && environmentStack.length === 0 && (
        <div
          role="status"
          className="fixed top-[72px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-400/40 font-mono text-[10px] shadow-[0_0_15px_rgba(0,243,255,0.2)]"
        >
          <span className="text-slate-300">
            Left off at <span className="text-cyan-200 font-bold">CORE › {resumeStack.map((el) => el.name).join(' › ')}</span>
          </span>
          <button
            onClick={handleResume}
            className="px-2.5 py-1 rounded-full font-bold tracking-wide text-cyan-100 bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30"
          >
            Resume where you left off
          </button>
          <button
            onClick={() => setResumeStack([])}
            aria-label="Dismiss resume"
            className="px-1.5 py-1 rounded-full text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Luminary presence: app level, so it survives every mode and drill-down. */}
      <LuminaryHost mode={activeMode} selection={luminarySelection} nameOf={(id) => apothecaryCatalog.find((item) => item.id === id)?.name} />

      {/* 3. Interactive Modals */}
      {activeOverlay === 'HANDSHAKE' && attachingItem && (
        <HandshakeModal
          item={attachingItem}
          availableSockets={coreManifest.sockets}
          availableCoreCapabilities={getCoreRuntimeCapabilities(coreManifest)}
          availableCoreResources={getAvailableCoreResources(coreManifest)}
          initialTargetSocketId={selectedSocketId}
          onClose={() => {
            setAttachingItem(null);
            closeOverlay('HANDSHAKE');
          }}
          onCommitHandshake={handleCommitHandshake}
        />
      )}

      {activeOverlay === 'CORE_MATRIX' && (
        <CoreMatrixModal
          hardwareBudget={coreManifest.hardwareBudget}
          activeDaemons={coreManifest.activeDaemons}
          onUpdateHardwareBudget={handleUpdateHardwareBudget}
          onToggleDaemon={handleToggleDaemon}
          onClose={() => closeOverlay('CORE_MATRIX')}
        />
      )}

      {/* 4. Apothecary Studio — Orb & Satellite Builder Modal */}
      {activeOverlay === 'ORB_BUILDER' && (
        <OrbBuilderModal
          initialItem={orbBuilderTargetItem}
          targetSocketId={selectedSocketId}
          availableSockets={coreManifest.sockets}
          onClose={() => closeOverlay('ORB_BUILDER')}
          onSaveToCatalog={handleSaveToCatalog}
          onInitiateHandshake={handleInitiateHandshakeFromBuilder}
        />
      )}

      {activeOverlay === 'RELIQUARY' && (
        <AlchemistReliquaryModal
          onClose={() => closeOverlay('RELIQUARY')}
          onSynthesize={handleSynthesizeOrb}
        />
      )}

      {activeOverlay === 'BROWSER' && (
        <BuiltInBrowserModal
          onClose={() => closeOverlay('BROWSER')}
        />
      )}

      {/* 5. 3-Tier Object Inspection & Editing Modals */}
      {activeOverlay === 'INSPECT_MANIFEST' && (
        <ViewContentsModal
          item={inspectingItem || undefined}
          socket={inspectingSocket || undefined}
          onClose={() => closeOverlay('INSPECT_MANIFEST')}
          onOpenEditProperties={() => openOverlay('INSPECT_PROPERTIES')}
          onOpenCodeEditor={() => openOverlay('INSPECT_CODE')}
        />
      )}

      {activeOverlay === 'INSPECT_PROPERTIES' && (
        <EditObjectModal
          item={inspectingItem || undefined}
          socket={inspectingSocket || undefined}
          onClose={() => closeOverlay('INSPECT_PROPERTIES')}
          onSaveProperties={(updated) => {
            handleSaveInspectedItem(updated);
            closeOverlay('INSPECT_PROPERTIES');
          }}
          onOpenCodeEditor={() => openOverlay('INSPECT_CODE')}
        />
      )}

      {activeOverlay === 'INSPECT_CODE' && (
        <CodeEditorOverlayModal
          item={inspectingItem || undefined}
          socket={inspectingSocket || undefined}
          onClose={() => closeOverlay('INSPECT_CODE')}
          onSaveCodeFrame={(updated) => {
            handleSaveInspectedCodeFrame(updated);
          }}
        />
      )}
    </div>
  );
}

export default App;
