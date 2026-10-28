import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Aether } from '../engine/Aether';
import {
  SocketBinding,
  ApothecaryItem,
  PortalPlacement,
  getItem3DTaxonomy,
  isSatelliteItem,
  isOrbItem,
  SATELLITE_DRAG_TYPE,
  ORB_DRAG_TYPE
} from '../engine/relationEngine';
import {
  preloadAllGltfModels,
  ALL_MODEL_KEYS,
  getModelStatus,
  subscribeModelStatus,
  retryModel,
} from '../utils/gltfLoaderService';
import {
  QUALITY_PRESETS,
  QUALITY_PRESET_ORDER,
  QUALITY_PRESET_LABELS,
  DEFAULT_QUALITY_PRESET,
  effectivePixelRatio,
  prefersReducedMotion,
  type QualityPreset,
} from '../utils/viewQuality';
import {
  createSpatialEdits,
  setOverride,
  clearOverride,
  clearAll,
  undo,
  redo,
  canUndo,
  canRedo,
  getOverride,
  snapPositionToGrid,
  serializeSpatialEdits,
  deserializeSpatialEdits,
  type SpatialEdits,
} from '../utils/spatialEdits';
import {
  frameBounds,
  lerpPose,
  easeInOutCubic,
  poseFromCamera,
  applyPoseToCamera,
  createSavedViews,
  saveView,
  getView,
  deleteView,
  listViewNames,
  serializeSavedViews,
  deserializeSavedViews,
  type CameraPose,
  type SavedViews,
} from '../utils/cameraNav';
import {
  createCoreCrystalMesh,
  CORE_CRYSTAL_VARIANTS,
  createAegisElementMesh,
  createOrb3DNode,
  createOrbVariantMesh,
  modelKeyForItem,
  createUmbilicalConduit,
  UMBILICAL_VARIANTS,
  UMBILICAL_SEVERED,
  getUmbilicalTipVector,
  getUmbilicalTipPosition
} from '../utils/meshBuilders';
import { FreeBodyState, LayoutPresets, getNearestVacantSocket } from '../engine/antigravity';
import { createDynamicUmbilical, createDynamicTether } from '../utils/splineBuilder';
import { createElementTotem, createPortalTotem, createCoreTotem } from '../three/elementTotem';
import { createLuminaryPresence } from '../three/luminaryPresence';
import { isLuminaryEngaged, setLuminaryEngaged } from '../luminary/presence';
import { createSceneOwnedAdapter, ThreeRuntime, type ContextLossRecoveryContract, type SceneRegistryEntry } from '../three';

interface ThreeCanvasProps {
  sockets: SocketBinding[];
  portals?: PortalPlacement[];
  onSelectSocket: (socket: SocketBinding, item?: ApothecaryItem) => void;
  /** Click a docked Orb or a Satellite to drill into its Environment. */
  onEnterElement?: (item: ApothecaryItem) => void;
  onDropAttachItem?: (item: ApothecaryItem, targetSocketId: string) => void;
  onRightClickElement?: (socket?: SocketBinding, item?: ApothecaryItem) => void;
  onAttachSatellite?: (satellite: ApothecaryItem, hostSocketId: string) => void;
  onSelectSatellite?: (satellite: ApothecaryItem) => void;
  onAddPortal?: () => void;
  selectedSocketId?: string;
  activeMode: 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY';
  // New props for dynamic lighting control
  ambientIntensity?: number;
  directionalIntensity?: number;
  directionalAngle?: number;
}

// A valid registered GLB model key, derived from the loader's key list so the
// retry path stays typed without re-importing the URL map.
type ModelKey = (typeof ALL_MODEL_KEYS)[number];

// Radial distance from the CORE at which an Orb docks on its umbilical arm.
// Extended outward (from the original 6.5) so Orbs sit further from the CORE
// Crystal; the umbilical conduit and drag-snap targets follow this value.
const ORB_DOCK_Z = 8.0;

// The 8 CORE boundary compass points (cardinal + intercardinal). Portals are
// anchored to these fixed world directions; they spin in place but never move
// off their point and are not draggable.
const PORTAL_COMPASS_POINTS: Array<{ angleDeg: number; dir: string }> = [
  { angleDeg: 0, dir: 'N' },
  { angleDeg: 45, dir: 'NE' },
  { angleDeg: 90, dir: 'E' },
  { angleDeg: 135, dir: 'SE' },
  { angleDeg: 180, dir: 'S' },
  { angleDeg: 225, dir: 'SW' },
  { angleDeg: 270, dir: 'W' },
  { angleDeg: 315, dir: 'NW' },
];

// One glowing colour per umbilical socket ring, cycled by arm index.
const UMBILICAL_RING_COLORS = [
  0x00f3ff, // cyan
  0x00ff9d, // emerald
  0xa855f7, // violet
  0xffb000, // amber
  0xff2a6d, // rose
  0x00a2ff, // azure
  0x14b8a6, // teal
  0x9dff3c  // lime
];

/**
 * Soft radial dot used as the point sprite for stars. THREE.PointsMaterial draws
 * hard squares by default; mapping this gives round, glowing specks instead.
 */
function createStarSpriteTexture(): THREE.CanvasTexture {
  const S = 128; // finer sheet: a 3-stop gradient on 64px showed banding rings
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    // Gaussian falloff sampled across many stops, tapered by (1 - t) so alpha
    // reaches exactly 0 at the rim. Hitting true zero is what removes the faint
    // square edge; the smooth curve is what removes the banded "divider".
    const STOPS = 24;
    for (let i = 0; i <= STOPS; i++) {
      const t = i / STOPS;
      const alpha = Math.exp(-3.5 * t * t) * (1 - t);
      g.addColorStop(t, `rgba(255, 255, 255, ${alpha.toFixed(4)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * A socket ring rendered as fluid light rather than solid geometry: a hot thin
 * core wrapped in nested additive shells whose opacity follows a Gaussian
 * falloff. Three discrete shells banded for the same reason a 3-stop gradient
 * banded the stars, so the count is high enough that the steps read continuous.
 *
 * Everything is MeshBasicMaterial + AdditiveBlending with depthWrite off, so the
 * ring emits light instead of reflecting it and never occludes what's behind it.
 */
function createGlowRing(radius: number, color: number, boost = 1): THREE.Group {
  const group = new THREE.Group();
  // More, thinner shells than before: doubling the count halves the visible
  // step between them, which is what turns a layered look into a fluid one.
  // Per-shell opacity is scaled down to match so total brightness is unchanged.
  const SHELLS = 16;
  const coreTube = radius * 0.11;
  const maxTube = radius * 0.95; // bleed reaches ~2x the ring radius
  const FALLOFF = 2.4; // gentler than 3.0 — longer tail, softer edge

  const addShell = (tube: number, opacity: number, segments: number) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, segments),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: Math.min(1, opacity * boost),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    mesh.userData = { proceduralGeometry: true, ownedMaterial: true, baseOpacity: opacity };
    group.add(mesh);
  };

  addShell(coreTube, 0.72, 48);
  for (let i = 1; i <= SHELLS; i++) {
    const t = i / SHELLS;
    addShell(coreTube + (maxTube - coreTube) * t, Math.exp(-FALLOFF * t * t) * (1 - t) * 0.17, 32);
  }

  return group;
}

/** Recolours a glow ring in place, preserving each shell's falloff opacity. */
function tintGlowRing(ring: THREE.Object3D, color: number, boost = 1) {
  ring.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    if (typeof mesh.userData.baseOpacity === 'number') {
      mat.opacity = Math.min(1, mesh.userData.baseOpacity * boost);
    }
  });
}

function createGhostMesh(geometryType: string, color: number): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  switch (geometryType) {
    case 'octahedron':
      geo = new THREE.OctahedronGeometry(0.55); break;
    case 'cube':
      geo = new THREE.BoxGeometry(0.7, 0.7, 0.7); break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16); break;
    case 'dodecahedron':
      geo = new THREE.DodecahedronGeometry(0.55); break;
    case 'tetrahedron':
      geo = new THREE.TetrahedronGeometry(0.65); break;
    case 'sphere':
    default:
      geo = new THREE.SphereGeometry(0.55, 24, 24); break;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85
  });

  const mesh = new THREE.Mesh(geo, mat);

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.05);
  mesh.add(wireMesh);

  return mesh;
}

// Satellite sub-node mesh generator (GLTF model with Platonic solids fallback)
function createSatelliteMesh(satelliteClass: string): THREE.Object3D {
  let classIndex = 1;
  switch (satelliteClass) {
    case 'I/O': classIndex = 1; break;
    case 'Compute': classIndex = 2; break;
    case 'Storage': classIndex = 3; break;
    case 'Validation': classIndex = 4; break;
    case 'Security': classIndex = 5; break;
    default: classIndex = 1; break;
  }

  const elemGroup = createAegisElementMesh('satellite', classIndex);
  if (elemGroup.children.length > 0) {
    elemGroup.scale.set(0.25, 0.25, 0.25);
    return elemGroup;
  }

  let geo: THREE.BufferGeometry;
  let color = 0x00f3ff;

  switch (satelliteClass) {
    case 'I/O':
      geo = new THREE.OctahedronGeometry(0.18);
      color = 0x00f3ff; break;
    case 'Compute':
      geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      color = 0xffb000; break;
    case 'Storage':
      geo = new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12);
      color = 0x00ff9d; break;
    case 'Validation':
      geo = new THREE.DodecahedronGeometry(0.18);
      color = 0xa855f7; break;
    case 'Security':
    default:
      geo = new THREE.TetrahedronGeometry(0.2);
      color = 0xff2a6d; break;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1.0,
    roughness: 0.2,
    metalness: 0.3
  });

  return new THREE.Mesh(geo, mat);
}



/**
 * Disposes one detached subtree with the borrowed-GLB-safe discipline: GLTF
 * clones share geometry AND materials with the cached source model, so disposing
 * those would corrupt every later clone. Only geometry we generated procedurally
 * is disposed; materials are disposed only when they were cloned for this
 * instance (userData.ownedMaterial). Call AFTER removing the object from its
 * parent — this does not detach it from the scene graph, only frees its GPU
 * resources and any CSS2D DOM it owns.
 */
function disposeRebuildableObject(root: THREE.Object3D) {
  root.traverse((node) => {
    // CSS2D Element Totems own a DOM node the WebGL renderer never touches;
    // detach it explicitly so a rebuild does not orphan plaques in the overlay.
    const css2d = node as unknown as { isCSS2DObject?: boolean; element?: HTMLElement };
    if (css2d.isCSS2DObject && css2d.element?.parentNode) {
      css2d.element.parentNode.removeChild(css2d.element);
    }
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.proceduralGeometry) mesh.geometry?.dispose();
    if (mesh.userData.ownedMaterial) {
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

/**
 * Empties a rebuildable group, disposing each removed child with the
 * borrowed-GLB-safe discipline (see disposeRebuildableObject).
 */
function clearRebuildableGroup(group: THREE.Group, keep?: THREE.Object3D) {
  for (let i = group.children.length - 1; i >= 0; i--) {
    const child = group.children[i];
    if (child === keep) continue;
    group.remove(child);
    disposeRebuildableObject(child);
  }
}

/**
 * Overrides self-illumination for one instance, on top of the baseline the loader
 * applies to every model. Used both to lift the boundary fixtures (which sit ~3x
 * further from the point lights than anything else) and to hold the CORE Crystal
 * down (large bright surfaces drive the bloom pass hard).
 *
 * Only the intensity changes — never the colour. Flattening these to a single
 * tint would destroy the prismatic iridescence baked into the base colour map.
 *
 * Also forces fully opaque rendering: the glTF materials are alphaMode OPAQUE,
 * but a strong emissive under the bloom pass bleeds enough to read as see-through.
 */
function setEmissiveIntensity(root: THREE.Object3D, intensity: number) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;

    const applyTo = (src: THREE.Material) => {
      const mat = src.clone() as THREE.MeshStandardMaterial;
      if ('emissiveIntensity' in mat) mat.emissiveIntensity = intensity;
      mat.transparent = false;
      mat.opacity = 1;
      mat.depthWrite = true;
      return mat;
    };

    const src = mesh.material;
    mesh.material = Array.isArray(src) ? src.map(applyTo) : applyTo(src);
    mesh.userData.ownedMaterial = true;
  });
}

/**
 * Attachment stem (CK-04) running from the host Orb's surface out to a tethered
 * Satellite. Built as a thin emissive cylinder plus a wider additive sleeve so it
 * reads as a light conduit rather than a hard rod, matching the socket rings.
 */
function createSatelliteTether(from: THREE.Vector3, to: THREE.Vector3, color: number): THREE.Group {
  const group = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  if (length < 1e-4) return group;

  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );

  for (const shell of [
    { radius: 0.022, opacity: 0.95 },
    { radius: 0.055, opacity: 0.3 },
    { radius: 0.1, opacity: 0.12 }
  ]) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(shell.radius, shell.radius, length, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: shell.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    mesh.position.copy(mid);
    mesh.quaternion.copy(orientation);
    mesh.userData = { proceduralGeometry: true, ownedMaterial: true };
    group.add(mesh);
  }

  return group;
}

/**
 * Stable fingerprint of everything an umbilical arm's geometry is built from:
 * its ring index (drives angle, ring colour, conduit variant), socket state, the
 * docked item, and the ids of its tethered satellites. Two sockets with equal
 * signatures produce identical arms, so the reconciler can skip rebuilding an arm
 * whose signature has not changed instead of tearing down and re-cloning all
 * eight on every socket-state change.
 */
function armSignature(s: SocketBinding, index: number): string {
  return [
    index,
    s.state,
    s.connectedItem?.id ?? '-',
    (s.attachedSatellites ?? []).map((sat) => sat.id).join('+') || '-',
  ].join('|');
}

// Dedicated Constructor for Docked 3D Orb resting atop Pedestal Platform
function createDockedOrbGroup(item: ApothecaryItem, attached: ApothecaryItem[] = []): THREE.Group {
  const group = new THREE.Group();
  group.name = 'docked-orb-group';

  const taxonomy = getItem3DTaxonomy(item);

  // 1. Primary Docked Orb Mesh centered at local (0,0,0) inside group
  const orbElem = createOrbVariantMesh(modelKeyForItem(item));
  if (orbElem.children.length > 0) {
    // 4x, then trimmed 20% and a further 10%. Forced fully opaque like the Portal.
    setEmissiveIntensity(orbElem, 0.34);
    orbElem.scale.set(1.872, 1.872, 1.872);
    orbElem.position.set(0, 0, 0);
    group.add(orbElem);
  } else {
    let orbGeo: THREE.BufferGeometry;
    switch (taxonomy.geometryType) {
      case 'octahedron': orbGeo = new THREE.OctahedronGeometry(0.55); break;
      case 'cube': orbGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6); break;
      case 'cylinder': orbGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16); break;
      case 'dodecahedron': orbGeo = new THREE.DodecahedronGeometry(0.55); break;
      case 'tetrahedron': orbGeo = new THREE.TetrahedronGeometry(0.6); break;
      case 'sphere':
      default: orbGeo = new THREE.SphereGeometry(0.55, 24, 24); break;
    }

    const orbMat = new THREE.MeshPhysicalMaterial({
      color: taxonomy.color,
      emissive: taxonomy.color,
      emissiveIntensity: 1.0,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.95
    });

    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.set(0, 0, 0);
    group.add(orbMesh);

    // Wireframe Overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const wireMesh = new THREE.Mesh(orbGeo, wireMat);
    wireMesh.scale.setScalar(1.05);
    orbMesh.add(wireMesh);
  }

  // 2. Render Attached Satellite Sub-Nodes Orbiting Host Orb
  const satelliteClasses: string[] = [];
  if (item.satelliteClass) {
    satelliteClasses.push(item.satelliteClass);
  }
  if (item.capabilities.includes('telemetry_read')) satelliteClasses.push('I/O');
  if (item.capabilities.includes('shader_render')) satelliteClasses.push('Compute');
  if (item.capabilities.includes('tick_clock')) satelliteClasses.push('Storage');
  if (item.capabilities.includes('handshake_exec')) satelliteClasses.push('Validation');
  if (item.capabilities.includes('fault_containment')) satelliteClasses.push('Security');

  if (satelliteClasses.length === 0) {
    satelliteClasses.push('Compute', 'Validation');
  }

  const satellitesGroup = new THREE.Group();
  satellitesGroup.name = 'orbiting-satellites-group';
  satellitesGroup.position.set(0, 0, 0);

  // Satellites explicitly tethered by the user come first, then the ones implied
  // by the host item's capabilities.
  const tethered = attached.map((sat) => ({
    cls: sat.satelliteClass || 'Compute',
    color: getItem3DTaxonomy(sat).color,
    item: sat
  }));

  // Derived satellites express the host's own capabilities rather than being
  // separately catalogued items, so a descriptor is synthesised for them. It is
  // marked derivedFrom so the inspector can show it is host-owned, not tethered.
  const derived = satelliteClasses.map((cls) => ({
    cls,
    color: taxonomy.color,
    item: {
      id: `${item.id}::sat::${cls}`,
      name: `${cls} Satellite`,
      category: 'Satellites' as const,
      trust: item.trust,
      description: `Host-bound ${cls} satellite operating through ${item.name}. Derived from the host's declared capabilities rather than tethered separately.`,
      version: item.version,
      memoryReq: 0,
      threadsReq: 0,
      capabilities: item.capabilities,
      requirements: item.requirements,
      satelliteClass: cls as ApothecaryItem['satelliteClass'],
      derivedFrom: item.id
    } as ApothecaryItem & { derivedFrom: string }
  }));

  const allSatellites = [...tethered, ...derived];

  allSatellites.forEach((sat, index) => {
    const satMesh = createSatelliteMesh(sat.cls);
    satMesh.userData = { isSatellite: true, satelliteItem: sat.item };
    const angle = (index / allSatellites.length) * Math.PI * 2;
    // Widened from 0.95: the Orb is now ~1.3 in radius, so the old orbit sat
    // inside it. Held to 2.0 rather than a full 4x — arms are ~5.1 apart along
    // the ring at R=6.5, and a 4x orbit would collide with the neighbours.
    const orbitRadius = 2.0;
    satMesh.scale.multiplyScalar(2.0);
    const pos = new THREE.Vector3(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0);
    satMesh.position.copy(pos);
    satellitesGroup.add(satMesh);

    // Tether from the Orb surface (not its centre) out to the satellite.
    const surface = pos.clone().normalize().multiplyScalar(1.05);
    satellitesGroup.add(createSatelliteTether(surface, pos, sat.color));
  });

  group.add(satellitesGroup);

  return group;
}

