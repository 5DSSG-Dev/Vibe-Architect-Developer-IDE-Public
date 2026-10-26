import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AetherVolume } from "./aether/AetherVolume.js";

function createStarSpriteTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const stops = 16;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      const alpha = Math.exp(-4.5 * t * t) * (1 - t);
      gradient.addColorStop(t, `rgba(255,255,255,${alpha.toFixed(4)})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function AetherRealm() {
  const mountRef = useRef(null);

  useEffect(() => {
    const canvas = mountRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08010f);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.8;
    controls.maxDistance = 8;

    const aetherVolume = new AetherVolume(camera);
    scene.add(aetherVolume);
    aetherVolume.scale.set(5, 5, 5);

    const ambient = new THREE.AmbientLight(0x7287ff, 0.8);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0xff98ff, 2.2, 20);
    pointLight.position.set(2, 3, 2);
    scene.add(pointLight);

    const starSprite = createStarSpriteTexture();
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 240;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 70;
      particlePositions[i + 1] = (Math.random() - 0.5) * 22;
      particlePositions[i + 2] = (Math.random() - 0.5) * 70;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.28,
      map: starSprite,
      color: 0xda92ff,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    particleField.renderOrder = 0;
    scene.add(particleField);

    const innerAetherGeo = new THREE.BufferGeometry();
    const innerCount = 80;
    const innerPositions = new Float32Array(innerCount * 3);
    for (let i = 0; i < innerCount * 3; i += 3) {
      const radius = 1.3 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      innerPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      innerPositions[i + 1] = radius * Math.cos(phi) * 0.7;
      innerPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    innerAetherGeo.setAttribute('position', new THREE.BufferAttribute(innerPositions, 3));
    const innerAetherMat = new THREE.PointsMaterial({
      size: 0.24,
      map: starSprite,
      color: 0xb86cff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const innerAetherField = new THREE.Points(innerAetherGeo, innerAetherMat);
    innerAetherField.renderOrder = 1;
    scene.add(innerAetherField);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x96d9ff,
        emissive: 0x4bd8ff,
        emissiveIntensity: 2.0,
        roughness: 0.18,
        metalness: 0.1,
      })
    );
    scene.add(core);

    const clock = new THREE.Clock();

    let frameId;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      controls.update();
      aetherVolume.update(elapsed);
      if (particleField) {
        particleField.rotation.y = elapsed * 0.02;
        particleField.position.y = Math.sin(elapsed * 0.12) * 0.28;
        if (particleField.material) {
          particleField.material.opacity = 0.28 + Math.sin(elapsed * 0.7) * 0.08;
        }
      }
      if (innerAetherField) {
        innerAetherField.rotation.y = -elapsed * 0.032;
        innerAetherField.position.y = Math.sin(elapsed * 0.24) * 0.16;
        if (innerAetherField.material) {
          innerAetherField.material.opacity = 0.36 + Math.sin(elapsed * 0.9) * 0.06;
        }
      }
      core.rotation.y = elapsed * 0.18;
      core.rotation.x = Math.sin(elapsed * 0.22) * 0.08;
      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (core.geometry) core.geometry.dispose();
      if (core.material) core.material.dispose();
      if (particleField.geometry) particleField.geometry.dispose();
      if (particleField.material) particleField.material.dispose();
      if (innerAetherField.geometry) innerAetherField.geometry.dispose();
      if (innerAetherField.material) innerAetherField.material.dispose();
      if (aetherVolume.mesh) {
        if (aetherVolume.mesh.geometry) aetherVolume.mesh.geometry.dispose();
        if (aetherVolume.mesh.material) aetherVolume.mesh.material.dispose();
      }
      if (aetherVolume.material) aetherVolume.material.dispose();
      if (starSprite) starSprite.dispose();
    };
  }, []);

  return (
    <canvas
      ref={mountRef}
      id="canvas"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
