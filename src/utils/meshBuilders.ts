import * as THREE from 'three';
import { getModelStatus, gltfModelCache, preloadAllGltfModels } from './gltfLoaderService';
import { AEGIS_MODEL_URLS } from './assetRegistry';

// Legacy exports and alias mappings
export const AEGIS_GLTF_ASSETS = AEGIS_MODEL_URLS;
export const ASSET_PATHS = AEGIS_MODEL_URLS;
export const gltfCache = gltfModelCache;
export const preloadAegisModels = preloadAllGltfModels;
export const preloadGLTFAssets = preloadAllGltfModels;

/**
 * Selectable CORE Crystal variants. `fit` normalises each to the same on-screen
 * height — crystals.glb is a wide cluster (1.0 x 0.77) rather than a tall
 * single crystal, so a shared scale would render it noticeably smaller.
 */
export const CORE_CRYSTAL_VARIANTS = [
  { key: 'coreCrystal', label: 'SEED', fit: 1.0 },
  { key: 'coreCaged', label: 'CAGED', fit: 1.0 },
  { key: 'coreCaged2', label: 'CAGED II', fit: 1.0 },
  { key: 'coreCluster', label: 'CLUSTER', fit: 1.29 },
  { key: 'coreHaze', label: 'HAZE', fit: 1.6 }
] as const;

export function createCoreCrystalMesh(variantKey = 'coreCrystal'): THREE.Group | null {
  const crystalModel = gltfModelCache.get(variantKey) || gltfModelCache.get('coreCrystal');
  if (crystalModel) {
    const container = new THREE.Group();
    const crystalClone = crystalModel.clone(true);
    crystalClone.position.set(0, 0, 0);
    container.add(crystalClone);
    return container;
  }
  if (getModelStatus(variantKey) === 'error' && getModelStatus('coreCrystal') === 'error') {
    console.error("coreCrystal model missing from cache!");
  }
  return null;
}

/**
 * Spawns Orbs, Portals, and Satellites using exact loaded GLTF assets
 */
export function createAegisElementMesh(elementType: string, satelliteClassIndex?: number): THREE.Group {
  const container = new THREE.Group();
  let modelKey = 'orb';

  if (elementType === 'portal') {
    modelKey = 'portal';
  } else if (elementType === 'portal_tender') {
    modelKey = 'portalTender';
  } else if (elementType === 'satellite' && satelliteClassIndex) {
    // Maps Satellite classes 1-5 to SATELITE1.glb through SATELITE5.glb
    modelKey = `satelite${satelliteClassIndex}`;
  }

  const cachedModel = gltfModelCache.get(modelKey) || gltfModelCache.get('orb');
  if (cachedModel) {
    const meshClone = cachedModel.clone(true);
    container.add(meshClone);
  } else {
    if (getModelStatus(modelKey) === 'error' && getModelStatus('orb') === 'error') {
      console.error(`Model [${modelKey}] missing from cache!`);
    }
  }

  return container;
}

/**
 * Spawns a 3D Orb mesh using GLTF asset if available, falling back to SphereGeometry
 */
export function createOrb3DNode(orbData: any): THREE.Group {
  const containerGroup = new THREE.Group();

  const elemGroup = createAegisElementMesh(orbData?.elementType || 'orb');
  if (elemGroup.children.length > 0) {
    elemGroup.scale.set(0.8, 0.8, 0.8);
    containerGroup.add(elemGroup);
  } else {
    // Fallback Procedural Sphere
    const fallbackMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x00f3ff, emissiveIntensity: 0.5 })
    );
    containerGroup.add(fallbackMesh);
  }

  return containerGroup;
}

/** Orb model variants. Assigned per item so a given item always looks the same. */
export const ORB_VARIANTS = [
  'orb', 'orb2', 'orb3', 'orb4', 'orb5', 'orb6',
  'orb27', 'orb28', 'orb29', 'orb90', 'orbInteresting'
] as const;

