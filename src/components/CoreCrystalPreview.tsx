import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
    const release = (root: THREE.Object3D) => {
      root.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      });
    };
    new GLTFLoader().load(`/assets/models/${model}`, gltf => {
      if (disposed) { release(gltf.scene); return; }
      object = gltf.scene;
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(extent) || extent <= 0) { release(object); object = undefined; setStatus('Crystal preview could not be displayed.'); return; }
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center); const group = new THREE.Group(); group.add(object); group.scale.setScalar(2 / extent); scene.add(group);
      setStatus('');
    }, undefined, () => { if (!disposed) setStatus('Crystal preview could not be loaded.'); });
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    });
    observer.observe(element);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => { disposed = true; observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); if (object) release(object); renderer.dispose(); renderer.domElement.remove(); reset.current = () => {}; };
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
