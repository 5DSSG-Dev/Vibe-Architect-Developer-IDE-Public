import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ApothecaryItem } from '../engine/relationEngine';
import { buildElementEnvironment, updateElementEnvironmentTether } from '../utils/environmentScene';
import { createElementTotem } from '../three/elementTotem';
import { preloadAllGltfModels } from '../utils/gltfLoaderService';
import { prefersReducedMotion } from '../utils/viewQuality';
import { easeInOutCubic } from '../utils/cameraNav';
import type { EnvironmentEntryView } from '../utils/environmentScene';

const ENVIRONMENT_ENTRY_TWEEN_SECONDS = 0.58;
// The child ring spans 4.5 world units; keep enough camera distance to see it
// around the focused module, including after several drill-downs.
const ENVIRONMENT_ENTRY_DISTANCE_RATIO = 0.78;
const ENVIRONMENT_ENTRY_MIN_DISTANCE = 9.5;
const ENVIRONMENT_CENTER_SETTLE_SECONDS = 0.48;

interface EnvironmentViewProps {
  /** The Element at the centre of this Environment. */
  center: ApothecaryItem;
  /** The next tier down (Orb→Satellites, Satellite→Actuators). */
  children: ApothecaryItem[];
  /** Drill one level deeper by clicking a child Element. */
  onEnterChild: (item: ApothecaryItem, entryView?: EnvironmentEntryView) => void;
  /** Open the information popup for a centred or child Element. */
  onInspectElement?: (item: ApothecaryItem) => void;
  /** Camera framing from the outgoing scene, used to continue its zoom. */
  entryView?: EnvironmentEntryView | null;
}

/**
 * A focused Environment scene: one Element centred, its child Elements arranged
 * on a ring around it and joined by tethers. Clicking a child drills deeper
 * (CORE → Orb → Satellite → Actuator). Rendering geometry comes from the shared
 * buildElementEnvironment builder; each Element carries its Element Totem.
 */
