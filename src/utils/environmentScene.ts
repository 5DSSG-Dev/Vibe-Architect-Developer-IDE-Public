import * as THREE from 'three';
import {
  createOrbVariantMesh,
  modelKeyForItem
} from './meshBuilders';
import { createDynamicTether } from './splineBuilder';
import type { ApothecaryItem, GeometryType } from '../engine/relationEngine';
import { getItem3DTaxonomy } from '../engine/relationEngine';

/**
 * environmentScene — a pure Three.js builder for a single "element environment".
 *
 * A drill-down view enters an Element's world by centering one item and ringing
 * its related items around it, joined by tethers. This module builds exactly that
 * scene group and nothing else: no lights, no cameras, no React, no DOM. The
 * caller owns the renderer, the camera, and disposal.
 *
 * Two usages share one builder:
 *   - Orb environment:       center = the Orb,        children = its Satellites.
 *   - Satellite environment: center = the Satellite,  children = its Actuators.
 *
 * Visual grammar mirrors ThreeCanvas's docked-orb scene (see
 * createDockedOrbGroup / createSatelliteMesh / createSatelliteTether): the same
 * GLTF-variant meshes with a procedural emissive fallback, and additive-blended
 * tethers running from the center's surface out to each child.
 *
 * Raycasting contract — every clickable object carries userData a raycaster can
 * read by walking up parents from the intersected mesh:
 *   - the center group:  { isEnvCenter: true, centerItem }
 *   - each child group:  { isEnvChild: true,  childItem }
 * Procedurally created meshes are additionally tagged
 *   { proceduralGeometry: true, ownedMaterial: true }
 * so a caller can dispose their geometry and material safely without touching
 * geometry/materials shared by cached GLTF clones.
 */

export interface EnvironmentSceneOptions {
  /** The focused element, rendered larger at the local origin. */
  center: ApothecaryItem;
  /** Related elements arranged evenly on a ring around the center. */
  children: ApothecaryItem[];
  /** Radius of the child ring in the local XY plane. Defaults to 4.5. */
  ringRadius?: number;
}

const DEFAULT_RING_RADIUS = 4.5;

/** Scale applied to the center's GLTF variant so it reads as the focus. */
const CENTER_MODEL_SCALE = 1.9;
/** Scale applied to each child's GLTF variant (smaller than the center). */
const CHILD_MODEL_SCALE = 0.85;

/** Radius of the procedural fallback sphere/solid for the center. */
const CENTER_FALLBACK_RADIUS = 0.7;
/** Radius of the procedural fallback solid for a child. */
const CHILD_FALLBACK_RADIUS = 0.32;

/**
 * Builds a procedural emissive fallback mesh for an item, matching the shape
 * grammar ThreeCanvas uses when a GLTF model is not cached. The mesh owns its
 * geometry and material, so both are tagged for safe disposal.
 */
function createProceduralFallbackMesh(item: ApothecaryItem, radius: number): THREE.Mesh {
  const taxonomy = getItem3DTaxonomy(item);
  const geometry = geometryForType(taxonomy.geometryType, radius);

  const material = new THREE.MeshPhysicalMaterial({
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

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.proceduralGeometry = true;
  mesh.userData.ownedMaterial = true;
  return mesh;
}

/** Maps the taxonomy geometry type onto a concrete Three.js geometry. */
function geometryForType(type: GeometryType, radius: number): THREE.BufferGeometry {
  switch (type) {
    case 'octahedron':
      return new THREE.OctahedronGeometry(radius);
    case 'cube':
      return new THREE.BoxGeometry(radius * 1.1, radius * 1.1, radius * 1.1);
    case 'cylinder':
      return new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, radius * 1.3, 16);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(radius);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(radius * 1.1);
    case 'sphere':
    default:
      return new THREE.SphereGeometry(radius, 24, 24);
  }
}

/**
 * Builds the visual for one element: the cached GLTF variant when available,
 * otherwise the procedural emissive fallback. Returns a group scaled to the
 * requested size, ready to be positioned and tagged by the caller.
 */
function createElementVisual(item: ApothecaryItem, modelScale: number, fallbackRadius: number): THREE.Group {
  const group = new THREE.Group();
  const variant = createOrbVariantMesh(modelKeyForItem(item));

  if (variant.children.length > 0) {
    variant.scale.setScalar(modelScale);
    group.add(variant);
  } else {
    group.add(createProceduralFallbackMesh(item, fallbackRadius));
  }

  return group;
}

/**
 * Additive-blended tether fallback, replicating ThreeCanvas's createSatelliteTether
 * shell style: a bright thin core wrapped by two wider, fainter sleeves so it reads
 * as a light conduit. Used only when createDynamicTether yields no geometry.
 */
function createAdditiveTetherFallback(from: THREE.Vector3, to: THREE.Vector3, color: number): THREE.Group {
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
 * Assembles an element environment scene group.
 *
 * The returned group is named 'element-environment' and contains:
 *   - one center visual at the local origin, tagged { isEnvCenter, centerItem };
 *   - one visual per child, evenly spaced on a ring of radius `ringRadius` in the
 *     local XY plane, each tagged { isEnvChild, childItem };
 *   - one tether per child, running from the center's surface to the child.
 *
 * The function is pure: it only constructs THREE objects and never touches the
 * DOM, React, lights, or cameras.
 */
export function buildElementEnvironment(options: EnvironmentSceneOptions): THREE.Group {
  const { center, children } = options;
  const ringRadius = options.ringRadius ?? DEFAULT_RING_RADIUS;

  const root = new THREE.Group();
  root.name = 'element-environment';

  // 1. Center element at the local origin, rendered larger as the focus.
  const centerMesh = createElementVisual(center, CENTER_MODEL_SCALE, CENTER_FALLBACK_RADIUS);
  centerMesh.name = 'env-center';
  centerMesh.position.set(0, 0, 0);
  centerMesh.userData = { ...centerMesh.userData, isEnvCenter: true, centerItem: center };
  root.add(centerMesh);

  // Approximate surface radius of the center in local space, used as the tether
  // origin so stems leave the focus's skin rather than its centre.
  const centerSurfaceRadius = CENTER_FALLBACK_RADIUS + 0.15;

  // 2. Children arranged evenly on a ring around the center, each with a tether.
  const count = children.length;
  children.forEach((child, index) => {
    const angle = count > 0 ? (index / count) * Math.PI * 2 : 0;
    const position = new THREE.Vector3(
      Math.cos(angle) * ringRadius,
      Math.sin(angle) * ringRadius,
      0
    );

    const childMesh = createElementVisual(child, CHILD_MODEL_SCALE, CHILD_FALLBACK_RADIUS);
    childMesh.name = `env-child-${index}`;
    childMesh.position.copy(position);
    childMesh.userData = { ...childMesh.userData, isEnvChild: true, childItem: child };
    root.add(childMesh);

    const taxonomy = getItem3DTaxonomy(child);
    const surfacePoint = position.clone().normalize().multiplyScalar(centerSurfaceRadius);

    let tether = createDynamicTether(surfacePoint, position, taxonomy.colorHex);
    if (tether.children.length === 0) {
      tether = createAdditiveTetherFallback(surfacePoint, position, taxonomy.color);
    }
    tether.name = `env-tether-${index}`;
    root.add(tether);
  });

  return root;
}