/** Formula (T2) models — a distinct silhouette rather than a reskinned Orb. */
export const FORMULA_VARIANTS = ['formula1', 'formula31', 'formula32', 'formula33'] as const;

function hashItemId(itemId: string): number {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Deterministic variant pick. Hashing the item id (rather than using the socket
 * index) keeps an Orb's appearance stable when it is moved between sockets.
 */
export function orbVariantForItem(itemId: string): string {
  return ORB_VARIANTS[hashItemId(itemId) % ORB_VARIANTS.length];
}

/**
 * Single source of truth for which model represents a catalogue item, shared by
 * the 3D scene and the Apothecary thumbnails so the two can never disagree.
 */
export function modelKeyForItem(item: {
  id: string;
  category: string;
  satelliteClass?: string;
  modelKey?: string;
}): string {
  // An explicit pin always wins — this is what keeps a card's name and its
  // rendered model in agreement.
  if (item.modelKey) return item.modelKey;

  if (item.category === 'Portals') return 'portal';

  if (item.category === 'Satellites' || item.satelliteClass) {
    const order = ['I/O', 'Compute', 'Storage', 'Validation', 'Security'];
    const idx = order.indexOf(item.satelliteClass ?? 'Compute');
    return `satelite${idx >= 0 ? idx + 1 : 2}`;
  }

  if (item.category === 'Cores') return 'coreCrystal';
  if (item.category === 'Umbilicals') return 'umbilical';

  if (item.category === 'Formulas') {
    return FORMULA_VARIANTS[hashItemId(item.id) % FORMULA_VARIANTS.length];
  }

  return orbVariantForItem(item.id);
}

/** Clones a specific Orb variant, falling back to the base ORB model. */
export function createOrbVariantMesh(modelKey: string): THREE.Group {
  const container = new THREE.Group();
  const cached = gltfModelCache.get(modelKey) || gltfModelCache.get('orb');
  if (cached) container.add(cached.clone(true));
  return container;
}

/** Umbilical variants used for intact conduits, cycled across the socket arms. */
export const UMBILICAL_VARIANTS = ['umbilical', 'umbilicalLong', 'umbilicalLong2', 'umbilicalShort'] as const;
export const UMBILICAL_SEVERED = 'umbilicalBroken';

interface ConduitFit {
  align: THREE.Quaternion; // rotates the model's long axis onto +Z
  centroid: THREE.Vector3;
  length: number; // extent along its long axis
  cross: number; // widest extent perpendicular to it
}

const conduitFitCache = new Map<string, ConduitFit>();

/**
 * Finds a conduit model's true long axis via PCA on its vertices.
 *
 * The variants are authored inconsistently — some run along +X, some +Z, and
 * UMBILICAL_BROKEN_LONG sits on a diagonal (0.69, 0.24, 0.69), which a bounding
 * box cannot express. Fitting the principal axis handles all of them uniformly,
 * and means a new variant can be dropped in without hardcoding its orientation.
 */
function fitConduit(key: string, source: THREE.Group): ConduitFit {
  const cached = conduitFitCache.get(key);
  if (cached) return cached;

  source.updateMatrixWorld(true);
  const pts: THREE.Vector3[] = [];
  source.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(pos.count / 2000)); // cap the sample
    for (let i = 0; i < pos.count; i += stride) {
      pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    }
  });

  const centroid = new THREE.Vector3();
  if (pts.length === 0) {
    const fit = { align: new THREE.Quaternion(), centroid, length: 1, cross: 1 };
    conduitFitCache.set(key, fit);
    return fit;
  }
  for (const p of pts) centroid.add(p);
  centroid.divideScalar(pts.length);

  // Covariance, then power iteration for the dominant eigenvector.
  const c = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of pts) {
    const d = [p.x - centroid.x, p.y - centroid.y, p.z - centroid.z];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) c[i * 3 + k] += d[i] * d[k];
  }
  let vx = 1, vy = 1, vz = 1;
  for (let it = 0; it < 64; it++) {
    const nx = c[0] * vx + c[1] * vy + c[2] * vz;
    const ny = c[3] * vx + c[4] * vy + c[5] * vz;
    const nz = c[6] * vx + c[7] * vy + c[8] * vz;
    const m = Math.hypot(nx, ny, nz) || 1;
    vx = nx / m; vy = ny / m; vz = nz / m;
  }
  const axis = new THREE.Vector3(vx, vy, vz).normalize();

  const align = new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 0, 1));

  // Extents in the aligned frame: z along the conduit, x/y across it.
  let minZ = Infinity, maxZ = -Infinity, cross = 0;
  const tmp = new THREE.Vector3();
  for (const p of pts) {
    tmp.copy(p).sub(centroid).applyQuaternion(align);
    if (tmp.z < minZ) minZ = tmp.z;
    if (tmp.z > maxZ) maxZ = tmp.z;
    cross = Math.max(cross, Math.abs(tmp.x), Math.abs(tmp.y));
  }

  const fit: ConduitFit = { align, centroid, length: Math.max(1e-3, maxZ - minZ), cross: Math.max(1e-3, cross * 2) };
  conduitFitCache.set(key, fit);
  return fit;
}