export const EnvironmentView: React.FC<EnvironmentViewProps> = ({ center, children, onEnterChild, onInspectElement, entryView }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onEnterChildRef = useRef(onEnterChild);
  onEnterChildRef.current = onEnterChild;
  const onInspectElementRef = useRef(onInspectElement);
  onInspectElementRef.current = onInspectElement;

  // Rebuild whenever the centred Element or its child set changes.
  const childKey = children.map((c) => c.id).join(',');

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070c, 0.015);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(...(entryView?.cameraOffset ?? [0, 1.5, 12]));
    camera.lookAt(0, 0, 0);

    let navigationPending = false;
    let navigationFrame = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 30;
    controls.minDistance = 3;
    controls.enableRotate = false;
    controls.enablePan = false;

    // Lighting — neutral so each Element shows its own material.
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.PointLight(0xffffff, 40, 60);
    key.position.set(6, 8, 10);
    scene.add(key);
    const fill = new THREE.PointLight(0x88aaff, 18, 60);
    fill.position.set(-8, -4, 6);
    scene.add(fill);

    // Starfield for depth, matching the CORE scene's ground.
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(400 * 3);
    for (let i = 0; i < starPos.length; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 80;
      starPos[i + 1] = (Math.random() - 0.5) * 80;
      starPos[i + 2] = (Math.random() - 0.5) * 60 - 10;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.08, color: 0x00f3ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const envRoot = new THREE.Group();
    scene.add(envRoot);
    let centerSettleStartedAt: number | null = entryView ? performance.now() : null;

    // Information popups are anchored directly on each Element. Their marker
    // dots are hidden; mesh hover reveals the popup instead.
    const addTotems = () => {
      const elements = [...envRoot.children];
      elements.forEach((node) => {
        if (node.userData?.isEnvCenter && node.userData.centerItem) {
          const item = node.userData.centerItem as ApothecaryItem;
          const totem = createElementTotem(item, { showMarker: false });
          totem.position.copy(node.position);
          envRoot.add(totem);
        }
        if (node.userData?.isEnvChild && node.userData.childItem) {
          const item = node.userData.childItem as ApothecaryItem;
          const totem = createElementTotem(item, { showMarker: false });
          totem.position.copy(node.position);
          envRoot.add(totem);
        }
      });
    };

    const disposeEnv = () => {
      for (let i = envRoot.children.length - 1; i >= 0; i--) {
        const child = envRoot.children[i];
        envRoot.remove(child);
        child.traverse((n) => {
          const css2d = n as unknown as { isCSS2DObject?: boolean; element?: HTMLElement };
          if (css2d.isCSS2DObject && css2d.element?.parentNode) css2d.element.parentNode.removeChild(css2d.element);
          const mesh = n as THREE.Mesh;
          if (!mesh.isMesh) return;
          if (mesh.userData.proceduralGeometry) mesh.geometry?.dispose();
          if (mesh.userData.ownedMaterial) {
            const mat = mesh.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
          }
        });
      }
    };

    const buildEnv = () => {
      disposeEnv();
      const group = buildElementEnvironment({ center, children });
      // Re-parent the built group's children into envRoot so totems and disposal
      // can address them directly.
      while (group.children.length > 0) envRoot.add(group.children[0]);
      const centerNode = envRoot.children.find((node) => node.userData?.isEnvCenter);
      if (centerNode && entryView && centerSettleStartedAt !== null) {
        centerNode.scale.setScalar(entryView.centerScale);
      }
      addTotems();
    };

    buildEnv();

    // Swap procedural fallbacks for real .glb models once the shared cache is warm.
    const preload = preloadAllGltfModels(renderer);
    preload.then(() => buildEnv());

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.42, 0.34));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    type ElementHit = { node: THREE.Object3D; item: ApothecaryItem };
    type PendingInteraction = {
      hit: ElementHit;
      pointerId: number;
      startX: number;
      startY: number;
      startLocalZ: number;
      dragged: boolean;
      plane?: THREE.Plane;
      offset?: THREE.Vector3;
    };
    let pendingInteraction: PendingInteraction | null = null;
    let hoveredTotem: THREE.Object3D | null = null;
    let suppressedDragClick: { x: number; y: number } | null = null;

    const findElementHit = (clientX: number, clientY: number): ElementHit | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      scene.updateMatrixWorld(true);
      raycaster.setFromCamera(mouse, camera);
      const elementRoots = envRoot.children.filter((node) => node.userData?.isEnvCenter || node.userData?.isEnvChild);
      const hits = raycaster.intersectObjects(elementRoots, true);
      for (const hit of hits) {
        let node: THREE.Object3D | null = hit.object;
        while (node) {
          if (node.userData?.isEnvCenter && node.userData.centerItem) {
            return { node, item: node.userData.centerItem as ApothecaryItem };
          }
          if (node.userData?.isEnvChild && node.userData.childItem) {
            return { node, item: node.userData.childItem as ApothecaryItem };
          }
          node = node.parent;
        }
      }
      return null;
    };

    const setHoveredElement = (item?: ApothecaryItem) => {
      const next = item
        ? envRoot.children.find((node) => node.userData?.elementItemId === item.id) ?? null
        : null;
      if (next === hoveredTotem) return;
      const previousHide = hoveredTotem?.userData?.hideElementPopup;
      if (typeof previousHide === 'function') previousHide();
      hoveredTotem = next;
      const nextShow = hoveredTotem?.userData?.showElementPopup;
      if (typeof nextShow === 'function') nextShow();
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const hit = findElementHit(event.clientX, event.clientY);
      if (hit) onInspectElementRef.current?.(hit.item);
    };
    const enterChild = (hit: ElementHit) => {
      if (!hit.node.userData?.isEnvChild) return;
      const item = hit.item;
      navigationPending = true;
      controls.enabled = false;
      const fromPosition = camera.position.clone();
      const fromTarget = controls.target.clone();
      const target = new THREE.Vector3();
      hit.node.getWorldPosition(target);
      const direction = camera.position.clone().sub(controls.target).normalize();
      if (direction.lengthSq() === 0) direction.set(0, 0.2, 1).normalize();
      const distance = Math.max(
        camera.position.distanceTo(controls.target) * ENVIRONMENT_ENTRY_DISTANCE_RATIO,
        ENVIRONMENT_ENTRY_MIN_DISTANCE
      );
      const toPosition = target.clone().addScaledVector(direction, distance);
      const startedAt = performance.now();
      const duration = prefersReducedMotion() ? 0 : ENVIRONMENT_ENTRY_TWEEN_SECONDS * 1000;
      const animateEntry = (now: number) => {
        const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
        const eased = easeInOutCubic(progress);
        camera.position.lerpVectors(fromPosition, toPosition, eased);
        controls.target.lerpVectors(fromTarget, target, eased);
        controls.update();
        if (progress >= 1) {
          navigationPending = false;
          const cameraOffset: [number, number, number] = [
            toPosition.x - target.x,
            toPosition.y - target.y,
            toPosition.z - target.z,
          ];
          onEnterChildRef.current(item, { cameraOffset, centerScale: 0.85 / 1.9 });
          return;
        }
        navigationFrame = requestAnimationFrame(animateEntry);
      };
      navigationFrame = requestAnimationFrame(animateEntry);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || navigationPending) return;
      suppressedDragClick = null;
      const hit = findElementHit(event.clientX, event.clientY);
      if (!hit) return;
      pendingInteraction = {
        hit,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLocalZ: hit.node.position.z,
        dragged: false,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pendingInteraction) {
        const hit = findElementHit(event.clientX, event.clientY);
        if (hit) {
          setHoveredElement(hit.item);
          renderer.domElement.style.cursor = 'grab';
          return;
        }
        const popupRoot = hoveredTotem?.userData?.popupRoot as HTMLElement | undefined;
        const bounds = popupRoot?.getBoundingClientRect();
        if (!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
          setHoveredElement();
        }
        renderer.domElement.style.cursor = 'default';
        return;
      }

      const interaction = pendingInteraction;
      if (interaction.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;
      if (!interaction.dragged && deltaX * deltaX + deltaY * deltaY < 25) return;

      if (!interaction.dragged) {
        interaction.dragged = true;
        controls.enabled = false;
        setHoveredElement();
        const worldPosition = interaction.hit.node.getWorldPosition(new THREE.Vector3());
        const normal = camera.position.clone().sub(controls.target).normalize();
        interaction.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, worldPosition);
        raycaster.setFromCamera(mouse.set(
          ((interaction.startX - renderer.domElement.getBoundingClientRect().left) / renderer.domElement.getBoundingClientRect().width) * 2 - 1,
          -((interaction.startY - renderer.domElement.getBoundingClientRect().top) / renderer.domElement.getBoundingClientRect().height) * 2 + 1
        ), camera);
        const startPoint = raycaster.ray.intersectPlane(interaction.plane, new THREE.Vector3()) ?? worldPosition;
        interaction.offset = worldPosition.sub(startPoint);
        renderer.domElement.style.cursor = 'grabbing';
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(mouse, camera);
      const point = interaction.plane && raycaster.ray.intersectPlane(interaction.plane, new THREE.Vector3());
      if (!point) return;
      const worldPosition = point.add(interaction.offset ?? new THREE.Vector3());
      scene.updateMatrixWorld(true);
      const localPosition = envRoot.worldToLocal(worldPosition);
      localPosition.z = interaction.startLocalZ;
      interaction.hit.node.position.copy(localPosition);
      const centerMoved = !!interaction.hit.node.userData?.isEnvCenter;
      const childIndex = interaction.hit.node.userData?.envChildIndex as number | undefined;
      if (centerMoved) {
        envRoot.children
          .filter((node) => typeof node.userData?.envChildIndex === 'number' && node.userData?.isEnvTether)
          .forEach((node) => updateElementEnvironmentTether(envRoot, node.userData.envChildIndex as number));
      } else if (childIndex !== undefined) {
        updateElementEnvironmentTether(envRoot, childIndex);
      }
      const totem = envRoot.children.find((node) => node.userData?.elementItemId === interaction.hit.item.id);
      if (totem) totem.position.copy(localPosition);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const interaction = pendingInteraction;
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      pendingInteraction = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = 'default';
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      if (interaction.dragged) {
        suppressedDragClick = { x: event.clientX, y: event.clientY };
        const hit = findElementHit(event.clientX, event.clientY);
        setHoveredElement(hit?.item);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (suppressedDragClick) {
        const dx = event.clientX - suppressedDragClick.x;
        const dy = event.clientY - suppressedDragClick.y;
        const isDragClick = dx * dx + dy * dy < 25;
        suppressedDragClick = null;
        if (isDragClick) return;
      }
      if (navigationPending) {
        return;
      }
      const hit = findElementHit(event.clientX, event.clientY);
      if (hit) enterChild(hit);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (pendingInteraction?.pointerId !== event.pointerId) return;
      pendingInteraction = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = 'default';
    };

    const handlePointerLeave = () => {
      if (pendingInteraction) return;
      setHoveredElement();
      renderer.domElement.style.cursor = 'default';
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerCancel);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    let frameId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      // Gentle rotation of the whole environment ring so children read as orbiting.
      envRoot.rotation.z = t * 0.05;
      if (centerSettleStartedAt !== null) {
        const duration = prefersReducedMotion() ? 0 : ENVIRONMENT_CENTER_SETTLE_SECONDS * 1000;
        const progress = duration === 0 ? 1 : Math.min(1, (performance.now() - centerSettleStartedAt) / duration);
        const centerNode = envRoot.children.find((node) => node.userData?.isEnvCenter);
        if (centerNode && entryView) {
          centerNode.scale.setScalar(THREE.MathUtils.lerp(entryView.centerScale, 1, easeInOutCubic(progress)));
        }
        if (progress >= 1) centerSettleStartedAt = null;
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
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(navigationFrame);
      disposeEnv();
      controls.dispose();
      starGeo.dispose();
      starMat.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelRenderer.domElement)) container.removeChild(labelRenderer.domElement);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.id, childKey]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-default legible-glass" />;
};
