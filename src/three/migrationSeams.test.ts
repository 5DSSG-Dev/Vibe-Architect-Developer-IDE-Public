// Characterization tests for the seams the ThreeRuntime main-view adoption
// (shortfall threeruntime-main-view-adoption-deferred, scoped in
// docs/AEGIS_VIBE_ARCHITECT_THREERUNTIME_MAIN_VIEW_ADOPTION_PLAN_v0.1.md)
// will rely on: SceneRegistry contents, SelectionSystem pick set, and
// CameraController pose transitions. These lock current behavior so P1/P2
// migration steps have a regression net. Headless (node:test + tsx); the
// CameraController case stubs only the OrbitControls domElement.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { SceneRegistry, type SceneRegistryEntry } from './SceneRegistry.ts';
import { SelectionSystem, ADMIN_PICK_LAYER } from './SelectionSystem.ts';
import { CameraController, easeInOutCubic } from './CameraController.ts';

function entry(id: string, root: THREE.Object3D, overrides: Partial<SceneRegistryEntry> = {}): SceneRegistryEntry {
  return {
    id,
    kind: 'orb',
    root,
    pickTargets: [root],
    focusTarget: root,
    highlightTargets: [root],
    statusTargets: [root],
    disposalOwnership: 'external',
    ...overrides
  };
}

// --- SceneRegistry: contents + pick resolution (P2 depends on this) ---

test('SceneRegistry registers, reads back, and flattens pick targets', () => {
  const registry = new SceneRegistry();
  const core = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  registry.register(entry('core', core, { kind: 'core' }));
  registry.register(entry('orb', orb));
  assert.equal(registry.values().length, 2);
  assert.equal(registry.get('orb')?.kind, 'orb');
  assert.equal(registry.pickTargets().length, 2);
  orb.geometry.dispose();
});

test('SceneRegistry rejects duplicate ids', () => {
  const registry = new SceneRegistry();
  registry.register(entry('orb', new THREE.Group()));
  assert.throws(() => registry.register(entry('orb', new THREE.Group())), /already registered/);
});

test('SceneRegistry.resolvePick walks the parent chain to the owning entry', () => {
  const registry = new SceneRegistry();
  const root = new THREE.Group();
  const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  root.add(child);
  registry.register(entry('orb', root));
  // A nested descendant resolves to the registered entry.
  assert.equal(registry.resolvePick(child)?.id, 'orb');
  // An unrelated object resolves to nothing.
  assert.equal(registry.resolvePick(new THREE.Object3D()), undefined);
  child.geometry.dispose();
});

test('SceneRegistry unregister and clear drop entries and their pick ids', () => {
  const registry = new SceneRegistry();
  const root = new THREE.Group();
  registry.register(entry('orb', root));
  assert.equal(registry.unregister('orb')?.id, 'orb');
  assert.equal(registry.resolvePick(root), undefined);
  assert.equal(registry.pickTargets().length, 0);
  registry.register(entry('a', new THREE.Group()));
  registry.clear();
  assert.equal(registry.values().length, 0);
  assert.equal(registry.pickTargets().length, 0);
});

// --- SelectionSystem: pick set derivation + raycast (P2 depends on this) ---

test('SelectionSystem.refreshPickSet reflects the registry and enables the pick layer', () => {
  const registry = new SceneRegistry();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  registry.register(entry('orb', mesh));
  const selection = new SelectionSystem(registry);
  selection.refreshPickSet();
  assert.equal(mesh.layers.isEnabled(ADMIN_PICK_LAYER), true);
  selection.dispose();
  mesh.geometry.dispose();
});

test('SelectionSystem.pick resolves a centered ray to the registered entry, and stops after unregister', () => {
  const registry = new SceneRegistry();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
  mesh.position.set(0, 0, 0);
  mesh.updateMatrixWorld(true);
  registry.register(entry('orb', mesh));

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);

  const bounds = { left: 0, top: 0, width: 100, height: 100 } as DOMRect;
  const selection = new SelectionSystem(registry);
  selection.refreshPickSet();

  const hit = selection.pick(50, 50, bounds, camera); // dead center -> ray down -Z
  assert.equal(hit?.entry.id, 'orb');
  assert.ok(hit!.distance > 0);

  registry.unregister('orb');
  selection.refreshPickSet();
  assert.equal(selection.pick(50, 50, bounds, camera), null);

  selection.dispose();
  mesh.geometry.dispose();
});

test('SelectionSystem.pick returns null for a degenerate viewport', () => {
  const registry = new SceneRegistry();
  const selection = new SelectionSystem(registry);
  selection.refreshPickSet();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const zero = { left: 0, top: 0, width: 0, height: 0 } as DOMRect;
  assert.equal(selection.pick(0, 0, zero, camera), null);
  selection.dispose();
});

// --- CameraController: pose transitions (P1 depends on this) ---

function stubDomElement(): HTMLElement {
  // OrbitControls only touches style + (add/remove)EventListener at construction;
  // the transition math under test never reaches the pointer/wheel handlers.
  return {
    style: {} as CSSStyleDeclaration,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }),
    // OrbitControls.connect() attaches a keydown listener to the root node.
    getRootNode: () => ({ addEventListener: () => undefined, removeEventListener: () => undefined }),
    clientWidth: 100,
    clientHeight: 100
  } as unknown as HTMLElement;
}

test('easeInOutCubic clamps endpoints and is symmetric about the midpoint', () => {
  assert.equal(easeInOutCubic(-1), 0);
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(2), 1);
});

test('CameraController.focus drives the camera toward the target and completes deterministically', () => {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
  camera.position.set(0, 5, 12);
  const controller = new CameraController(camera, {
    domElement: stubDomElement(),
    initialTarget: new THREE.Vector3(0, 0, 0)
  });

  controller.focus(new THREE.Vector3(10, 0, 0), 1, 0, 100);
  const startX = camera.position.x;

  assert.equal(controller.update(50), true);          // mid-transition still active
  assert.ok(camera.position.x > startX);              // moving toward the +X target

  assert.equal(controller.update(100), false);        // transition finished -> inactive
  assert.ok(Math.abs(controller.controls.target.x - 10) < 1e-6);
  assert.equal(controller.update(150), false);        // stays settled with no input

  controller.dispose();
});

test('CameraController.reset returns to the captured home pose', () => {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
  camera.position.set(0, 5, 12);
  const controller = new CameraController(camera, {
    domElement: stubDomElement(),
    initialTarget: new THREE.Vector3(0, 0, 0)
  });

  controller.focus(new THREE.Vector3(10, 0, 0), 1, 0, 100);
  controller.update(100); // move away from home

  controller.reset(200, 100);
  controller.update(300);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(0, 5, 12)) < 1e-6);
  assert.ok(controller.controls.target.length() < 1e-6);

  controller.dispose();
});
