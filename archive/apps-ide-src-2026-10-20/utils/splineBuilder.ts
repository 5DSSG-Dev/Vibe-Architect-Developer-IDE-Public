import * as THREE from 'three';

/**
 * Creates a dynamic procedural umbilical conduit between two Vector3 points.
 * Stretches a CatmullRomCurve3 through the points with slight arc/sag for organic feel.
 */
export function createDynamicUmbilical(from: THREE.Vector3, to: THREE.Vector3, variant: string): THREE.Group {
  const group = new THREE.Group();

  // Create an arc by raising the midpoint slightly (or bending it outward)
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const dist = from.distanceTo(to);
  mid.y -= dist * 0.15; // Sag the umbilical slightly based on distance

  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  
  const geometry = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x00f3ff, 
    transparent: true, 
    opacity: 0.6,
    wireframe: variant === 'wireframe'
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

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
