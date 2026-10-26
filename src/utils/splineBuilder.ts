import * as THREE from 'three';
import { createUmbilicalConduit } from './meshBuilders';

/**
 * Creates the system Umbilical between two points.
 *
 * Vacant sockets intentionally return a non-rendering marker group. ThreeCanvas
 * historically treated an empty group as a signal to draw a cyan procedural
 * fallback, so the marker prevents that fallback without creating visible
 * geometry. A Vacant connection point is therefore only the coloured socket ring.
 *
 * Active Relations render the canonical Apothecary Umbilical GLB. The conduit is
 * built along local +Z by meshBuilders and then oriented between the supplied
 * points so the authored asset follows an Orb when it is moved.
 */
export function createDynamicUmbilical(from: THREE.Vector3, to: THREE.Vector3, variant: string): THREE.Group {
  const group = new THREE.Group();

  if (variant === 'wireframe') {
    const vacantMarker = new THREE.Group();
    vacantMarker.name = 'vacant-connection-port-marker';
    vacantMarker.visible = false;
    group.add(vacantMarker);
    return group;
  }

  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  if (length < 1e-4) return group;

  const conduit = createUmbilicalConduit(
    'umbilical',
    0,
    length,
    0.44,
    1.6,
    true
  );

  if (conduit.children.length === 0) return group;

  conduit.name = 'canonical-umbilical-glb';
  conduit.position.copy(from);
  conduit.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    direction.normalize()
  );

  group.add(conduit);
  return group;
}

/**
 * Creates a dynamic tether (stem) from a Host Orb to a Satellite.
 */
export function createDynamicTether(from: THREE.Vector3, to: THREE.Vector3, colorHex: string): THREE.Group {
  const group = new THREE.Group();

  const curve = new THREE.LineCurve3(from, to);
  const geometry = new THREE.TubeGeometry(curve, 8, 0.04, 6, false);
  const material = new THREE.MeshBasicMaterial({ 
    color: new THREE.Color(colorHex), 
    transparent: true, 
    opacity: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  return group;
}

/**
 * Creates a dynamic mesh line for shared service communication between satellites.
 */
export function createDynamicMeshLine(from: THREE.Vector3, to: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();

  // Create a pulsing dash line
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  const material = new THREE.LineDashedMaterial({
    color: 0xffffff,
    linewidth: 1,
    scale: 1,
    dashSize: 0.2,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.5
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  group.add(line);

  return group;
}
