import { ApplicationProduction } from './components/ApplicationProduction';
import { AppBuildJourney } from './components/AppBuildJourney';
import { buildItemFocus, isBuildPlan, nextBuildItem, completeVerifiedBuildItems } from './engine/appBuildPlan';
import { setLuminaryEngaged, isLuminaryEngaged, subscribeLuminaryEngaged } from './luminary/presence';
import { AppCreationConversation } from './components/AppCreationConversation';
import { WelcomeScreen, WELCOME_SKIP_KEY } from './components/WelcomeScreen';
import { createBlankApp, connectAppProposal } from './engine/appCreation';
import React, { useState, useEffect, useSyncExternalStore } from 'react';
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
import { saveCoreProgram, saveCurrentApp } from './utils/appFiles';
import { OrbBuilderModal } from './components/OrbBuilderModal';
import { AlchemistReliquaryModal } from './components/AlchemistReliquaryModal.tsx';
import { BuiltInBrowserModal } from './components/BuiltInBrowserModal';
import { EnvironmentView } from './components/EnvironmentView';
import type { EnvironmentEntryView } from './utils/environmentScene';
import { Wayfinder } from './components/Wayfinder';
import { LuminaryHost } from './components/LuminaryHost';
import { luminaryFocus } from './luminary/focus';
import { severConnection, closeConnectionByAgreement } from './engine/connectionRuntime';
import { LuminaryBubble } from './components/LuminaryBubble';
import {
  ApothecaryItem,
  SocketBinding,
  CoreManifest,
  RelationContract,
  HardwareBudget,
  ActiveDaemons,
  DEFAULT_APOTHECARY_CATALOG,
  createInitialCoreManifest,
  planElementRemoval,
  removeElementFromManifest,
  upgradeStartingBudget,
  ensureElementCodeFrame,
  nextFreePortalAngle,
  getElementChildren,
  isOrbItem
} from './engine/relationEngine';
import { getAvailableCoreResources, getCoreRuntimeCapabilities } from './engine/coreCapabilities';
import { MODEL_CATALOG } from './engine/modelCatalog';
import { appendConnectionEventEvidence, appendRelationContractEvidence, readEvidenceArchive } from './engine/evidenceArchive';
import { describeCurrentTask } from './utils/wayfinder';
import { assertCompatibleElementEdit } from './engine/connectedElementEdit';
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
 * slipped in through the older permissive drop path â€” e.g. persisted in a saved
 * workspace â€” is vacated back to an empty socket.
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
  const [coreManifest, setCoreManifest] = useState<CoreManifest>(
    () => {
      if (!restoredWorkspace?.coreManifest) return ensureManifestCodeFrames(createBlankApp());
      // Workspaces saved before 2026-10-28 carry the old built-in starter Portal, which the
      // Architect never added. Portals now appear only once added, so that one is left out.
      // Workspaces still on an earlier starting budget move to today's, which fits all 8 sockets;
      // a budget the Architect set by hand in the CORE Matrix is kept.
      const restored = restoredWorkspace.coreManifest;
      return {
        ...restored,
        hardwareBudget: upgradeStartingBudget(restored.hardwareBudget),
        portals: restored.portals.filter((portal) => portal.id !== 'portal-primary')
      };
    }
  );
  const [isFooterExpanded, setIsFooterExpanded] = useState<boolean>(true);
  // The Apothecary Cabinet opens as a window from the bottom bar's Apothecary button.
  const [isApothecaryOpen, setIsApothecaryOpen] = useState(false);
  const [selectedBuildItem, setSelectedBuildItem] = useState<{ coreId: string; id: string } | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Apothecary Catalog State. Built-in catalogue items are merged with restored
  // user-created items so a refresh never erases the working cabinet.
  const [apothecaryCatalog, setApothecaryCatalog] = useState<ApothecaryItem[]>(
    () => restoredWorkspace?.apothecaryCatalog ?? BUILT_IN_CATALOG
  );

  // Overlay state. Exactly one overlay can be open at a time: opening one
  // replaces whatever was open, so modals never stack. The item/socket states
  // below are the payloads the open overlay reads.
  const [activeOverlay, setActiveOverlay] = useState<OverlayId>('NONE');
  const [keyboardNavExpanded, setKeyboardNavExpanded] = useState(false);
  const luminaryEngaged = useSyncExternalStore(subscribeLuminaryEngaged, isLuminaryEngaged);
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

  // Drill-down Environment navigation: CORE (empty) â†’ Orb â†’ Satellite â†’ Actuator.
  // Each entry is the Element centred in that Environment.
  const [environmentStack, setEnvironmentStack] = useState<ApothecaryItem[]>([]);
  const [environmentEntryView, setEnvironmentEntryView] = useState<EnvironmentEntryView | null>(null);
  const handleEnterElement = (item: ApothecaryItem, entryView?: EnvironmentEntryView) => {
    // Moving on replaces the old resume point with the new position.
    setResumeStack([]);
    setEnvironmentEntryView(entryView ?? null);
    setEnvironmentStack((prev) => [...prev, item]);
  };
  const popEnvironmentTo = (depth: number) => {
    setEnvironmentEntryView(null);
    setEnvironmentStack((prev) => prev.slice(0, depth));
  };
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
    setEnvironmentStack(resumeStack);
    setResumeStack([]);
  };

  // Launch lands on the welcome screen (New, Resume, Open). Actions that reload
  // into a workspace set WELCOME_SKIP_KEY so the reload goes straight in.
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    const skip = sessionStorage.getItem(WELCOME_SKIP_KEY) === 'true';
    sessionStorage.removeItem(WELCOME_SKIP_KEY);
    return !skip;
  });

  // 3-Tier Object Inspection payload
  const [inspectingItem, setInspectingItem] = useState<ApothecaryItem | null>(null);
  const [inspectingSocket, setInspectingSocket] = useState<SocketBinding | null>(null);

  // The Luminary's focus follows what is on screen (STP-0002 N57): an open Element page first,
  // then the Environment the Architect is inside. inspectingItem outlives its page, so it counts
  // only while one of its pages is open.
  const elementPageOpen = activeOverlay === 'INSPECT_MANIFEST' || activeOverlay === 'INSPECT_PROPERTIES' || activeOverlay === 'INSPECT_CODE';
  const luminarySelection = luminaryFocus(
    { openPageItem: elementPageOpen ? inspectingItem : null, currentEnvironment: currentEnvironment ?? null, attachingItem: attachingItem ?? null },
    apothecaryCatalog
  );

  const buildPlan = isBuildPlan(coreManifest.appBuildPlan) ? coreManifest.appBuildPlan : undefined;
  const buildSelection = buildPlan && selectedBuildItem?.coreId === coreManifest.coreId ? buildItemFocus(coreManifest.coreId, buildPlan, selectedBuildItem.id, luminarySelection) : undefined;

  const [saveStatus, setSaveStatus] = useState<WorkspaceSaveStatus>({ state: 'pending' });

  // Persist the architectural workspace, not transient modal/selection state.
  // This preserves placed Elements, active Relations, Portals, hardware settings,
  // contracts and custom Apothecary entries across a normal browser refresh.
  useEffect(() => {
    if (typeof window === 'undefined' || localStorage.getItem('vibe.apps.closed') === 'true') return;

    const snapshot: PersistedWorkspace = {
      version: 2,
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
      saveCurrentApp(window.localStorage);
      setSaveStatus({ state: 'saved', at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (error) {
      console.warn('[WORKSPACE] Workspace could not be persisted.', error);
      setSaveStatus({ state: 'failed' });
    }
  }, [coreManifest, apothecaryCatalog, environmentStack, resumeStack, selectedSocketId]);

  // Persist sanitized connection events to the append-only evidence archive and
  // restore their read-only history after the archive has been verified on load.
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeConnectionEvents((event) => {
      void appendConnectionEventEvidence(event).catch((error) => {
        console.error('[CONNECTION EVENT] Could not archive the event.', error);
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
      })
      .catch((error) => {
        if (active) console.error('[EVIDENCE ARCHIVE] Could not restore connection history.', error);
      });
    return () => { active = false; unsubscribe(); };
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

    setAttachingItem(null);
    closeOverlay('HANDSHAKE');
  };

  const handleUpdateHardwareBudget = (budget: HardwareBudget) => {
    setCoreManifest((prev) => ({
      ...prev,
      hardwareBudget: { ...budget, origin: 'architect' }
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
      return;
    }
    setSelectedSocketId(targetSocketId);
    setAttachingItem(item);
    openOverlay('HANDSHAKE');
  };

  // Tether a Satellite to the Orb docked at a socket. Unlike docking an Orb this
  // needs no handshake â€” a Satellite operates through its host rather than
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
        return prev;
      }
      return {
        ...prev,
        portals: [...prev.portals, { id: `portal-${Date.now().toString(36)}`, name: 'Prismatic Iris Portal', angleDeg: angle }]
      };
    });
  };

  // Right-Click Element Inspector Handler (Triggers Tier 1 Manifest Modal)
  const handleRightClickElement = (socket?: SocketBinding, item?: ApothecaryItem) => {
    setInspectingSocket(socket || null);
    setInspectingItem(item || socket?.connectedItem || null);
    openOverlay('INSPECT_MANIFEST');
  };

  // Take a placed Element off the workspace. An Orb's connection is closed by agreement of
  // both sides (the Architect asked; the CORE accepts), which gives its room back and records
  // a 'severed' moment; its tethered Satellites come off with it.
  const placedRemoval = inspectingSocket && inspectingItem ? planElementRemoval(inspectingSocket, inspectingItem.id) : undefined;
  const handleRemoveInspectedElement = () => {
    if (!inspectingSocket || !inspectingItem || !placedRemoval) return;
    const socketId = inspectingSocket.id;
    if (placedRemoval.contractId) {
      const contractId = placedRemoval.contractId;
      closeConnectionByAgreement(contractId, coreManifest.contracts.find((entry) => entry.contractId === contractId), 'Removed by the Architect');
    }
    setCoreManifest((prev) => removeElementFromManifest(prev, socketId, inspectingItem.id));
    // A resume point or open Environment inside a removed Element would lead nowhere; it stops
    // just before that Element (at the CORE when it was the first step).
    const removedIds = new Set(placedRemoval.removed.map((entry) => entry.id));
    const beforeRemoved = (stack: ApothecaryItem[]) => {
      const cut = stack.findIndex((entry) => removedIds.has(entry.id));
      return cut === -1 ? stack : stack.slice(0, cut);
    };
    setResumeStack(beforeRemoved);
    setEnvironmentStack(beforeRemoved);
    setInspectingItem(null);
    setInspectingSocket(null);
    closeOverlay('INSPECT_MANIFEST');
  };

  // Save updated element properties / manifest JSON
  const handleSaveInspectedItem = (updatedItem: ApothecaryItem) => {
    const old = apothecaryCatalog.find(item => item.id === updatedItem.id) ??
      coreManifest.sockets.flatMap(socket => [socket.connectedItem, ...(socket.attachedSatellites ?? [])]).find(item => item?.id === updatedItem.id);
    if (old) assertCompatibleElementEdit(old, updatedItem, coreManifest, apothecaryCatalog);

    setCoreManifest((prev) => {
      return {
        ...prev,
        sockets: prev.sockets.map((socket) => replaceElementInSocket(socket, updatedItem))
      };
    });

    setApothecaryCatalog((prev) => prev.map((catalogItem) => replaceElementById(catalogItem, updatedItem)));
    setInspectingItem(updatedItem);
  };

  const handleSaveInspectedCodeFrame = (updatedItem: ApothecaryItem) => {
    const old = apothecaryCatalog.find(item => item.id === updatedItem.id) ??
      coreManifest.sockets.flatMap(socket => [socket.connectedItem, ...(socket.attachedSatellites ?? [])]).find(item => item?.id === updatedItem.id);
    if (old) assertCompatibleElementEdit(old, updatedItem, coreManifest, apothecaryCatalog);

    setCoreManifest((prev) => ({
      ...prev,
      sockets: prev.sockets.map((socket) => replaceElementInSocket(socket, updatedItem))
    }));

    setApothecaryCatalog((prev) => prev.map((catalogItem) => replaceElementById(catalogItem, updatedItem)));
    setInspectingItem(updatedItem);
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
      const parentId = customItemWithCodeFrame.parentElementId;
      const linked = parentId ? prev.map(entry => entry.id !== parentId ? entry : {
        ...entry,
        ...(customItemWithCodeFrame.category === 'Satellites'
          ? { satellites: Array.from(new Set([...(entry.satellites ?? []), customItemWithCodeFrame.id])) }
          : customItemWithCodeFrame.category === 'Actuators'
            ? { actuators: Array.from(new Set([...(entry.actuators ?? []), customItemWithCodeFrame.id])) }
            : {})
      }) : prev;
      const exists = linked.some(i => i.id === customItemWithCodeFrame.id);
      if (exists) {
        return linked.map(i => i.id === customItemWithCodeFrame.id ? customItemWithCodeFrame : i);
      }
      return [customItemWithCodeFrame, ...linked];
    });

    closeOverlay('ORB_BUILDER');
  };

  const handleSynthesizeOrb = (customItem: ApothecaryItem) => {
    const customItemWithCodeFrame = ensureCustomOrbContract(customItem);
    setApothecaryCatalog((prev) => [customItemWithCodeFrame, ...prev]);
    closeOverlay('RELIQUARY');
  };

  // Explicit Handshake Initiation from Apothecary Studio
  const handleInitiateHandshakeFromBuilder = (item: ApothecaryItem, targetSocketId: string) => {
    setSelectedSocketId(targetSocketId);
    setAttachingItem(ensureCustomOrbContract(item));
    openOverlay('HANDSHAKE');
  };

  const appClosed = localStorage.getItem('vibe.apps.closed') === 'true';
  if (appClosed || welcomeOpen) return <WelcomeScreen closed={appClosed} onContinue={() => setWelcomeOpen(false)} />;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080b10] text-slate-100 font-sans select-none">
      {/* 1. 3D WebGL Canvas Layer */}
      <ThreeCanvas
        creationMode={coreManifest.appCreation === 'draft'}
        hideWorkspaceControls={keyboardNavExpanded}
        coreModel={coreManifest.appConfiguration?.crystalModel}
        sockets={coreManifest.sockets}
        selectedSocketId={selectedSocketId}
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
        hardwareBudget={coreManifest.hardwareBudget}
        availableResources={getAvailableCoreResources(coreManifest)}
        onOpenCoreMatrix={() => openOverlay('CORE_MATRIX')}
      />

      {/* Workspace tools and drawers */}
      {environmentStack.length === 0 && coreManifest.appCreation !== 'draft' && (
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
            onTalkLuminary={() => setLuminaryEngaged(true)}
            onOpenOrbBuilder={() => {
              setOrbBuilderTargetItem(undefined);
              openOverlay('ORB_BUILDER');
            }}
          />

          <RightPanel
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
            catalog={apothecaryCatalog}
            isFooterExpanded={isFooterExpanded}
            coreManifest={coreManifest}
            onSelectAttachItem={(item) => {
              setOrbBuilderTargetItem(item);
              openOverlay('ORB_BUILDER');
            }}
            selectedItem={attachingItem || coreManifest.sockets.find(s => s.connectedItem)?.connectedItem}
          />
        </>
      )}

      {/* Drill-down Element Environment (Orb â†’ Satellites, Satellite â†’ Actuators) */}
      {currentEnvironment && (
        <div className="absolute inset-0 z-10 bg-[#05070c]">
          <EnvironmentView
            center={currentEnvironment}
            children={getElementChildren(currentEnvironment, apothecaryCatalog)}
            onEnterChild={handleEnterElement}
            onInspectElement={(item) => handleRightClickElement(undefined, item)}
            entryView={environmentEntryView}
          />

          {/* Back control beside the content; the full path lives in the Wayfinder. */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 font-mono">
            <button
              onClick={() => popEnvironmentTo(environmentStack.length - 1)}
              className="mr-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/20"
            >
              â† Back
            </button>
            <span className="px-2 py-1 text-[10px] font-bold tracking-wide text-cyan-200">{currentEnvironment.name}</span>
          </div>
        </div>
      )}

      {/* Keyboard access to the same 3D Enter and Inspect handlers. */}
      {coreManifest.appCreation !== 'draft' && activeOverlay === 'NONE' && !isApothecaryOpen && <nav aria-label="Keyboard Element navigation"
        className="keyboard-nav-banner fixed top-[min(52vh,26rem)] right-2 z-20 max-h-[max(6rem,calc(100dvh-28rem))] overflow-y-auto max-w-[min(18rem,45vw)] rounded-lg border border-cyan-500/40 bg-slate-950/95 p-2 text-xs text-slate-100">
        <details onToggle={event => setKeyboardNavExpanded(event.currentTarget.open)}>
          <summary className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Navigate 3D Elements by keyboard</summary>
          <button type="button" className="block mt-2 p-1 underline" onClick={() => popEnvironmentTo(0)}>Return to CORE</button>
          {(currentEnvironment ? getElementChildren(currentEnvironment, apothecaryCatalog) :
            coreManifest.sockets.flatMap(socket => socket.connectedItem ? [socket.connectedItem] : [])).map(item =>
              <div key={item.id} className="flex flex-wrap gap-2 mt-2">
                <button type="button" className="rounded border border-cyan-500/40 p-1" onClick={() => handleEnterElement(item)}>Enter {item.name}</button>
                <button type="button" className="rounded border border-amber-500/40 p-1" onClick={() => handleRightClickElement(undefined, item)}>Inspect {item.name}</button>
              </div>)}
        </details>
      </nav>}
      {/* Footer HUD */}
      {coreManifest.appCreation !== 'draft' && <Footer
        coreManifest={coreManifest}
        onRenameCore={name => setCoreManifest(prev => ({ ...prev, name }))}
        saveStatus={saveStatus}
        wayfinder={
          <Wayfinder
            path={environmentStack.map((el) => el.name)}
            task={describeCurrentTask({
              environmentStack,
              childCount: currentEnvironment ? getElementChildren(currentEnvironment, apothecaryCatalog).length : 0,
              dockedOrbCount: coreManifest.sockets.filter((s) => s.connectedItem).length
            })}
            onNavigate={popEnvironmentTo}
          />
        }
        showTelemetryDeck={isFooterExpanded}
        onToggleTelemetryDeck={() => setIsFooterExpanded(!isFooterExpanded)}
        isApothecaryOpen={isApothecaryOpen && environmentStack.length === 0}
        onToggleApothecary={() => {
          if (environmentStack.length > 0) popEnvironmentTo(0);
          setIsApothecaryOpen((open) => !(open && environmentStack.length === 0));
        }}
        isInspectorOpen={isInspectorOpen && environmentStack.length === 0}
        onToggleInspector={() => {
          if (environmentStack.length > 0) popEnvironmentTo(0);
          setIsInspectorOpen((open) => !(open && environmentStack.length === 0));
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
      />}

      {resumeStack.length > 0 && environmentStack.length === 0 && (
        <div
          role="status"
          className="fixed top-[72px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-400/40 font-mono text-[10px] shadow-[0_0_15px_rgba(0,243,255,0.2)]"
        >
          <span className="text-slate-300">
            Left off at <span className="text-cyan-200 font-bold">CORE â€º {resumeStack.map((el) => el.name).join(' â€º ')}</span>
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
            âœ•
          </button>
        </div>
      )}

      {/* Luminary presence: app level, so it survives every mode and drill-down. */}
      {coreManifest.appCreation !== 'draft' && <LuminaryBubble />}
      {coreManifest.appCreation === 'draft' && <button type="button" aria-label="Luminary — Click to talk" onClick={() => { const input=document.querySelector<HTMLTextAreaElement>('#app-idea'); input?.focus(); input?.scrollIntoView({block:'nearest'}); }} className="fixed bottom-5 right-5 z-50 rounded-xl border border-amber-400/50 bg-slate-950 px-4 py-3 text-left text-amber-100 shadow-lg focus-visible:ring-2 focus-visible:ring-amber-300"><span className="block text-sm font-bold">Luminary</span><span className="block text-xs">Click to talk</span></button>}
      {coreManifest.appCreation === 'draft' && <AppCreationConversation catalog={apothecaryCatalog} onAccept={async (proposal, decisions) => {
        const built = connectAppProposal(proposal, coreManifest, apothecaryCatalog, decisions);
        try {
          for (const contract of built.manifest.contracts) await appendRelationContractEvidence(contract);
        } catch (error) {
          for (const contract of built.manifest.contracts) { try { severConnection(contract.contractId, 'App creation evidence could not be saved', { initiatorConsent: true, receptorConsent: true }); } catch { /* Preserve evidence error. */ } }
          throw error;
        }
        setApothecaryCatalog(built.catalog);
        setCoreManifest(built.manifest);
      }} />}
      <div ref={node => { if (node) node.inert = activeOverlay !== 'NONE' || coreManifest.appCreation === 'draft' || (isApothecaryOpen && !luminaryEngaged); }} aria-hidden={activeOverlay !== 'NONE' || coreManifest.appCreation === 'draft' || (isApothecaryOpen && !luminaryEngaged)}><LuminaryHost creatingApp={coreManifest.appCreation === 'draft'} docked={activeOverlay === 'CORE_MATRIX'} mode="DESIGN" selection={buildSelection ?? luminarySelection} nameOf={(id) => apothecaryCatalog.find((item) => item.id === id)?.name} /></div>

      {coreManifest.appCreation !== 'draft' && <ApplicationProduction key={`production:${coreManifest.coreId}`} core={coreManifest} catalog={apothecaryCatalog} onVerified={receipt => setCoreManifest(current => current.coreId===coreManifest.coreId && current.appBuildPlan ? {...current,appBuildPlan:completeVerifiedBuildItems(current.appBuildPlan,receipt)} : current)} onSaveCore={application => {
        saveCoreProgram(window.localStorage, application);
        setCoreManifest(current => current.coreId === coreManifest.coreId ? { ...current, application } : current);
      }} onRemember={pointer => setCoreManifest(current => current.coreId === coreManifest.coreId ? { ...current, applicationProduction: pointer } : current)} />}
      {coreManifest.appCreation !== 'draft' && buildPlan && <AppBuildJourney key={`journey:${coreManifest.coreId}`} coreId={coreManifest.coreId} plan={buildPlan} keyboardNavExpanded={keyboardNavExpanded} isApothecaryOpen={isApothecaryOpen && environmentStack.length === 0}
        onChange={plan => setCoreManifest(current => current.coreId === coreManifest.coreId ? { ...current, appBuildPlan: plan } : current)}
        onSelect={id => { setEnvironmentStack([]); setActiveOverlay('NONE'); setIsApothecaryOpen(true); setSelectedBuildItem({ coreId: coreManifest.coreId, id }); setLuminaryEngaged(true); }}
        onApothecary={() => {
          setEnvironmentStack([]); setActiveOverlay('NONE'); setIsApothecaryOpen(true);
          const next = nextBuildItem(buildPlan, selectedBuildItem?.coreId === coreManifest.coreId ? selectedBuildItem.id : undefined);
          if (next) setSelectedBuildItem({ coreId: coreManifest.coreId, id: next.id });
          setLuminaryEngaged(true);
        }} />}
      {coreManifest.appBuildPlan !== undefined && !buildPlan && <p role="alert" className="fixed top-28 left-4 z-40 max-w-sm rounded-xl bg-slate-950 p-4 text-sm text-amber-100">The saved ToDo list could not be read. Your Workspace is retained. Restore a valid app export before continuing its build list.</p>}
      {/* 3. Interactive Modals */}
      {activeOverlay === 'HANDSHAKE' && attachingItem && (
        <HandshakeModal
          item={attachingItem}
          availableSockets={coreManifest.sockets}
          availableCoreCapabilities={getCoreRuntimeCapabilities(coreManifest)}
          availableCoreResources={getAvailableCoreResources(coreManifest)}
          coreManifest={coreManifest}
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
          manifest={coreManifest}
          onUpdateApp={(patch) => setCoreManifest(previous => ({ ...previous, ...patch }))}
          onUpdateHardwareBudget={handleUpdateHardwareBudget}

          onClose={() => closeOverlay('CORE_MATRIX')}
        />
      )}

      {/* 4. Apothecary Studio â€” Orb & Satellite Builder Modal */}
      {activeOverlay === 'ORB_BUILDER' && (
        <OrbBuilderModal
          initialItem={orbBuilderTargetItem}
          targetSocketId={selectedSocketId}
          availableSockets={coreManifest.sockets}
          catalog={apothecaryCatalog}
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
          removal={placedRemoval ? {
            hostName: inspectingSocket?.connectedItem?.id !== inspectingItem?.id ? inspectingSocket?.connectedItem?.name : undefined,
            tethered: placedRemoval.removed.slice(1).map((entry) => entry.name),
            onRemove: handleRemoveInspectedElement
          } : undefined}
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
          catalog={apothecaryCatalog}
          onSaveCodeFrame={(updated) => {
            handleSaveInspectedCodeFrame(updated);
          }}
        />
      )}
    </div>
  );
}

export default App;