/**
 * Builds an Umbilical Conduit (CK-01) running along local +Z from startZ to endZ.
 *
 * The model is aligned to +Z, normalised to a consistent thickness (native
 * cross-sections vary from 0.15 to 0.47, which would otherwise look inconsistent
 * arm to arm), then tiled along the span. Segment count is chosen so no copy is
 * stretched past maxStretch — filling the whole span with one copy would smear
 * the coupling collars, but a little stretch keeps the joins evenly spaced.
 *
 * Returns an empty group if the model is not cached yet; callers fall back.
 */
export function createUmbilicalConduit(
  modelKey: string,
  startZ: number,
  endZ: number,
  thickness = 0.44,
  maxStretch = 1.6,
  flip = false
): THREE.Group {
  const container = new THREE.Group();
  const source = gltfModelCache.get(modelKey);
  if (!source) return container;

  const fit = fitConduit(modelKey, source);
  const span = endZ - startZ;
  const segments = Math.max(1, Math.ceil(span / (fit.length * maxStretch)));
  const segLength = span / segments;
  const crossScale = thickness / fit.cross;

  for (let i = 0; i < segments; i++) {
    const inner = source.clone(true);
    inner.position.copy(fit.centroid).multiplyScalar(-1);

    // Rotation must be applied by a parent: a node's own scale is applied
    // before its rotation, so scaling the aligned axis has to happen outside.
    const aligner = new THREE.Group();
    aligner.add(inner);
    aligner.quaternion.copy(fit.align);
    if (flip) {
      // End-for-end about Y, so the gripping end faces +Z (outward, at the Orb)
      // while the model stays upright.
      aligner.quaternion.premultiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      );
    }

    const segment = new THREE.Group();
    segment.add(aligner);
    segment.scale.set(crossScale, crossScale, segLength / fit.length);
    segment.position.set(0, 0, startZ + segLength * (i + 0.5));
    container.add(segment);
  }

  return container;
}

/**
 * Calculates the exact 3D tip coordinate for an Umbilical socket arm
 */
export function getUmbilicalTipVector(angleRadians: number, radialDistance: number = 6.5): THREE.Vector3 {
  const x = Math.sin(angleRadians) * radialDistance;
  const z = Math.cos(angleRadians) * radialDistance;
  return new THREE.Vector3(x, 0.5, z);
}

export const getUmbilicalTipPosition = (ringPos: THREE.Vector3, corePos: THREE.Vector3 = new THREE.Vector3(0,0,0), offset: number = 4.0): THREE.Vector3 => {
  const dir = new THREE.Vector3().subVectors(ringPos, corePos).normalize();
  return new THREE.Vector3().addVectors(ringPos, dir.multiplyScalar(offset));
};
