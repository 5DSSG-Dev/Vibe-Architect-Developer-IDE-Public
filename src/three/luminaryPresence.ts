import * as THREE from 'three';
import { gltfModelCache } from '../utils/gltfLoaderService';

/**
 * The Vibe Luminary as a Presence in the Aether workspace (STP-0002 P19, N28): the Architect's
 * Codeglass model, standing in the lower right of the workspace as the Architect drew it. It
 * is held to that spot on screen and turned to face the Architect, so it stays put while the
 * mechanism turns or the view orbits. It does not spin; it pulses gently, as the Architect asked
 * (N33). It rests soft and brightens when the Architect engages it; clicking it engages or pauses
 * it, exactly as the corner icon does. It never moves toward the Architect on its own.
 */

/**
 * Where the Presence stands, as its centre's distance in pixels from the workspace's right and
 * bottom edges: in the right-hand side of the workspace, above the view controls (the spot the
 * Architect marked). The Full Form opens beside it (LuminaryHost). It sits this far from the
 * camera, in front of the mechanism.
 */
// Keep in step with the backdrop window in src/index.css, which keeps the Presence visible beside open pages.
export const PRESENCE_SCREEN_OFFSET = { right: 190, bottom: 450 };
/** The clear part of that backdrop window (55% of its 170x230px ellipse), where a press engages the Luminary. */
export const PRESENCE_WINDOW_RADIUS = { x: 94, y: 127 };
const PRESENCE_DISTANCE = 10;
const PRESENCE_HEIGHT = 2.6;
/** Fine turn of the figure around its own upright axis, in radians (positive turns it to its left). */
const PRESENCE_YAW = 0;
const REST_GLOW = 0.3;
const ENGAGED_GLOW = 0.7;
/** The gentle pulse: how much it grows and how fast it breathes (about one breath every 3.5 s). */
const PULSE_SCALE = 0.035;
const PULSE_RATE = 1.8;

export interface LuminaryPresence {
  root: THREE.Group;
  /** Invisible, raycastable sphere over the Presence. */
  pickProxy: THREE.Mesh;
  /** Swap the placeholder for the Codeglass model once it is cached. */
  applyModel(): void;
  /** Holds the Presence at its spot on screen and eases its glow. */
  update(elapsedTime: number, dt: number, motionEnabled: boolean, engaged: boolean, camera: THREE.PerspectiveCamera, width: number, height: number): void;
  dispose(): void;
}

function fitToHeight(object: THREE.Object3D, height: number) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  if (size.y > 0) object.scale.multiplyScalar(height / size.y);
  const centered = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
  object.position.sub(centered);
}

export function createLuminaryPresence(): LuminaryPresence {
  const root = new THREE.Group();
  root.name = 'luminary-presence';
  const ndc = new THREE.Vector3();

  const body = new THREE.Group();
  root.add(body);

  const light = new THREE.PointLight(0xfcd34d, 0.6, 9, 2);
  light.position.set(0, 0.4, 0.8);
  root.add(light);
  // A soft white light from the Architect's side, so the model's own colours and shading show
  // rather than being washed flat by its glow.
  const fill = new THREE.PointLight(0xffffff, 1.4, 12, 2);
  fill.position.set(0.6, 0.8, 3);
  root.add(fill);

  const owned: Array<{ dispose(): void }> = [];
  let materials: THREE.MeshStandardMaterial[] = [];
  let glow = REST_GLOW;

  const placeholder = () => {
    // A small gold crystal stands in until the model is cached (or if it fails to load).
    const geometry = new THREE.OctahedronGeometry(0.9, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0xfcd34d, emissive: 0xb45309, emissiveIntensity: REST_GLOW, metalness: 0.4, roughness: 0.3 });
    owned.push(geometry, material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1, 1.6, 1);
    body.add(mesh);
    materials = [material];
  };
  placeholder();

  const pickProxy = new THREE.Mesh(new THREE.SphereGeometry(PRESENCE_HEIGHT * 0.55, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  pickProxy.name = 'luminary-pick-proxy';
  pickProxy.userData = { isPickProxy: true, pick: { kind: 'luminary' } };
  owned.push(pickProxy.geometry, pickProxy.material as THREE.Material);
  root.add(pickProxy);

  return {
    root,
    pickProxy,
    applyModel() {
      const cached = gltfModelCache.get('luminary');
      if (!cached) return;
      body.clear();
      const model = cached.clone(true);
      materials = [];
      model.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        // The supplied export carries no normals; lighting needs them. Computed once on the
        // shared geometry, which the cache keeps for any later clone.
        if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
        const own = (mesh.material as THREE.MeshStandardMaterial).clone();
        // Lit as a surface, not as metal: with no environment map a metallic finish renders dark.
        own.metalness = 0;
        own.emissiveMap = own.map ?? own.emissiveMap;
        own.emissive = new THREE.Color(0xffffff);
        own.emissiveIntensity = glow;
        owned.push(own);
        mesh.material = own;
        materials.push(own);
      });
      fitToHeight(model, PRESENCE_HEIGHT);
      body.add(model);
    },
    update(elapsedTime, dt, motionEnabled, engaged, camera, width, height) {
      if (width > 0 && height > 0) {
        ndc.set(1 - (2 * PRESENCE_SCREEN_OFFSET.right) / width, -1 + (2 * PRESENCE_SCREEN_OFFSET.bottom) / height, 0.5).unproject(camera);
        root.position.copy(camera.position).addScaledVector(ndc.sub(camera.position).normalize(), PRESENCE_DISTANCE);
        // Face the Architect's eye, not just the screen plane: in the lower right corner, matching the
        // camera's rotation left the figure looking turned to the right by perspective.
        // Upright on screen: with a pitched camera, the world's up is not the screen's up off to the side.
        root.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        root.lookAt(camera.position);
        root.rotateY(PRESENCE_YAW);
      }
      const target = engaged ? ENGAGED_GLOW : REST_GLOW;
      glow += (target - glow) * Math.min(1, dt * 4);
      // A slow breath in size and light; held still when Motion is off.
      const breath = motionEnabled ? Math.sin(elapsedTime * PULSE_RATE) : 0;
      body.scale.setScalar(1 + breath * PULSE_SCALE);
      for (const material of materials) material.emissiveIntensity = glow * (1 + breath * 0.12);
      light.intensity = 0.4 + glow * 1.2 * (1 + breath * 0.12);
    },
    dispose() {
      for (const item of owned) item.dispose();
      root.removeFromParent();
    },
  };
}
