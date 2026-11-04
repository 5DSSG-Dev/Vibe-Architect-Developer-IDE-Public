import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gltfModelCache, preloadModels } from '../utils/gltfLoaderService';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { renderThumbnail } from '../utils/thumbnailStudio';

const MODEL_KEYS = { 'AEGIS_POD_CRYSTAL.glb': 'coreCrystal', 'CORE_CRYSTAL_CAGED.glb': 'coreCaged', 'CORE_CRYSTAL_CAGED2.glb': 'coreCaged2', 'crystals.glb': 'coreCluster' } as const;
function modelKey(model: string) { return MODEL_KEYS[model as keyof typeof MODEL_KEYS] ?? 'coreCrystal'; }

export function CoreCrystalThumbnail({ model }: { model: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    setReady(false);
    const key = modelKey(model);
    // Initial render registers the shared thumbnail renderer with the decoder.
    renderThumbnail(key, 0.35, 0);
    void preloadModels([key]).then(() => {
      if (disposed) return;
      const frame = renderThumbnail(key, 0.35, 0);
      const context = canvas.current?.getContext('2d');
      if (frame && context) { context.clearRect(0, 0, 128, 128); context.drawImage(frame, 0, 0); setReady(true); }
    }).catch(() => {});
    return () => { disposed = true; };
  }, [model]);
  return <div className="relative h-24 w-full"><canvas ref={canvas} width={128} height={128} className="h-24 w-24 mx-auto" aria-hidden="true" />{!ready && <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Preview unavailable</span>}</div>;
}
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Dedicated preview scene; never changes the workspace model or its materials. */
export function CoreCrystalPreview({ model }: { model: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const [status, setStatus] = useState('Loading crystal…');
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setStatus('3D preview is unavailable on this device.'); return; }
    let disposed = false;
    let object: THREE.Object3D | undefined;
    setStatus('Loading crystal…');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position.set(0, 0.4, 4);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Interactive CORE crystal. Drag to rotate; scroll to zoom.');
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 8;
    reset.current = () => { camera.position.set(0, 0.4, 4); controls.target.set(0, 0, 0); controls.update(); };
    scene.add(new THREE.HemisphereLight(0xe0faff, 0x454060, 3));
    const light = new THREE.DirectionalLight(0xffffff, 4); light.position.set(3, 4, 5); scene.add(light);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    const key = modelKey(model);
    void preloadModels([key], renderer).then(() => {
      if (disposed) return;
      const source = gltfModelCache.get(key);
      if (!source) { setStatus('Crystal preview could not be loaded.'); return; }
      // Cache owns geometry/materials/textures; this scene owns only its clone.
      object = source.clone(true);
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(extent) || extent <= 0) { object = undefined; setStatus('Crystal preview could not be displayed.'); return; }
      object.position.sub(box.getCenter(new THREE.Vector3()));
      const group = new THREE.Group(); group.add(object); group.scale.setScalar(2 / extent); scene.add(group);
      setStatus('');
    }).catch(() => { if (!disposed) setStatus('Crystal preview could not be loaded.'); });
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    });
    observer.observe(element);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => { disposed = true; observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); scene.clear(); environment.dispose(); renderer.dispose(); renderer.domElement.remove(); reset.current = () => {}; };
  }, [model]);
  return <div>
    <div className="relative rounded-2xl bg-slate-950/70 border border-cyan-500/30 overflow-hidden">
      <div ref={host} className="h-64 w-full" />
      {status && <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-slate-300 p-4 pointer-events-none">{status}</p>}
    </div>
    <p className="text-xs text-slate-400 mt-2">Drag to rotate · Scroll to zoom</p>
    <button type="button" className="text-xs text-cyan-300 underline mt-2 focus-visible:outline focus-visible:outline-2" onClick={() => reset.current()}>Reset view</button>
  </div>;
}