// Durable spatial edits + saved camera views are persisted under their own
// localStorage keys, kept separate from App's architectural workspace snapshot:
// these are per-view placement/framing conveniences, not part of the CORE
// manifest. Both loaders are tolerant — malformed or absent storage yields a
// fresh empty state rather than throwing.
const SPATIAL_EDITS_STORAGE_KEY = 'aegis-vibe-architect.spatialEdits.v1';
const SAVED_VIEWS_STORAGE_KEY = 'aegis-vibe-architect.savedViews.v1';
// World-unit grid + Y-angle step used when SNAP is on, and the ease duration for
// a saved/framed camera move.
const SPATIAL_SNAP_GRID = 1.0;
const VIEW_TWEEN_SECONDS = 0.65;
const THREE_RUNTIME_MAIN_VIEW_P0_FLAG = 'aegis-vibe-architect.threeRuntimeMainViewP0';

function loadSpatialEdits(): SpatialEdits {
  try {
    const raw = window.localStorage.getItem(SPATIAL_EDITS_STORAGE_KEY);
    if (raw) return deserializeSpatialEdits(JSON.parse(raw));
  } catch (error) {
    console.warn('[SPATIAL] Persisted spatial edits could not be restored.', error);
  }
  return createSpatialEdits();
}

function loadSavedViews(): SavedViews {
  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
    if (raw) return deserializeSavedViews(JSON.parse(raw));
  } catch (error) {
    console.warn('[VIEW] Persisted saved views could not be restored.', error);
  }
  return createSavedViews();
}

function isThreeRuntimeMainViewP0Enabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get('threeRuntimeP0') ?? params.get('threeRuntimeMainViewP0');
    if (queryValue) return ['1', 'true', 'runtime'].includes(queryValue.toLowerCase());
    return window.localStorage.getItem(THREE_RUNTIME_MAIN_VIEW_P0_FLAG) === '1';
  } catch {
    return false;
  }
}

const ThreeRuntimeMainViewP0: React.FC<Pick<
  ThreeCanvasProps,
  'sockets' | 'onSelectSocket' | 'onEnterElement' | 'ambientIntensity' | 'directionalIntensity' | 'directionalAngle'
>> = ({
  sockets,
  onSelectSocket,
  onEnterElement,
  ambientIntensity = 0.5,
  directionalIntensity = 1.0,
  directionalAngle = 0.9
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const socketsRef = useRef(sockets);
  socketsRef.current = sockets;
  const runtimeRef = useRef<ThreeRuntime | null>(null);
  const recoveryRef = useRef<ContextLossRecoveryContract | null>(null);
  const buildCoreCrystalRef = useRef<() => void>();
  const aetherRef = useRef<Aether | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const assemblyPivotRef = useRef<THREE.Group | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const turntableDragRef = useRef<{ lastX: number; hasMoved: boolean } | null>(null);
  const starSpriteRef = useRef<THREE.CanvasTexture | null>(null);
  const starGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const starMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [sceneRemountKey, setSceneRemountKey] = useState(0);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [crystalVariant, setCrystalVariant] = useState<string>(CORE_CRYSTAL_VARIANTS[0].key);
  const [savedViews, setSavedViews] = useState<SavedViews>(() => loadSavedViews());
  const [spatialEdits] = useState<SpatialEdits>(() => loadSpatialEdits());
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const crystalVariantRef = useRef(crystalVariant);
  crystalVariantRef.current = crystalVariant;
  const savedViewNames = listViewNames(savedViews);

  const handleRestoreView = useCallback(() => {
    const recovery = recoveryRef.current;
    setContextLost(false);
    if (recovery) recovery.requestRebuild();
    else setSceneRemountKey((value) => value + 1);
  }, []);

  const handleFrameAll = useCallback(() => {
    runtimeRef.current?.resetCamera();
  }, []);

  const handleSaveView = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const pose = poseFromCamera(runtime.camera, runtime.cameraController.controls);
    setSavedViews((prev) => {
      const used = new Set(listViewNames(prev));
      let i = 1;
      while (used.has(`V${i}`)) i++;
      return saveView(prev, `V${i}`, pose);
    });
  }, []);

  const handleRestoreSavedView = useCallback((name: string) => {
    const runtime = runtimeRef.current;
    const pose = getView(savedViews, name);
    if (!runtime || !pose) return;
    applyPoseToCamera(runtime.camera, runtime.cameraController.controls, pose);
    runtime.invalidate();
  }, [savedViews]);

  const handleDeleteSavedView = useCallback((name: string) => {
    setSavedViews((prev) => deleteView(prev, name));
  }, []);

  const handleRuntimePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    turntableDragRef.current = { lastX: event.clientX, hasMoved: false };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; dragging still works without it.
    }
  }, []);

  const handleRuntimePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = turntableDragRef.current;
    const start = pointerStartRef.current;
    const pivot = assemblyPivotRef.current;
    const runtime = runtimeRef.current;
    if (!drag || !start || !pivot || !runtime || (event.buttons & 1) === 0) return;
    const dx = event.clientX - drag.lastX;
    drag.lastX = event.clientX;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 5) return;
    drag.hasMoved = true;
    pivot.rotation.y += dx * 0.005;
    runtime.invalidate();
  }, []);

  const handleRuntimePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current;
    const viewport = containerRef.current;
    const drag = turntableDragRef.current;
    if (!runtime || !viewport) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    turntableDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may not have been established.
    }
    if (drag?.hasMoved || (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5)) return;
    const hit = runtime.selection.pick(
      event.clientX,
      event.clientY,
      viewport.getBoundingClientRect(),
      runtime.camera
    );
    setSelectedEntityId(hit?.entry.id ?? null);
    if (!hit) return;
    runtime.focusEntity(hit.entry.id);
    const socketId = hit.entry.metadata?.socketId;
    if (typeof socketId !== 'string') return;
    const socket = socketsRef.current.find((entry) => entry.id === socketId);
    if (!socket) return;
    if (hit.entry.kind === 'orb' && socket.connectedItem && onEnterElement) {
      onEnterElement(socket.connectedItem);
      return;
    }
    onSelectSocket(socket, socket.connectedItem);
  }, [onEnterElement, onSelectSocket]);

  useEffect(() => {
    if (!containerRef.current) return;
    setIsModelsLoaded(false);
    let disposed = false;
    let runtime: ThreeRuntime | null = null;
    const coreGroup = new THREE.Group();
    coreGroup.name = 'runtime-main-core';
    const corePickTarget = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false })
    );
    corePickTarget.name = 'runtime-main-core-pick-target';
    corePickTarget.userData.proceduralGeometry = true;
    corePickTarget.userData.ownedMaterial = true;
    coreGroup.add(corePickTarget);
    const socketRoot = new THREE.Group();
    socketRoot.name = 'runtime-main-socket-topology';
    const labelRoot = new THREE.Group();
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    containerRef.current.appendChild(labelRenderer.domElement);
    labelRendererRef.current = labelRenderer;

    try {
      runtime = new ThreeRuntime({
        viewport: containerRef.current,
        homeCameraPose: {
          position: new THREE.Vector3(0, 12.0, 19.0),
          target: new THREE.Vector3(0, 0, 0),
        },
        fov: 55,
        near: 0.1,
        far: 1000,
        maxPixelRatio: QUALITY_PRESETS[DEFAULT_QUALITY_PRESET].maxPixelRatio,
        postprocessing: true,
        createSceneAdapter: (scene) => createSceneOwnedAdapter(scene, () => {
          const aether = new Aether(scene, { ambientIntensity, directionalIntensity, directionalAngle });
          aetherRef.current = aether;
          return aether;
        }, 0),
        configureComposer: (_composer, _scene, _camera, registerPass) => {
          registerPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.68, 0.42, 0.34));
        },
        onAfterRender: (scene, camera) => {
          labelRenderer.render(scene, camera);
        },
        onResize: (width, height) => {
          labelRenderer.setSize(width, height);
        },
        onContextLost: (recovery) => {
          if (!disposed) {
            recoveryRef.current = recovery;
            setContextLost(true);
          }
        },
        onContextRestoreAvailable: () => {
          if (!disposed) {
            recoveryRef.current = null;
            setContextLost(false);
            setSceneRemountKey((value) => value + 1);
          }
        },
      });
      runtime.renderer.toneMapping = THREE.ReinhardToneMapping;
      runtime.scene.fog = new THREE.FogExp2(0x080b10, 0.02);
      runtime.cameraController.controls.enableRotate = false;
      runtime.cameraController.controls.enablePan = false;
      runtime.cameraController.controls.minDistance = 4;
      runtime.cameraController.controls.maxDistance = 55;
      runtime.cameraController.controls.update();
      runtime.setReducedMotion(true);

      const coreTotem = createCoreTotem();
      coreTotem.position.set(0, 4.6, 0);
      labelRoot.add(coreTotem);
      runtime.scene.add(labelRoot);

      const starSprite = createStarSpriteTexture();
      starSpriteRef.current = starSprite;
      const particleGeo = new THREE.BufferGeometry();
      starGeometryRef.current = particleGeo;
      const particleCount = 700;
      const posArray = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 70;
        posArray[i + 1] = (Math.random() - 0.5) * 70;
        posArray[i + 2] = (Math.random() - 0.5) * 70;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({
        size: 0.09,
        map: starSprite,
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      starMaterialRef.current = particleMat;
      runtime.scene.add(new THREE.Points(particleGeo, particleMat));
      const assemblyPivot = new THREE.Group();
      assemblyPivot.name = 'runtime-main-assembly-pivot';
      assemblyPivot.add(coreGroup);
      assemblyPivot.add(socketRoot);
      runtime.scene.add(assemblyPivot);
      assemblyPivotRef.current = assemblyPivot;
      const coreEntry: SceneRegistryEntry = {
        id: 'core',
        kind: 'core',
        root: coreGroup,
        pickTargets: [corePickTarget],
        focusTarget: coreGroup,
        highlightTargets: [coreGroup],
        statusTargets: [coreGroup],
        disposalOwnership: 'system',
        status: 'nominal',
        metadata: {
          domainKind: 'core',
          runtimePath: 'main-view-p0',
        },
      };
      runtime.registry.register(coreEntry);
      labelRenderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      runtime.refreshSelectionTargets();

      const activeRuntime = runtime;
      const buildSocketTopology = () => {
        sockets.forEach((socket, index) => {
          const armGroup = new THREE.Group();
          armGroup.name = `runtime-main-socket:${socket.id}`;
          armGroup.userData.socketId = socket.id;
          armGroup.rotation.y = THREE.MathUtils.degToRad(socket.angleDeg);

          const ringColor = UMBILICAL_RING_COLORS[index % UMBILICAL_RING_COLORS.length];
          const ringGlow = createGlowRing(0.32, ringColor, socket.state === 'Active' ? 1.3 : 1);
          ringGlow.name = `runtime-main-ring:${socket.id}`;
          ringGlow.position.set(0, 0, 2.5);
          armGroup.add(ringGlow);

          const socketPickTarget = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 12, 8),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false })
          );
          socketPickTarget.name = `runtime-main-socket-pick:${socket.id}`;
          socketPickTarget.position.set(0, 0, 2.5);
          socketPickTarget.userData.proceduralGeometry = true;
          socketPickTarget.userData.ownedMaterial = true;
          armGroup.add(socketPickTarget);

          activeRuntime.registry.register({
            id: `socket:${socket.id}`,
            kind: 'umbilical',
            root: ringGlow,
            pickTargets: [socketPickTarget],
            focusTarget: ringGlow,
            highlightTargets: [ringGlow],
            statusTargets: [ringGlow],
            parentId: 'core',
            disposalOwnership: 'system',
            status: socket.state === 'Active' ? 'nominal' : 'queued',
            metadata: {
              socketId: socket.id,
              socketState: socket.state,
              runtimePath: 'main-view-p0',
            },
          });

          if (socket.connectedItem) {
            const dockedGroup = createDockedOrbGroup(socket.connectedItem, socket.attachedSatellites ?? []);
            dockedGroup.position.set(0, 0, ORB_DOCK_Z);
            const override = getOverride(spatialEdits, `orb:${socket.id}`);
            if (override?.position) {
              dockedGroup.position.set(override.position[0], override.position[1], override.position[2]);
            }
            dockedGroup.scale.setScalar(override?.scale ?? 1);
            armGroup.add(dockedGroup);

            const conduit = createDynamicUmbilical(
              new THREE.Vector3(0, 0, 2.5),
              dockedGroup.position.clone().multiplyScalar(0.85),
              'solid'
            );
            conduit.name = `runtime-main-umbilical:${socket.id}`;
            armGroup.add(conduit);

            const orbPickTarget = new THREE.Mesh(
              new THREE.SphereGeometry(1.85, 16, 12),
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false })
            );
            orbPickTarget.name = `runtime-main-orb-pick:${socket.id}`;
            orbPickTarget.userData.proceduralGeometry = true;
            orbPickTarget.userData.ownedMaterial = true;
            dockedGroup.add(orbPickTarget);

            const totem = createElementTotem(socket.connectedItem);
            totem.position.set(0, 2.4, dockedGroup.position.z);
            armGroup.add(totem);

            activeRuntime.registry.register({
              id: `orb:${socket.id}`,
              kind: 'orb',
              root: dockedGroup,
              pickTargets: [orbPickTarget],
              focusTarget: dockedGroup,
              highlightTargets: [dockedGroup],
              statusTargets: [dockedGroup],
              parentId: `socket:${socket.id}`,
              disposalOwnership: 'system',
              status: 'nominal',
              metadata: {
                socketId: socket.id,
                itemId: socket.connectedItem.id,
                itemName: socket.connectedItem.name,
                runtimePath: 'main-view-p0',
              },
            });
          }

          socketRoot.add(armGroup);
        });
        activeRuntime.refreshSelectionTargets();
        activeRuntime.invalidate();
      };

      const buildCoreCrystal = () => {
        clearRebuildableGroup(coreGroup, corePickTarget);
        if (corePickTarget.parent !== coreGroup) coreGroup.add(corePickTarget);
        const variant = CORE_CRYSTAL_VARIANTS.find((entry) => entry.key === crystalVariantRef.current)
          ?? CORE_CRYSTAL_VARIANTS[0];
        const coreCrystalGLTF = createCoreCrystalMesh(variant.key);
        if (coreCrystalGLTF && coreCrystalGLTF.children.length > 0) {
          setEmissiveIntensity(coreCrystalGLTF, 0.16);
          coreCrystalGLTF.scale.setScalar(5.6 * variant.fit);
          coreGroup.add(coreCrystalGLTF);
        } else {
          const crystalGeo = new THREE.IcosahedronGeometry(1.9, 0);
          const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x00f3ff,
            emissive: 0x002b36,
            emissiveIntensity: 0.8,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.88
          });
          const crystalMesh = new THREE.Mesh(crystalGeo, glassMaterial);
          crystalMesh.userData.proceduralGeometry = true;
          crystalMesh.userData.ownedMaterial = true;
          coreGroup.add(crystalMesh);

          const wireframeMesh = new THREE.Mesh(
            crystalGeo,
            new THREE.MeshBasicMaterial({
              color: 0x00f3ff,
              wireframe: true,
              transparent: true,
              opacity: 0.75
            })
          );
          wireframeMesh.userData.ownedMaterial = true;
          wireframeMesh.scale.setScalar(1.03);
          coreGroup.add(wireframeMesh);

          const innerLocusMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 16, 16),
            new THREE.MeshBasicMaterial({
              color: 0x00ff9d,
              transparent: true,
              opacity: 0.85
            })
          );
          innerLocusMesh.userData.proceduralGeometry = true;
          innerLocusMesh.userData.ownedMaterial = true;
          coreGroup.add(innerLocusMesh);
        }
        runtime?.invalidate();
      };

      buildCoreCrystalRef.current = buildCoreCrystal;
      buildCoreCrystal();
      runtime.invalidate();
      runtimeRef.current = runtime;

      void preloadAllGltfModels(runtime.renderer).then(() => {
        if (disposed) return;
        buildCoreCrystal();
        buildSocketTopology();
        setIsModelsLoaded(true);
      });
    } catch (error) {
      console.error('[ThreeRuntime P0] Main-view runtime parity spike unavailable', error);
      runtime?.dispose();
      setContextLost(true);
    }

    return () => {
      disposed = true;
      buildCoreCrystalRef.current = undefined;
      aetherRef.current = null;
      clearRebuildableGroup(coreGroup);
      clearRebuildableGroup(socketRoot);
      clearRebuildableGroup(labelRoot);
      starSpriteRef.current?.dispose();
      starGeometryRef.current?.dispose();
      starMaterialRef.current?.dispose();
      starSpriteRef.current = null;
      starGeometryRef.current = null;
      starMaterialRef.current = null;
      assemblyPivotRef.current = null;
      turntableDragRef.current = null;
      if (labelRendererRef.current?.domElement.parentNode) {
        labelRendererRef.current.domElement.parentNode.removeChild(labelRendererRef.current.domElement);
      }
      labelRendererRef.current = null;
      runtimeRef.current = null;
      recoveryRef.current = null;
      setSelectedEntityId(null);
      runtime?.dispose();
    };
  }, [onEnterElement, onSelectSocket, sceneRemountKey, sockets, spatialEdits]);

  useEffect(() => {
    buildCoreCrystalRef.current?.();
  }, [crystalVariant]);

  useEffect(() => {
    aetherRef.current?.setAmbient(0xffffff, ambientIntensity);
    runtimeRef.current?.invalidate();
  }, [ambientIntensity]);

  useEffect(() => {
    aetherRef.current?.setDirectional(0xffffff, directionalIntensity, new THREE.Vector3());
    aetherRef.current?.setDirectionalAngle(directionalAngle);
    runtimeRef.current?.invalidate();
  }, [directionalIntensity, directionalAngle]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVED_VIEWS_STORAGE_KEY,
        JSON.stringify(serializeSavedViews(savedViews))
      );
    } catch (error) {
      console.warn('[VIEW] Saved views could not be persisted.', error);
    }
  }, [savedViews]);

  return (
    <div className="absolute inset-0 z-0 w-full h-full overflow-hidden bg-[#080b10]">
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
        role="application"
        aria-label="ThreeRuntime main-view migration preview. Select registered scene entities."
        tabIndex={0}
        onPointerDown={handleRuntimePointerDown}
        onPointerMove={handleRuntimePointerMove}
        onPointerUp={handleRuntimePointerUp}
      />

      {!isModelsLoaded && !contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080b10]/90 backdrop-blur-sm pointer-events-none">
          <div className="px-6 py-3 bg-cyan-950/80 border border-cyan-500/50 rounded-full shadow-[0_0_25px_rgba(0,243,255,0.3)] flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-[#00f3ff] animate-ping" />
            <span className="text-sm font-mono font-bold text-[#00f3ff] tracking-wider uppercase">
              [ INITIALIZING 3D ASSETS ]
            </span>
          </div>
        </div>
      )}

      {contextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#080b10]/95 backdrop-blur-md">
          <div className="flex flex-col items-center space-y-4 px-8 py-6 rounded-2xl bg-rose-950/80 border border-rose-500/50 shadow-[0_0_30px_rgba(255,42,109,0.25)] text-center">
            <span className="text-xs font-mono font-bold text-rose-200 tracking-widest uppercase">
              3D VIEW INTERRUPTED — GPU CONTEXT LOST
            </span>
            <button
              onClick={handleRestoreView}
              className="px-4 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-500/25 text-rose-100 border border-rose-400/50 hover:bg-rose-500/40 transition-colors"
            >
              Restore 3D View
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1 px-2 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30">
        <span className="text-[9px] font-mono font-bold text-cyan-500/70 tracking-widest px-1.5">CORE</span>
        {CORE_CRYSTAL_VARIANTS.map((variant) => (
          <button
            key={variant.key}
            onClick={() => setCrystalVariant(variant.key)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide transition-colors ${
              crystalVariant === variant.key
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {variant.label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1 px-2 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30">
        <span className="text-[9px] font-mono font-bold text-cyan-500/70 tracking-widest px-1.5">VIEW</span>
        {selectedEntityId && (
          <span className="text-[9px] font-mono font-bold text-emerald-300/90 tracking-widest px-1.5">
            {selectedEntityId.toUpperCase()}
          </span>
        )}
        <button
          onClick={handleFrameAll}
          title="Frame the runtime CORE in view"
          className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent transition-colors"
        >
          FRAME
        </button>
        <button
          onClick={handleSaveView}
          title="Save the current runtime camera view"
          className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent transition-colors"
        >
          SAVE
        </button>
        {savedViewNames.map((name) => (
          <button
            key={name}
            onClick={() => handleRestoreSavedView(name)}
            onContextMenu={(event) => { event.preventDefault(); handleDeleteSavedView(name); }}
            title="Click to fly here; right-click to delete"
            className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide bg-cyan-500/15 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/30 transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};

const LegacyThreeCanvas: React.FC<ThreeCanvasProps> = ({
  sockets,
  portals = [],
  onSelectSocket,
  onEnterElement,
  onDropAttachItem,
  onRightClickElement,
  onAttachSatellite,
  onSelectSatellite,
  onAddPortal,
  selectedSocketId,
  activeMode,
  ambientIntensity = 0.5,
  directionalIntensity = 1.0,
  directionalAngle = 0.9
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSocketIdRef = useRef(selectedSocketId);
  selectedSocketIdRef.current = selectedSocketId;

  const socketsRef = useRef(sockets);
  socketsRef.current = sockets;

  const updateSocketGeometriesRef = useRef<() => void>();
  const buildCoreCrystalRef = useRef<() => void>();
  const buildPortalAssemblyRef = useRef<() => void>();
  const rebuildDragTargetsRef = useRef<() => void>();
  // Full model-swap rebuild: re-run every builder against the current GLB cache.
  // Used after the initial preload lands and after a failed-model retry.
  const applyLoadedModelsRef = useRef<() => void>();

  // Render-pipeline handles kept so the quality/bloom controls can retune the
  // live renderer without tearing the scene down (the scene effect runs once).
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  // Turntable pivot holding the CORE + orbs + umbilical arms. Dragging rotates
  // THIS (single plane, around Y) rather than orbiting the camera, so the camera
  // and the world-fixed boundary Portals hold still while the mechanism turns.
  const assemblyPivotRef = useRef<THREE.Group | null>(null);

  const portalsRef = useRef(portals);
  portalsRef.current = portals;

  const aetherRef = useRef<Aether | null>(null);
  const ambientIntensityRef = useRef(ambientIntensity);
  ambientIntensityRef.current = ambientIntensity;

  // Rebuild the boundary gateways whenever a Portal is added or moved.
  useEffect(() => {
    buildPortalAssemblyRef.current?.();
  }, [portals]);

  const [crystalVariant, setCrystalVariant] = useState<string>(CORE_CRYSTAL_VARIANTS[0].key);
  const crystalVariantRef = useRef(crystalVariant);
  crystalVariantRef.current = crystalVariant;

  // The scene effect runs once, so swapping cores re-invokes the builder rather
  // than tearing down and rebuilding the whole canvas.
  useEffect(() => {
    buildCoreCrystalRef.current?.();
  }, [crystalVariant]);

  // Refs for 3D Drag & Raycaster state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const ghostMeshRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const socketMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const snappedSocketIdRef = useRef<string | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dragControlsRef = useRef<DragControls | null>(null);
  const draggableObjectsRef = useRef<THREE.Object3D[]>([]);
  // Dedicated picking proxies: invisible simple-geometry meshes parented to each
  // selectable node (docked orb, satellite, vacant socket). Selection raycasts
  // this flat list instead of the full detailed GLB subtree — cheaper and far
  // more reliable (a convex volume with no gaps or thin-conduit occluders), and
  // each proxy carries the resolution target in userData.pick so the handler
  // needs no tree walk.
  const pickProxiesRef = useRef<THREE.Mesh[]>([]);

  const [isModelsLoaded, setIsModelsLoaded] = useState(false);

  // Batch 2 view controls (display-only). Quality drives pixel ratio + default
  // bloom; motion honours the OS reduced-motion preference by default but stays
  // user-overridable; bloom can be toggled independently of the preset.
  const [quality, setQuality] = useState<QualityPreset>(DEFAULT_QUALITY_PRESET);
  const [bloomEnabled, setBloomEnabled] = useState<boolean>(QUALITY_PRESETS[DEFAULT_QUALITY_PRESET].bloom);
  const [motionEnabled, setMotionEnabled] = useState<boolean>(() => !prefersReducedMotion());
  const motionEnabledRef = useRef(motionEnabled);
  motionEnabledRef.current = motionEnabled;

  // When locked, drag no longer turntables the assembly (orientation is pinned).
  const [viewLocked, setViewLocked] = useState<boolean>(false);
  const viewLockedRef = useRef(viewLocked);
  viewLockedRef.current = viewLocked;

  // WebGL context loss. When the GPU drops the context the live renderer, canvas,
  // and all GL resources are dead and cannot be revived in place. contextLost
  // surfaces a Restore overlay; Restore (and the browser's own contextrestored
  // event) bump sceneRemountKey, which is in the scene effect's dependency array,
  // so React runs the existing teardown/dispose cleanup and then rebuilds a fresh
  // renderer, canvas, and scene.
  const [contextLost, setContextLost] = useState(false);
  const [sceneRemountKey, setSceneRemountKey] = useState(0);
  const handleRestoreView = useCallback(() => {
    setContextLost(false);
    setSceneRemountKey((k) => k + 1);
  }, []);

  // Durable spatial edits: per-object transform overrides (the CORE and each
  // docked orb) that survive rebuilds and reloads, with undo/redo/reset and
  // optional grid snapping. The scene reads the current value through a ref so
  // the drag/build closures stay stable; a dedicated effect persists and re-applies.
  const [spatialEdits, setSpatialEdits] = useState<SpatialEdits>(() => loadSpatialEdits());
  const spatialEditsRef = useRef(spatialEdits);
  spatialEditsRef.current = spatialEdits;
  const applySpatialOverridesRef = useRef<() => void>();
  const [snapEnabled, setSnapEnabled] = useState<boolean>(false);
  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;

  // Saved camera navigation: framed/named viewpoints and the in-flight eased
  // camera move. The imperative helpers are assigned by the scene effect (which
  // owns the camera + controls) and invoked from the toolbar buttons via refs.
  const [savedViews, setSavedViews] = useState<SavedViews>(() => loadSavedViews());
  const cameraTweenRef = useRef<{ from: CameraPose; to: CameraPose; start: number; dur: number } | null>(null);
  const frameAllRef = useRef<() => void>();
  const captureCurrentPoseRef = useRef<() => CameraPose>();
  const gotoPoseRef = useRef<(pose: CameraPose) => void>();

  // Loader HUD progress. Enumerated from ALL_MODEL_KEYS so a failed model is
  // surfaced (with retry) rather than silently dropped once the aggregate
  // preload resolves.
  const [modelProgress, setModelProgress] = useState<{ loaded: number; errored: ModelKey[] }>(
    { loaded: 0, errored: [] }
  );
  const [retrying, setRetrying] = useState(false);

  // Reactive Observer: Reconcile 3D Scene Nodes on socket state or model load changes
  useEffect(() => {
    if (updateSocketGeometriesRef.current) {
      updateSocketGeometriesRef.current();
    }
    if (rebuildDragTargetsRef.current) {
      rebuildDragTargetsRef.current();
    }
  }, [sockets, isModelsLoaded]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Guards the async preload continuation: if the component unmounts before
    // preloadAllGltfModels resolves, the .then() must not rebuild a disposed
    // scene or setState on an unmounted component. Set true in the cleanup.
    let disposed = false;

    // Interaction state shared across the pointer + drag handlers.
    // objectDragActive: DragControls is moving an orb/core, so the turntable must
    // stand down. rotateArmed / rotateLastX: an empty-space left-drag is spinning
    // the assembly pivot.
    let objectDragActive = false;
    let rotateArmed = false;
    let rotateLastX = 0;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x080b10, 0.02);

    // Elevated camera looking down at 35-degree top-down isometric angle
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    // Pulled back to frame the wider boundary ring (Portals now sit at R=13.5).
    camera.position.set(0, 12.0, 19.0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });

    renderer.setSize(width, height);
    renderer.setPixelRatio(effectivePixelRatio(quality));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // CSS2D overlay renderer for the Element Totem plaques. Its own layer sits
    // over the WebGL canvas but is pointer-transparent, so orbit/drag still work
    // everywhere except the small interactive plaques themselves.
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    // Register the active WebGLRenderer so KTX2Loader can detect supported
    // texture formats. This also kicks off the (deduplicated) asset preload;
    // the scene is rebuilt from its .then() further down, once the builders exist.
    const modelsPreload = preloadAllGltfModels(renderer);

    const handleContextLost = (event: Event) => {
      // preventDefault signals we intend to restore, halting the default
      // permanent-loss path. The render loop is stopped and the Restore overlay
      // is surfaced; the dead GL resources are freed and rebuilt on remount.
      event.preventDefault();
      console.warn('WebGL Context Lost. Scene halted; awaiting restore.');
      cancelAnimationFrame(animationFrameId);
      setContextLost(true);
    };
    const handleContextRestored = () => {
      // The browser reacquired a context on its own. Force a clean rebuild on it
      // by bumping the remount key (the in-place resources are still stale).
      console.info('WebGL Context Restored. Rebuilding scene.');
      setContextLost(false);
      setSceneRemountKey((k) => k + 1);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Camera controls: zoom only. Rotation and pan are disabled so the camera —
    // and with it the world-fixed boundary Portals — holds a steady viewpoint.
    // Rotating the scene is done by turntabling the assembly pivot (see the
    // pointer handlers below), not by orbiting the camera.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.maxDistance = 55;
    controls.minDistance = 4;
    controlsRef.current = controls;

    // 2. Aether Lighting Setup
    const aether = new Aether(scene);

    aetherRef.current = aether;
    aether.setSize(width, height);

    // Apply initial lighting values
    aether.setAmbient(0xffffff, ambientIntensity);
    aether.setDirectional(0xffffff, directionalIntensity, new THREE.Vector3());
    aether.setDirectionalAngle(directionalAngle);

    // Starfield Background Particles
    const starSprite = createStarSpriteTexture();
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 700;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 70;
      posArray[i + 1] = (Math.random() - 0.5) * 70;
      posArray[i + 2] = (Math.random() - 0.5) * 70;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.09,
      map: starSprite,
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const aetherGeo = new THREE.BufferGeometry();
    const aetherCount = 120;
    const aetherPos = new Float32Array(aetherCount * 3);
    for (let i = 0; i < aetherCount * 3; i += 3) {
      aetherPos[i] = (Math.random() - 0.5) * 90;
      aetherPos[i + 1] = (Math.random() - 0.5) * 30;
      aetherPos[i + 2] = (Math.random() - 0.5) * 90;
    }
    aetherGeo.setAttribute('position', new THREE.BufferAttribute(aetherPos, 3));
    const aetherMat = new THREE.PointsMaterial({
      size: 0.28,
      map: starSprite,
      color: 0xb06cff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const aetherPoints = new THREE.Points(aetherGeo, aetherMat);
    scene.add(aetherPoints);

    // The Vibe Luminary's Presence floats beside the mechanism, outside the turntable.
    const luminaryPresence = createLuminaryPresence();
    scene.add(luminaryPresence.root);

    // Turntable pivot: the CORE crystal and the umbilical socket arms (with their
    // docked orbs) are parented here so a drag can rotate the whole mechanism in
    // place around Y. The boundary Portals, starfield, aether, lights, and the
    // camera are deliberately NOT children of this pivot, so they hold still while
    // the assembly turns.
    const assemblyPivot = new THREE.Group();
    assemblyPivot.name = 'assembly-pivot';
    scene.add(assemblyPivot);
    assemblyPivotRef.current = assemblyPivot;

    // 3. Central CORE Crystal at Origin [0, 0, 0]
    const coreGroup = new THREE.Group();
    assemblyPivot.add(coreGroup);

    let wireframeMesh: THREE.Mesh | null = null;
    let innerLocusMesh: THREE.Mesh | null = null;

    // Rebuildable so the procedural fallback can be swapped for the CORE Crystal .glb
    // once the async preload lands. Called synchronously here (fallback) and again
    // after preloadAllGltfModels resolves (real model).
    const buildCoreCrystal = () => {
      clearRebuildableGroup(coreGroup);
      wireframeMesh = null;
      innerLocusMesh = null;

      const variant = CORE_CRYSTAL_VARIANTS.find(v => v.key === crystalVariantRef.current)
        ?? CORE_CRYSTAL_VARIANTS[0];
      const coreCrystalGLTF = createCoreCrystalMesh(variant.key);
      if (coreCrystalGLTF && coreCrystalGLTF.children.length > 0) {
        // At 4x the original size this fills far more of the frame, so the
        // loader's baseline emissive (0.42) drove the bloom pass much harder.
        // Held down to compensate — size unchanged, glow reduced.
        setEmissiveIntensity(coreCrystalGLTF, 0.16);
        coreCrystalGLTF.scale.setScalar(5.6 * variant.fit);
        coreGroup.add(coreCrystalGLTF);
        let tris = 0;
        coreCrystalGLTF.traverse((n) => {
          const m = n as THREE.Mesh;
          if (m.isMesh) tris += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;
        });
        console.log(`[CORE] Using ${variant.label} (${tris.toLocaleString()} triangles)`);
      } else {
        console.log('[CORE] Using procedural Icosahedron placeholder (glb not cached yet)');
        const crystalGeo = new THREE.IcosahedronGeometry(1.9, 0);
        const glassMaterial = new THREE.MeshStandardMaterial({
          color: 0x00f3ff,
          emissive: 0x002b36,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          metalness: 0.3,
          transparent: true,
          opacity: 0.88
        });
        const crystalMesh = new THREE.Mesh(crystalGeo, glassMaterial);
        crystalMesh.userData.proceduralGeometry = true; // crystalGeo is shared with wireframeMesh
        crystalMesh.userData.ownedMaterial = true;
        coreGroup.add(crystalMesh);

        const wireframeMat = new THREE.MeshBasicMaterial({
          color: 0x00f3ff,
          wireframe: true,
          transparent: true,
          opacity: 0.75
        });
        wireframeMesh = new THREE.Mesh(crystalGeo, wireframeMat);
        wireframeMesh.userData.ownedMaterial = true; // geometry disposed via crystalMesh
        wireframeMesh.scale.setScalar(1.03);
        coreGroup.add(wireframeMesh);

        const innerLocusGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const innerLocusMat = new THREE.MeshBasicMaterial({
          color: 0x00ff9d,
          transparent: true,
          opacity: 0.85
        });
        innerLocusMesh = new THREE.Mesh(innerLocusGeo, innerLocusMat);
        innerLocusMesh.userData.proceduralGeometry = true;
        innerLocusMesh.userData.ownedMaterial = true;
        coreGroup.add(innerLocusMesh);
      }
    };

    buildCoreCrystalRef.current = buildCoreCrystal;
    buildCoreCrystal();

    // CORE Crystal Totem. Anchored to the scene rather than coreGroup so it holds
    // a steady label position while the crystal itself tumbles, and created once
    // so it survives every crystal/variant rebuild.
    const coreTotem = createCoreTotem();
    coreTotem.position.set(0, 4.6, 0);
    scene.add(coreTotem);

    // 3b. CORE Boundary Gateway: Prismatic Iris Portal (CORE-05) + Portal Tender (CORE-06)
    // Per the asset manifest the Portal is a gateway *through the CORE boundary* to
    // external resources, and the Tender is the conduit from that Portal out to an
    // exterior service endpoint. Both sit outboard of the umbilical arms (pedestals
    // end at R=6.5), offset 22.5 degrees so they never overlap an arm.
    const PORTAL_RADIUS = 13.5;
    const TENDER_RADIUS = 15.5;
    const PORTAL_COLOR = 0xa855f7;
    const TENDER_COLOR = 0x00f3ff;

    // One parent holding every placed Portal, rebuilt whenever the manifest's
    // portal list changes. Each child is a full gateway assembly rotated to its
    // own boundary slot.
    const portalsRoot = new THREE.Group();
    portalsRoot.name = 'core-boundary-portals';
    scene.add(portalsRoot);

    // Collected prismatic irises, spun in place each frame so their faceted skin
    // catches the light and flashes — the effect that makes the boundary feel
    // alive. This is an in-place spin of the iris only; it does not move the
    // Portal off its fixed compass point.
    const portalIrises: THREE.Group[] = [];

    const buildOnePortal = (placement: PortalPlacement): THREE.Group => {
      const group = new THREE.Group();
      group.name = `portal-${placement.id}`;
      group.rotation.y = (placement.angleDeg * Math.PI) / 180; // local +Z is radially outward

      // Local lights travel with the assembly so it never depends on the core
      // lights, which fall off well before the boundary radius. Kept near-neutral
      // so they reveal the model's own prismatic skin instead of tinting it.
      const portalLight = new THREE.PointLight(0xfdfaff, 6.75, 9);
      portalLight.position.set(0, 0.9, PORTAL_RADIUS);
      group.add(portalLight);

      const tenderLight = new THREE.PointLight(TENDER_COLOR, 10, 8);
      tenderLight.position.set(0, 0.9, TENDER_RADIUS);
      group.add(tenderLight);

      // Boundary Portal Totem — floats above the iris, naming the gateway and
      // illuminating its function on hover. Added before the model early-return
      // so the label is present even during the pre-cache fallback pass.
      const portalTotem = createPortalTotem(placement);
      portalTotem.position.set(0, 4.2, PORTAL_RADIUS);
      group.add(portalTotem);

      // Prismatic Iris Portal — PORTAL.glb is a flat iris in XY, thin along Z,
      // so the unrotated model already faces radially outward through the boundary.
      const portalMesh = createAegisElementMesh('portal');
      if (portalMesh.children.length > 0) {
        setEmissiveIntensity(portalMesh, 0.34);
        portalMesh.scale.setScalar(3.6);
        portalMesh.position.set(0, 0.9, PORTAL_RADIUS);
        group.add(portalMesh);
        portalIrises.push(portalMesh);
      }

      // Portal Tender — articulated conduit, long along local X. Rotated a quarter
      // turn so its long axis runs radially, bridging Portal to the exterior endpoint.
      const tenderMesh = createAegisElementMesh('portal_tender');
      if (tenderMesh.children.length > 0) {
        setEmissiveIntensity(tenderMesh, 0.8);
        tenderMesh.scale.setScalar(2.6);
        tenderMesh.rotation.y = Math.PI / 2;
        tenderMesh.position.set(0, 0.9, TENDER_RADIUS);
        group.add(tenderMesh);
      }

      if (portalMesh.children.length === 0 && tenderMesh.children.length === 0) {
        return group; // models not cached yet; rebuilt once they land
      }

      // Luminous relation conduit: Portal -> Tender (visual grammar: luminous
      // paths express an active Relation). MeshBasicMaterial is unlit, matching
      // how the umbilical tubes stay bright at any distance.
      const conduitGeo = new THREE.CylinderGeometry(0.07, 0.07, TENDER_RADIUS - PORTAL_RADIUS, 12);
      conduitGeo.rotateX(Math.PI / 2);
      const conduitMesh = new THREE.Mesh(
        conduitGeo,
        new THREE.MeshBasicMaterial({ color: PORTAL_COLOR, transparent: true, opacity: 0.75 })
      );
      conduitMesh.userData.proceduralGeometry = true;
      conduitMesh.userData.ownedMaterial = true;
      conduitMesh.position.set(0, 0.9, (PORTAL_RADIUS + TENDER_RADIUS) / 2);
      group.add(conduitMesh);

      return group;
    };

    const buildPortalAssembly = () => {
      clearRebuildableGroup(portalsRoot);
      portalIrises.length = 0;
      // Portals are anchored to the 8 fixed compass points (cardinal +
      // intercardinal). They are world-fixed and non-draggable — they spin in
      // place but never move off their point — so the ring is derived from the
      // compass constant rather than the mutable manifest portal list.
      for (const point of PORTAL_COMPASS_POINTS) {
        portalsRoot.add(buildOnePortal({
          id: `portal-compass-${point.dir}`,
          name: `Prismatic Iris Portal (${point.dir})`,
          angleDeg: point.angleDeg,
        }));
      }
      console.log(`[PORTAL] ${PORTAL_COMPASS_POINTS.length} anchored boundary gateway(s) built`);
    };

    buildPortalAssemblyRef.current = buildPortalAssembly;
    buildPortalAssembly();

    // 4. 8-Vector Radial Umbilical Socket Arms Architecture
    const socketMeshesGroup = new THREE.Group();
    assemblyPivot.add(socketMeshesGroup);

    const socketMeshMap = socketMeshMapRef.current;

    // Selection resolution carried by each pick proxy: a satellite drills into its
    // Actuator Environment; a socketNode drills into a docked Orb or opens the
    // builder on a vacant socket.
    type PickTarget =
      | { kind: 'satellite'; item: ApothecaryItem }
      | { kind: 'socketNode'; socketId: string };

    // One invisible pick proxy: a coarse sphere the raycaster can hit in place of
    // detailed GLB geometry. A visible:false material keeps it out of the render
    // while staying raycastable; userData flags it for disposal (procedural geo +
    // owned material) and carries the selection target.
    const makePickProxy = (radius: number, pick: PickTarget): THREE.Mesh => {
      const proxy = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 8, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.name = 'pick-proxy';
      proxy.userData = { isPickProxy: true, pick, proceduralGeometry: true, ownedMaterial: true };
      return proxy;
    };

    // Attach pick proxies to a freshly built arm: a proxy over the docked Orb and
    // one over each satellite, or a proxy over the vacant dock so an empty socket
    // stays clickable. Proxies are children of the node they represent, so they
    // track it through drag, spatial overrides, and the turntable automatically.
    const attachPickProxies = (armGroup: THREE.Group, socketId: string) => {
      const dock = armGroup.children.find(c => c.name === 'docked-orb-group');
      if (dock) {
        dock.add(makePickProxy(1.4, { kind: 'socketNode', socketId }));
        const satellites: THREE.Object3D[] = [];
        dock.traverse((node) => {
          if (node.userData?.isSatellite && node.userData.satelliteItem) satellites.push(node);
        });
        for (const sat of satellites) {
          sat.add(makePickProxy(0.5, { kind: 'satellite', item: sat.userData.satelliteItem as ApothecaryItem }));
        }
      } else {
        const vacant = makePickProxy(1.4, { kind: 'socketNode', socketId });
        vacant.position.set(0, 0, ORB_DOCK_Z);
        armGroup.add(vacant);
      }
    };

    // Rebuild the flat pick-proxy list from whatever proxies currently hang under
    // the arms. Cheap; called after every socket build/reconcile.
    const refreshPickProxies = () => {
      const list: THREE.Mesh[] = [];
      socketMeshesGroup.traverse((node) => {
        if (node.userData?.isPickProxy) list.push(node as THREE.Mesh);
      });
      pickProxiesRef.current = list;
    };

    // Builds one umbilical arm from its socket binding + ring index. Kept pure
    // (no scene-graph or map mutation) so the reconciler below can build, keep,
    // or dispose arms individually.
    const buildArm = (s: SocketBinding, index: number): THREE.Group => {
      const angle = index * (Math.PI / 4); // 45-degree steps around Y-axis

      // 1. Arm Group (rotates around Y-axis)
      const armGroup = new THREE.Group();
      armGroup.name = `umbilical-arm-${s.id}`;
      armGroup.rotation.y = angle;

      let mainColor = 0x00f3ff; // Vacant wireframe cyan
      let isWireframe = true;
      let ringOpacity = 0.65;

      if (s.state === 'Active') {
        mainColor = 0x00ff9d; // Emerald solid active
        isWireframe = false;
        ringOpacity = 0.95;
      } else if (s.state === 'Degraded') {
        mainColor = 0xffb000;
        isWireframe = false;
        ringOpacity = 0.85;
      } else if (s.state === 'Severed') {
        mainColor = 0xff2a6d;
        isWireframe = true;
        ringOpacity = 0.95;
      }

      // 2. Umbilical Conduit (CK-01) spanning local Z = 2.5 to Z = 6.5.
      // A Severed socket gets the broken variant so the state reads from the
      // conduit itself; intact arms cycle the variants so the ring isn't
      // eight identical copies.
      const conduitKey = s.state === 'Severed'
        ? UMBILICAL_SEVERED
        : UMBILICAL_VARIANTS[index % UMBILICAL_VARIANTS.length];

      // Use the new Antigravity Engine procedural spline!
      // Umbilicals extended so Orbs dock further out from the CORE (ORB_DOCK_Z).
      const fromPos = new THREE.Vector3(0, 0, 2.5);
      const toPos = new THREE.Vector3(0, 0, 7.0);
      const conduit = createDynamicUmbilical(fromPos, toPos, isWireframe ? 'wireframe' : 'solid');
      conduit.name = 'dynamic-umbilical';

      // buildSignature lets the reconciler detect an unchanged arm and skip it.
      armGroup.userData = { socketId: s.id, isWireframe, buildSignature: armSignature(s, index) };

      if (conduit.children.length > 0) {
        armGroup.add(conduit);
      } else {
        // Procedural stem fallback
        const tubeLength = 4.0;
        const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, tubeLength, 16);
        tubeGeo.rotateX(Math.PI / 2); // Lay cylinder along local Z-axis
        const tubeMat = new THREE.MeshBasicMaterial({
          color: mainColor,
          wireframe: isWireframe,
          transparent: true,
          opacity: ringOpacity * 0.8
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.position.set(0, 0, 4.5); // Local center between R=2.5 and R=6.5
        tubeMesh.userData = { proceduralGeometry: true, ownedMaterial: true };
        armGroup.add(tubeMesh);
      }

      // 3. Umbilical Socket Ring (Mechanical collar at local Z = 2.5).
      // Each arm gets its own colour from the ring palette; radius and tube
      // are 20% down from 0.5 / 0.09. Solid rather than wireframe so the
      // colour reads — state now shows through emissive strength instead.
      const ringColor = UMBILICAL_RING_COLORS[index % UMBILICAL_RING_COLORS.length];
      // 0.32 — another 20% down from 0.4. Tube sizes derive from the radius
      // inside createGlowRing, so the glow scales with the ring automatically.
      const ringGlow = createGlowRing(0.32, ringColor, s.state === 'Active' ? 1.3 : 1);
      ringGlow.position.set(0, 0, 2.5);
      ringGlow.userData = { socketId: s.id, isSocket: true, ringColor };
      armGroup.add(ringGlow);

      // 4. ATTACH DOCKED ORB, centred on the arm axis at local Z = 6.5.
      // The docking pedestal disc that used to sit here was removed; the
      // conduit's grip end now meets the Orb directly.
      if (s.connectedItem) {
        const dockedGroup = createDockedOrbGroup(s.connectedItem, s.attachedSatellites ?? []);
        dockedGroup.position.set(0, 0, ORB_DOCK_Z);
        dockedGroup.userData = { socketId: s.id, isDockedOrb: true };
        armGroup.add(dockedGroup);

        // Element Totem plaque floats above the docked Orb. It is attached to
        // the arm (not the tumbling orb group) so it holds a steady position
        // and reads as a label rather than swinging with the Orb's spin.
        const totem = createElementTotem(s.connectedItem);
        totem.position.set(0, 2.4, ORB_DOCK_Z);
        armGroup.add(totem);
      }

      attachPickProxies(armGroup, s.id);
      return armGroup;
    };

    // Reactive Scene Reconciler.
    //
    // force=true rebuilds every arm from scratch (used when the underlying GLB
    // set changes under a fixed socket list — the initial preload landing and a
    // failed-model retry — since those keep signatures identical while swapping
    // the meshes the builder pulls from the cache).
    //
    // force=false (the default, on ordinary socket-state changes) reconciles by
    // socket id: arms whose signature is unchanged are left in place, only
    // changed arms are disposed and rebuilt, and arms whose socket disappeared
    // are removed. This avoids re-cloning all eight GLB arms — and rebuilding
    // their CSS2D Totems — every time one socket changes or one orb is dragged.
    const updateSocketGeometries = (force = false) => {
      const currentSockets = socketsRef.current;

      if (force) {
        clearRebuildableGroup(socketMeshesGroup);
        socketMeshMap.clear();
        currentSockets.forEach((s, index) => {
          const arm = buildArm(s, index);
          socketMeshesGroup.add(arm);
          socketMeshMap.set(s.id, arm);
        });
        refreshPickProxies();
        return;
      }

      const seen = new Set<string>();
      currentSockets.forEach((s, index) => {
        seen.add(s.id);
        const sig = armSignature(s, index);
        const existing = socketMeshMap.get(s.id);
        if (existing && existing.userData.buildSignature === sig) return; // unchanged — keep
        if (existing) {
          socketMeshesGroup.remove(existing);
          disposeRebuildableObject(existing);
          socketMeshMap.delete(s.id);
        }
        const arm = buildArm(s, index);
        socketMeshesGroup.add(arm);
        socketMeshMap.set(s.id, arm);
      });

      // Drop arms whose socket no longer exists.
      socketMeshMap.forEach((arm, id) => {
        if (seen.has(id)) return;
        socketMeshesGroup.remove(arm);
        disposeRebuildableObject(arm);
        socketMeshMap.delete(id);
      });

      refreshPickProxies();
    };

    updateSocketGeometriesRef.current = () => updateSocketGeometries(false);
    updateSocketGeometries(true);

    // Collect draggable 3D objects (docked orbs, portal assemblies, core) and
    // wire up DragControls so the user can freely reposition them by clicking
    // and dragging. OrbitControls is disabled while a drag is active.
    // Re-apply persisted spatial overrides to the CORE and each docked orb, and
    // rebuild each arm's umbilical so it reaches wherever its orb now sits. This
    // is the single source of truth for placement + conduit reach, so it stays
    // correct across socket reconciles, model loads, undo/redo, reset, and
    // context-loss remounts. Rotation is left to the animation loop, so overrides
    // carry position (and scale) only.
    const applySpatialOverrides = () => {
      const edits = spatialEditsRef.current;

      const coreOv = getOverride(edits, 'core');
      if (coreOv?.position) coreGroup.position.set(coreOv.position[0], coreOv.position[1], coreOv.position[2]);
      else coreGroup.position.set(0, 0, 0);
      coreGroup.scale.setScalar(coreOv?.scale ?? 1);

      socketMeshesGroup.children.forEach((arm) => {
        const sid = arm.userData?.socketId as string | undefined;
        const dock = arm.children.find((c) => c.name === 'docked-orb-group');
        if (!dock) return;
        const ov = sid ? getOverride(edits, `orb:${sid}`) : undefined;
        if (ov?.position) dock.position.set(ov.position[0], ov.position[1], ov.position[2]);
        else dock.position.set(0, 0, ORB_DOCK_Z);
        dock.scale.setScalar(ov?.scale ?? 1);

        // Rebuild the arm's umbilical so it follows the (possibly overridden) orb.
        const oldConduit = arm.children.find((c) => c.name === 'dynamic-umbilical');
        if (oldConduit) {
          disposeRebuildableObject(oldConduit);
          arm.remove(oldConduit);
        }
        const isWire = Boolean(arm.userData?.isWireframe);
        const fromPos = new THREE.Vector3(0, 0, 2.5);
        const toPos = dock.position.clone().multiplyScalar(0.85);
        const conduit = createDynamicUmbilical(fromPos, toPos, isWire ? 'wireframe' : 'solid');
        conduit.name = 'dynamic-umbilical';
        if (conduit.children.length > 0) arm.add(conduit);
      });
    };
    applySpatialOverridesRef.current = applySpatialOverrides;

    const rebuildDragTargets = () => {
      const targets: THREE.Object3D[] = [];

      // Docked orbs
      socketMeshesGroup.traverse((child) => {
        if (child.name === 'docked-orb-group') targets.push(child);
      });

      // Portals are anchored to their fixed compass points and are intentionally
      // NOT added to the drag targets, so they cannot be repositioned.

      // Core crystal
      if (coreGroup.children.length > 0) targets.push(coreGroup);

      draggableObjectsRef.current = targets;

      if (dragControlsRef.current) {
        dragControlsRef.current.dispose();
      }

      const drag = new DragControls(targets, camera, renderer.domElement);
      drag.addEventListener('dragstart', () => { controls.enabled = false; objectDragActive = true; });
      drag.addEventListener('drag', (event) => {
        const obj = event.object;
        if (obj.name === 'docked-orb-group' && obj.parent) {
          const armGroup = obj.parent;
          const conduit = armGroup.children.find(c => c.name === 'dynamic-umbilical');
          if (conduit) {
            armGroup.remove(conduit);
            // Recreate procedural umbilical targeting new orb position
            const fromPos = new THREE.Vector3(0, 0, 2.5);
            // We pull it back slightly from the exact center so it grips the surface
            const toPos = obj.position.clone().multiplyScalar(0.85); 
            const isWire = armGroup.userData.isWireframe;
            const newConduit = createDynamicUmbilical(fromPos, toPos, isWire ? 'wireframe' : 'solid');
            newConduit.name = 'dynamic-umbilical';
            armGroup.add(newConduit);
          }

          // Proximity Field logic. Socket nominal positions are in the assembly's
          // local frame, so convert the dragged orb's world position back through
          // the pivot before matching (identity when the assembly is unrotated).
          const worldPos = new THREE.Vector3();
          obj.getWorldPosition(worldPos);
          const localPos = assemblyPivot.worldToLocal(worldPos.clone());
          const nearest = getNearestVacantSocket(localPos, socketsRef.current, 4.0);

          // Reset all socket glow colors to their base state first
          socketMeshesGroup.children.forEach(arm => {
            const ring = arm.children.find(c => c.userData.isSocket);
            if (ring) {
              const baseColor = ring.userData.ringColor as number;
              // If it's the nearest vacant socket, make it pulse white/bright
              const isActive = arm.userData.socketId === nearest?.id;
              tintGlowRing(ring, isActive ? 0xffffff : baseColor, isActive ? 2.5 : 1.0);
            }
          });
        }
      });
      drag.addEventListener('dragend', (event) => {
        controls.enabled = true;
        objectDragActive = false;

        const obj = event.object;
        const snap = snapEnabledRef.current;
        if (obj.name === 'docked-orb-group') {
          const armSocketId = obj.parent?.userData?.socketId as string | undefined;
          const worldPos = new THREE.Vector3();
          obj.getWorldPosition(worldPos);
          const localPos = assemblyPivot.worldToLocal(worldPos.clone());
          const nearest = getNearestVacantSocket(localPos, socketsRef.current, 4.0);

          if (nearest && onDropAttachItem) {
            // Dropped onto a vacant socket: re-bind and clear any free-placement
            // override for this orb's arm (it returns to the default dock).
            const orbChild = obj.children.find(c => c.userData.isOrb);
            const item = orbChild?.userData.item as ApothecaryItem;
            if (item) {
              onDropAttachItem(item, nearest.id);
              if (armSocketId) setSpatialEdits(prev => clearOverride(prev, `orb:${armSocketId}`));
            }
          } else if (armSocketId) {
            // Free placement: persist the orb's local position as a durable
            // spatial edit (snapped to the grid when SNAP is on).
            const raw: [number, number, number] = [obj.position.x, obj.position.y, obj.position.z];
            const pos: readonly [number, number, number] = snap ? snapPositionToGrid(raw, SPATIAL_SNAP_GRID) : raw;
            obj.position.set(pos[0], pos[1], pos[2]);
            setSpatialEdits(prev => setOverride(prev, `orb:${armSocketId}`, { position: pos }));
          }

          // Reset all socket glow colors
          socketMeshesGroup.children.forEach(arm => {
            const ring = arm.children.find(c => c.userData.isSocket);
            if (ring) {
              const baseColor = ring.userData.ringColor as number;
              tintGlowRing(ring, baseColor, 1.0);
            }
          });
        } else if (obj === coreGroup) {
          // The CORE was repositioned: persist its local placement.
          const raw: [number, number, number] = [obj.position.x, obj.position.y, obj.position.z];
          const pos: readonly [number, number, number] = snap ? snapPositionToGrid(raw, SPATIAL_SNAP_GRID) : raw;
          obj.position.set(pos[0], pos[1], pos[2]);
          setSpatialEdits(prev => setOverride(prev, 'core', { position: pos }));
        }
      });
      dragControlsRef.current = drag;
      applySpatialOverrides();
    };

    rebuildDragTargetsRef.current = rebuildDragTargets;
    rebuildDragTargets();

    // Swap the procedural placeholders for the real .glb models as soon as
    // they are in the cache. Without this the core crystal stayed generic
    // forever, since this effect only runs once (empty dep array). Also reused
    // after a failed-model retry, so newly-cached models replace their fallbacks
    // (force=true, since the socket signatures are unchanged by a retry).
    const applyLoadedModels = () => {
      if (disposed) return; // component unmounted before preload resolved
      buildCoreCrystal();
      buildPortalAssembly();
      updateSocketGeometries(true);
      rebuildDragTargets();
      luminaryPresence.applyModel();
      setIsModelsLoaded(true);
    };
    applyLoadedModelsRef.current = applyLoadedModels;
    modelsPreload.then(applyLoadedModels);

    // 5. Post-Processing Bloom
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    composer.setPixelRatio(effectivePixelRatio(quality));
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.68, // strength — was 1.15
      0.42, // radius — was 0.5, tightens the halo around each source
      0.34  // threshold — was 0.2. The biggest lever: at 0.2 nearly every neon
            // surface in this scene cleared the cut and bloomed, which is what
            // made the glow read as an all-over haze rather than highlights.
    );
    // Optional bloom: when disabled the pass is skipped and RenderPass becomes
    // the last enabled pass, rendering straight to screen (EffectComposer sets
    // renderToScreen on the last enabled pass automatically).
    bloomPass.enabled = bloomEnabled;
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);

    // 7. Raycasting & Interaction
    const raycaster = raycasterRef.current;
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return; // left button only; right-click → context menu
      rotateArmed = false;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      // Clicking the Luminary engages or pauses it, as its corner icon does.
      if (raycaster.intersectObject(luminaryPresence.pickProxy, false).length > 0) {
        setLuminaryEngaged(!isLuminaryEngaged());
        return;
      }
      // Selection raycasts the dedicated invisible pick proxies only — a flat set
      // of coarse spheres — not the detailed GLB subtree. The nearest proxy hit
      // resolves selection directly from its userData.pick, with natural depth
      // ordering giving a satellite (its proxy sits outside the orb) precedence
      // over the orb behind it.
      const intersects = raycaster.intersectObjects(pickProxiesRef.current, false);

      if (intersects.length > 0) {
        const pick = intersects[0].object.userData?.pick as
          | { kind: 'satellite'; item: ApothecaryItem }
          | { kind: 'socketNode'; socketId: string }
          | undefined;

        if (pick?.kind === 'satellite') {
          // Clicking a Satellite drills into its Actuator Environment.
          if (onEnterElement) onEnterElement(pick.item);
          else if (onSelectSatellite) onSelectSatellite(pick.item);
          return;
        }

        if (pick?.kind === 'socketNode') {
          const found = socketsRef.current.find(s => s.id === pick.socketId);
          if (found) {
            // A docked Orb drills into its Environment; a vacant socket opens the
            // builder to dock something.
            if (found.connectedItem && onEnterElement) {
              onEnterElement(found.connectedItem);
            } else {
              onSelectSocket(found, found.connectedItem);
            }
          }
        }
      } else if (!viewLockedRef.current) {
        // Empty space (or the bare CORE): arm the turntable so a drag spins the
        // assembly. A DragControls object-drag flips objectDragActive and stands
        // this down; a plain click never moves, so nothing rotates.
        rotateArmed = true;
        rotateLastX = event.clientX;
      }
    };

    // Turntable rotation: a left-drag on empty space spins the assembly pivot
    // around Y only (single plane), leaving the camera and Portals fixed.
    const handlePointerMove = (event: MouseEvent) => {
      if (!rotateArmed || objectDragActive) return;
      if ((event.buttons & 1) === 0) return; // left button no longer held
      const dx = event.clientX - rotateLastX;
      rotateLastX = event.clientX;
      assemblyPivot.rotation.y += dx * 0.005;
    };

    const handlePointerUp = () => { rotateArmed = false; };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    let lastFrameTime = 0;

    // Saved-camera navigation helpers. Bounds are framed over the mechanism
    // (assembly pivot) plus the boundary portals; a move eases via a tween the
    // animation loop advances. Exposed through refs for the toolbar buttons.
    const startCameraTween = (to: CameraPose) => {
      const from = poseFromCamera(camera, controls);
      cameraTweenRef.current = { from, to, start: clock.getElapsedTime(), dur: VIEW_TWEEN_SECONDS };
    };
    const frameAll = () => {
      const box = new THREE.Box3();
      box.setFromObject(assemblyPivot);
      box.expandByObject(portalsRoot);
      if (box.isEmpty()) return;
      const { min, max } = box;
      const pose = frameBounds(
        { min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] },
        { fovDegrees: camera.fov, aspect: camera.aspect, paddingFactor: 1.3 }
      );
      startCameraTween(pose);
    };
    frameAllRef.current = frameAll;
    captureCurrentPoseRef.current = () => poseFromCamera(camera, controls);
    gotoPoseRef.current = (pose: CameraPose) => startCameraTween(pose);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      const dt = Math.min(0.05, elapsedTime - lastFrameTime);
      lastFrameTime = elapsedTime;

      luminaryPresence.update(elapsedTime, dt, motionEnabledRef.current, isLuminaryEngaged());

      // Decorative motion is gated on the reduced-motion control. When motion is
      // off the scene holds a still frame but stays fully interactive — orbit,
      // drag, selection, and rendering all continue.
      if (motionEnabledRef.current) {
        coreGroup.rotation.y = elapsedTime * 0.15;
        coreGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.1;

        if (wireframeMesh) wireframeMesh.scale.setScalar(1.03 + Math.sin(elapsedTime * 2) * 0.02);
        if (innerLocusMesh) innerLocusMesh.scale.setScalar(0.9 + Math.sin(elapsedTime * 3) * 0.15);

        // Prismatic irises spin in place (local Z is the radial/outward normal),
        // so their faceted skin flashes under the bloom and the boundary reads as
        // alive. This is in-place rotation only — the Portals stay fixed at their
        // compass points and never sweep with the CORE/orbs.
        for (const iris of portalIrises) iris.rotation.z = elapsedTime * 0.35;

        if (aetherPoints) {
          aetherPoints.rotation.y = elapsedTime * 0.02;
          aetherPoints.position.y = Math.sin(elapsedTime * 0.18) * 0.5;
          (aetherPoints.material as THREE.PointsMaterial).opacity = 0.24 + Math.sin(elapsedTime * 0.9) * 0.06;
        }

        // Animate Docked Orbs & Satellite Sub-Node Orbits
        socketMeshesGroup.children.forEach(armGroup => {
          const dockedOrbGroup = armGroup.children.find(c => c.name === 'docked-orb-group');
          if (dockedOrbGroup) {
            // ~4x slower than before. The orbit and the host tumble compound, so
            // both were reduced rather than just the orbit. Now scaled by dt so
            // the visual speed is frame-rate independent (rates are per-second:
            // 0.18/s ~= the old 0.003/frame at 60fps, etc.).
            dockedOrbGroup.rotation.y += dt * 0.18;
            dockedOrbGroup.rotation.x += dt * 0.09;

            const satellitesGroup = dockedOrbGroup.children.find(c => c.name === 'orbiting-satellites-group');
            if (satellitesGroup) {
              satellitesGroup.rotation.z += dt * 0.30;
            }
          }
        });

        if (aetherRef.current) {
          aetherRef.current.update(elapsedTime);
        }
      }

      const tween = cameraTweenRef.current;
      if (tween) {
        const t = Math.min(1, (elapsedTime - tween.start) / tween.dur);
        applyPoseToCamera(camera, controls, lerpPose(tween.from, tween.to, easeInOutCubic(t)));
        if (t >= 1) cameraTweenRef.current = null;
      }

      controls.update();
      composer.render();
      labelRenderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      labelRenderer.setSize(w, h);
      if (aetherRef.current) {
        aetherRef.current.setSize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      // Stop the async preload continuation from touching a torn-down scene.
      disposed = true;
      luminaryPresence.dispose();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      cancelAnimationFrame(animationFrameId);
      if (dragControlsRef.current) dragControlsRef.current.dispose();
      controls.dispose();
      starSprite.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      aetherGeo.dispose();
      aetherMat.dispose();

      // Free the scene-owned rebuildable groups. clearRebuildableGroup only
      // disposes procedural geometry / owned materials and detaches CSS2D totem
      // DOM, so borrowed (cached) GLB geometry and materials stay intact.
      clearRebuildableGroup(socketMeshesGroup);
      clearRebuildableGroup(portalsRoot);
      clearRebuildableGroup(coreGroup);

      // Ghost drag mesh + trajectory line are procedural and owned by this
      // component, so dispose their geometry and material outright.
      if (ghostMeshRef.current) {
        ghostMeshRef.current.geometry?.dispose();
        const gm = ghostMeshRef.current.material;
        if (Array.isArray(gm)) gm.forEach((m) => m.dispose());
        else gm?.dispose();
        ghostMeshRef.current = null;
      }
      if (trajectoryLineRef.current) {
        trajectoryLineRef.current.geometry?.dispose();
        const tm = trajectoryLineRef.current.material;
        if (Array.isArray(tm)) tm.forEach((m) => m.dispose());
        else tm?.dispose();
        trajectoryLineRef.current = null;
      }

      // Post-processing chain.
      renderPass.dispose();
      bloomPass.dispose();
      composer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (container.contains(labelRenderer.domElement)) {
        container.removeChild(labelRenderer.domElement);
      }
      renderer.dispose();

      // Drop pipeline handles so the quality/bloom effects no-op after unmount.
      rendererRef.current = null;
      composerRef.current = null;
      bloomPassRef.current = null;
      assemblyPivotRef.current = null;
      applyLoadedModelsRef.current = undefined;
    };
    // sceneRemountKey re-runs the whole build after a WebGL context loss: the
    // cleanup above disposes the dead renderer/canvas, then a fresh one is built.
  }, [sceneRemountKey]);

  // Effect to update Aether lighting when props change
  useEffect(() => {
    if (aetherRef.current) {
      aetherRef.current.setAmbient(0xffffff, ambientIntensity);
    }
  }, [ambientIntensity]);

  useEffect(() => {
    if (aetherRef.current) {
      aetherRef.current.setDirectional(0xffffff, directionalIntensity, new THREE.Vector3());
      aetherRef.current.setDirectionalAngle(directionalAngle);
    }
  }, [directionalIntensity, directionalAngle]);

  // Retune device pixel ratio live when the quality preset changes. Applied to
  // both the renderer and the composer so post-processing buffers match.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dpr = effectivePixelRatio(quality);
    renderer.setPixelRatio(dpr);
    composerRef.current?.setPixelRatio(dpr);
  }, [quality]);

  // Toggle the bloom post pass without rebuilding the scene. When disabled the
  // RenderPass becomes the last enabled pass and renders straight to screen.
  useEffect(() => {
    if (bloomPassRef.current) bloomPassRef.current.enabled = bloomEnabled;
  }, [bloomEnabled]);

  // Persist spatial edits and re-apply them to the live scene on every change
  // (drag-end, undo, redo, reset). Serialization drops the undo/redo history.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SPATIAL_EDITS_STORAGE_KEY,
        JSON.stringify(serializeSpatialEdits(spatialEdits))
      );
    } catch (error) {
      console.warn('[SPATIAL] Spatial edits could not be persisted.', error);
    }
    applySpatialOverridesRef.current?.();
  }, [spatialEdits]);

  // Persist saved camera views.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVED_VIEWS_STORAGE_KEY,
        JSON.stringify(serializeSavedViews(savedViews))
      );
    } catch (error) {
      console.warn('[VIEW] Saved views could not be persisted.', error);
    }
  }, [savedViews]);

  // Track per-model load status so the HUD can show progress and surface any
  // failed models with a retry, instead of the binary "initializing" overlay.
  useEffect(() => {
    const recompute = () => {
      let loaded = 0;
      const errored: ModelKey[] = [];
      for (const key of ALL_MODEL_KEYS) {
        const st = getModelStatus(key);
        if (st === 'loaded') loaded++;
        else if (st === 'error') errored.push(key);
      }
      setModelProgress({ loaded, errored });
    };
    recompute();
    return subscribeModelStatus(recompute);
  }, []);

  // Retry every failed model, then swap the now-cached meshes in for their
  // procedural fallbacks. retryModel awaits the renderer-ready gate internally,
  // so no renderer handle is needed here.
  const handleRetryFailed = useCallback(async () => {
    const failed = modelProgress.errored;
    if (failed.length === 0 || retrying) return;
    setRetrying(true);
    try {
      await Promise.all(failed.map((key) => retryModel(key)));
    } finally {
      setRetrying(false);
    }
    applyLoadedModelsRef.current?.();
  }, [modelProgress.errored, retrying]);

  // Saved-camera navigation + durable spatial-edit toolbar actions.
  const hasSpatialOverrides = Object.keys(spatialEdits.overrides).length > 0;
  const savedViewNames = listViewNames(savedViews);

  const handleFrameAll = useCallback(() => frameAllRef.current?.(), []);
  const handleSaveView = useCallback(() => {
    const pose = captureCurrentPoseRef.current?.();
    if (!pose) return;
    setSavedViews((prev) => {
      const used = new Set(listViewNames(prev));
      let i = 1;
      while (used.has(`V${i}`)) i++;
      return saveView(prev, `V${i}`, pose);
    });
  }, []);
  const handleRestoreSavedView = useCallback((name: string) => {
    const pose = getView(savedViews, name);
    if (pose) gotoPoseRef.current?.(pose);
  }, [savedViews]);
  const handleDeleteSavedView = useCallback((name: string) => {
    setSavedViews((prev) => deleteView(prev, name));
  }, []);
  const handleUndoEdit = useCallback(() => setSpatialEdits((prev) => undo(prev)), []);
  const handleRedoEdit = useCallback(() => setSpatialEdits((prev) => redo(prev)), []);
  const handleResetEdits = useCallback(() => setSpatialEdits((prev) => clearAll(prev)), []);

  // Update socket ring highlights helper
  // Restores a ring to the palette colour assigned to its arm. Previously these
  // helpers hard-reset every vacant ring to cyan, which wiped the per-arm colours
  // the moment anything was dragged.
  const restoreRing = (ring: THREE.Object3D, state?: string) => {
    const base = ring.userData?.ringColor as number | undefined;
    if (base !== undefined) tintGlowRing(ring, base, state === 'Active' ? 1.3 : 1);
  };

  const highlightSocketAsTarget = (socketId: string) => {
    socketMeshMapRef.current.forEach((socketGroup, sId) => {
      const ring = socketGroup.children.find(c => c.userData?.isSocket);
      if (!ring) return;

      const s = socketsRef.current.find(item => item.id === sId);
      if (sId === socketId) {
        tintGlowRing(ring, 0x00ff9d, 1.9); // emerald magnetic-snap flare
      } else {
        restoreRing(ring, s?.state);
      }
    });
  };

  const clearSocketHighlights = () => {
    socketMeshMapRef.current.forEach((socketGroup, sId) => {
      const ring = socketGroup.children.find(c => c.userData?.isSocket);
      if (!ring) return;
      const s = socketsRef.current.find(item => item.id === sId);
      restoreRing(ring, s?.state);
    });
  };

  // HTML5 Drag Over Handler (2D-to-3D Raycast, Proximity Magnetic Snapping & Trajectory Line)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const targetPosition = raycaster.ray.at(12, new THREE.Vector3());

    // Create 3D Ghost Mesh if not exists
    if (!ghostMeshRef.current) {
      const ghost = createGhostMesh('sphere', 0x00ff9d);
      ghostMeshRef.current = ghost;
      sceneRef.current.add(ghost);
    }
    const ghostMesh = ghostMeshRef.current;

    // Check Proximity Snapping to Vacant Outer Pedestal Platform R = 6.5 (d < 3.0 units)
    let minDistance = Infinity;
    let nearestSocketId: string | null = null;
    let nearestSocketWorldPos: THREE.Vector3 | null = null;

    const currentSockets = socketsRef.current;
    const count = currentSockets.length || 8;

    // A satellite tethers to an Orb, so it targets OCCUPIED sockets. Only an Orb
    // can dock into a VACANT socket — nothing else has the Umbilical handshake
    // code. Anything that is neither offers no magnetic target at all. Detected
    // from dataTransfer.types, since getData() is unreadable mid-drag.
    const draggingSatellite = e.dataTransfer.types.includes(SATELLITE_DRAG_TYPE);
    const draggingOrb = e.dataTransfer.types.includes(ORB_DRAG_TYPE);

    const pivot = assemblyPivotRef.current;
    currentSockets.forEach((sBinding, idx) => {
      const eligible = draggingSatellite
        ? !!sBinding.connectedItem
        : (draggingOrb && sBinding.state === 'Vacant');
      if (eligible) {
        const angle = idx * (Math.PI / 4);
        // Nominal tip is in the assembly's local frame; move it through the pivot
        // so snapping follows the arms when the assembly has been turntabled.
        const pedestalWorldPos = getUmbilicalTipVector(angle, ORB_DOCK_Z);
        if (pivot) pivot.localToWorld(pedestalWorldPos);
        const dist = targetPosition.distanceTo(pedestalWorldPos);
        if (dist < minDistance) {
          minDistance = dist;
          nearestSocketId = sBinding.id;
          nearestSocketWorldPos = pedestalWorldPos;
        }
      }
    });

    const MAGNETIC_THRESHOLD = 3.0;
    if (minDistance < MAGNETIC_THRESHOLD && nearestSocketWorldPos && nearestSocketId) {
      // Lerp snap 3D Ghost Mesh directly to Outer Tip R = 6.5
      ghostMesh.position.lerp(nearestSocketWorldPos, 0.35);
      snappedSocketIdRef.current = nearestSocketId;

      const nearestSocket = socketsRef.current.find(s => s.id === nearestSocketId);

      highlightSocketAsTarget(nearestSocketId);

      // Render Dashed Trajectory Line connecting Dragged Ghost Cursor to Target Tip (R = 6.5)
      if (sceneRef.current) {
        if (trajectoryLineRef.current) {
          sceneRef.current.remove(trajectoryLineRef.current);
        }
        const curve = new THREE.QuadraticBezierCurve3(
          targetPosition,
          new THREE.Vector3().addVectors(targetPosition, nearestSocketWorldPos).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.5, 0)),
          nearestSocketWorldPos
        );
        const points = curve.getPoints(24);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xffb000,
          dashSize: 0.2,
          gapSize: 0.1,
          linewidth: 2
        });
        const trajectoryLine = new THREE.Line(lineGeo, lineMat);
        trajectoryLine.computeLineDistances();
        trajectoryLineRef.current = trajectoryLine;
        sceneRef.current.add(trajectoryLine);
      }
    } else {
      // Follow 3D raycast target position
      ghostMesh.position.copy(targetPosition);
      snappedSocketIdRef.current = null;

      clearSocketHighlights();

      if (trajectoryLineRef.current && sceneRef.current) {
        sceneRef.current.remove(trajectoryLineRef.current);
        trajectoryLineRef.current = null;
      }
    }

    ghostMesh.rotation.x += 0.03;
    ghostMesh.rotation.y += 0.04;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (ghostMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(ghostMeshRef.current);
      ghostMeshRef.current = null;
    }
    if (trajectoryLineRef.current && sceneRef.current) {
      sceneRef.current.remove(trajectoryLineRef.current);
      trajectoryLineRef.current = null;
    }
    snappedSocketIdRef.current = null;
    clearSocketHighlights();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (ghostMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(ghostMeshRef.current);
      ghostMeshRef.current = null;
    }
    if (trajectoryLineRef.current && sceneRef.current) {
      sceneRef.current.remove(trajectoryLineRef.current);
      trajectoryLineRef.current = null;
    }
    clearSocketHighlights();

    const snappedId = snappedSocketIdRef.current;
    snappedSocketIdRef.current = null;

    const dataRaw = e.dataTransfer.getData('application/json');
    let item: ApothecaryItem | null = null;

    if (dataRaw) {
      try {
        const parsed = JSON.parse(dataRaw);
        item = parsed.item || parsed;
      } catch (err) {
        console.error('Error parsing dropped item payload:', err);
      }
    }

    if (!item) return;

    // Portals are boundary fixtures, not socket occupants — dropping one adds
    // a gateway at the next free boundary slot rather than docking anywhere.
    if (item.category === 'Portals') {
      if (onAddPortal) onAddPortal();
      return;
    }

    // A satellite tethers to whichever Orb it was dropped on; it never docks
    // into a bare socket, so an unsnapped satellite drop is simply ignored.
    if (isSatelliteItem(item)) {
      const host = snappedId ? socketsRef.current.find(s => s.id === snappedId) : undefined;
      if (host?.connectedItem && onAttachSatellite) {
        onAttachSatellite(item, host.id);
      }
      return;
    }

    // Architectural invariant: only an Orb carries the Umbilical handshake code,
    // so only an Orb can dock to the POD. A Formula, Ingredient, Constellation,
    // Core, Umbilical, etc. has no handshake with the Umbilical and is inert here.
    if (!isOrbItem(item)) {
      console.info(
        `[UMBILICAL] ${item.name} (${item.category}) has no handshake code for the Umbilical — only Orbs dock to the POD.`
      );
      return;
    }

    const targetSocketId = snappedId || socketsRef.current.find(s => s.state === 'Vacant')?.id;
    if (targetSocketId) {
      const targetSocket = socketsRef.current.find(s => s.id === targetSocketId);
      if (targetSocket && onDropAttachItem) {
        onDropAttachItem(item, targetSocketId);
      } else if (targetSocket && onSelectSocket) {
        onSelectSocket(targetSocket, item);
      }
    }
  };

  // Right-Click Context Menu Raycasting Handler (Tier 1 Manifest Inspector Trigger)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      let currentObj: THREE.Object3D | null = intersects[0].object;
      while (currentObj && !currentObj.userData?.socketId && currentObj.parent) {
        currentObj = currentObj.parent;
      }

      if (currentObj && currentObj.userData?.socketId) {
        const sId = currentObj.userData.socketId;
        const foundSocket = socketsRef.current.find(s => s.id === sId);
        if (foundSocket && onRightClickElement) {
          onRightClickElement(foundSocket, foundSocket.connectedItem);
        }
      }
    }
  };

  return (
    <div
      className="absolute inset-0 z-0 w-full h-full overflow-hidden bg-[#080b10]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* GLTF Preloader Overlay HUD — shows live loaded/total progress. */}
      {!isModelsLoaded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080b10]/90 backdrop-blur-sm pointer-events-none">
          <div className="px-6 py-3 bg-cyan-950/80 border border-cyan-500/50 rounded-full shadow-[0_0_25px_rgba(0,243,255,0.3)] flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-[#00f3ff] animate-ping" />
            <span className="text-sm font-mono font-bold text-[#00f3ff] tracking-wider uppercase">
              [ INITIALIZING 3D ASSETS — {modelProgress.loaded}/{ALL_MODEL_KEYS.length} ]
            </span>
          </div>
        </div>
      )}

      {/* Failed-asset chip: persistent after load with a retry, so a model that
          failed to fetch is surfaced instead of silently missing from the scene. */}
      {isModelsLoaded && modelProgress.errored.length > 0 && (
        <div className="absolute top-4 right-4 z-30 flex items-center space-x-3 px-4 py-2 rounded-xl bg-rose-950/85 backdrop-blur-md border border-rose-500/50 shadow-[0_0_20px_rgba(255,42,109,0.25)]">
          <span className="text-[11px] font-mono font-bold text-rose-200 tracking-wide">
            {modelProgress.errored.length} asset{modelProgress.errored.length > 1 ? 's' : ''} failed to load
          </span>
          <button
            onClick={handleRetryFailed}
            disabled={retrying}
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-100 border border-rose-400/50 hover:bg-rose-500/35 disabled:opacity-50 disabled:cursor-wait transition-colors"
          >
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* WebGL context-loss recovery. The GPU dropped the context, so the live
          scene is frozen and its resources are stale; Restore rebuilds a fresh
          renderer, canvas, and scene on a new context. */}
      {contextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#080b10]/95 backdrop-blur-md">
          <div className="flex flex-col items-center space-y-4 px-8 py-6 rounded-2xl bg-rose-950/80 border border-rose-500/50 shadow-[0_0_30px_rgba(255,42,109,0.25)] text-center">
            <span className="text-xs font-mono font-bold text-rose-200 tracking-widest uppercase">
              3D VIEW INTERRUPTED — GPU CONTEXT LOST
            </span>
            <span className="text-[11px] font-mono text-rose-300/80 max-w-xs">
              The graphics context was released by the browser or driver. Your workspace is safe; only the live 3D view needs to be rebuilt.
            </span>
            <button
              onClick={handleRestoreView}
              className="px-4 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-500/25 text-rose-100 border border-rose-400/50 hover:bg-rose-500/40 transition-colors"
            >
              Restore 3D View
            </button>
          </div>
        </div>
      )}

      {/* View quality / motion / bloom controls (display-only). Lifted clear of
          the bottom command bar so both rows stay visible. */}
      <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end space-y-1.5">
        <div className="flex items-center space-x-1 px-2 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30">
          <span className="text-[9px] font-mono font-bold text-cyan-500/70 tracking-widest px-1.5">QUALITY</span>
          {QUALITY_PRESET_ORDER.map((p) => (
            <button
              key={p}
              onClick={() => { setQuality(p); setBloomEnabled(QUALITY_PRESETS[p].bloom); }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide transition-colors ${
                quality === p
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {QUALITY_PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-1 px-2 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30">
          <button
            onClick={() => setMotionEnabled((v) => !v)}
            title="Toggle decorative motion (honours OS reduced-motion by default)"
            className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide transition-colors border ${
              motionEnabled
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-transparent'
            }`}
          >
            MOTION {motionEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setBloomEnabled((v) => !v)}
            title="Toggle the bloom post-processing pass"
            className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide transition-colors border ${
              bloomEnabled
                ? 'bg-purple-500/20 text-purple-200 border-purple-400/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-transparent'
            }`}
          >
            BLOOM {bloomEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setViewLocked((v) => !v)}
            title="Lock the view — freeze the turntable so dragging no longer rotates the assembly"
            className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide transition-colors border ${
              viewLocked
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-transparent'
            }`}
          >
            {viewLocked ? 'LOCKED' : 'LOCK'}
          </button>
        </div>

        {/* Saved-camera navigation: frame the whole assembly, save the current
            viewpoint, and fly to (or delete) a saved one. */}
        <div className="flex items-center space-x-1 px-2 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30">
          <span className="text-[9px] font-mono font-bold text-cyan-500/70 tracking-widest px-1.5">VIEW</span>
          <button
            onClick={handleFrameAll}
            title="Frame the whole assembly in view"
            className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent transition-colors"
          >
            FRAME
          </button>
          <button
            onClick={handleSaveView}
            title="Save the current camera view"
            className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent transition-colors"
          >
            SAVE
          </button>
          {savedViewNames.map((name) => (
            <button
              key={name}
              onClick={() => handleRestoreSavedView(name)}
              onContextMenu={(e) => { e.preventDefault(); handleDeleteSavedView(name); }}
              title="Click to fly here · right-click to delete"
              className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide bg-cyan-500/15 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/30 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>

        {/* Durable spatial edits: undo/redo drag placements, toggle grid snap,
            and reset every override back to the default layout. */}
        <div className="flex items-center space-x-1 px-2 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30">
          <span className="text-[9px] font-mono font-bold text-cyan-500/70 tracking-widest px-1.5">EDITS</span>
          <button
            onClick={handleUndoEdit}
            disabled={!canUndo(spatialEdits)}
            title="Undo the last placement change"
            className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            UNDO
          </button>
          <button
            onClick={handleRedoEdit}
            disabled={!canRedo(spatialEdits)}
            title="Redo the last undone placement change"
            className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            REDO
          </button>
          <button
            onClick={() => setSnapEnabled((v) => !v)}
            title="Snap dragged placements to the grid"
            className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide transition-colors border ${
              snapEnabled
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-transparent'
            }`}
          >
            SNAP {snapEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={handleResetEdits}
            disabled={!hasSpatialOverrides}
            title="Reset all placements back to the default layout"
            className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide text-amber-300 hover:text-amber-100 hover:bg-amber-500/20 border border-transparent disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            RESET
          </button>
        </div>
      </div>

      {/* CORE Crystal selector */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1 px-2 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30">
        <span className="text-[9px] font-mono font-bold text-cyan-500/70 tracking-widest px-1.5">CORE</span>
        {CORE_CRYSTAL_VARIANTS.map((v) => (
          <button
            key={v.key}
            onClick={() => setCrystalVariant(v.key)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wide transition-colors ${
              crystalVariant === v.key
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

    </div>
  );
};

export const ThreeCanvas: React.FC<ThreeCanvasProps> = (props) => {
  if (isThreeRuntimeMainViewP0Enabled()) {
    return (
      <ThreeRuntimeMainViewP0
        sockets={props.sockets}
        onSelectSocket={props.onSelectSocket}
        onEnterElement={props.onEnterElement}
        ambientIntensity={props.ambientIntensity}
        directionalIntensity={props.directionalIntensity}
        directionalAngle={props.directionalAngle}
      />
    );
  }
  return <LegacyThreeCanvas {...props} />;
};
