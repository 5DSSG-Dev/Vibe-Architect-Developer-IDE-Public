import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AetherVolume } from "./aether/AetherVolume.js";

const canvas = document.querySelector("#canvas");

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

typeof window !== "undefined" && window.addEventListener("resize", onWindowResize);

const ambient = new THREE.AmbientLight(0x7287ff, 0.8);
scene.add(ambient);

const pointLight = new THREE.PointLight(0xff98ff, 2.2, 20);
pointLight.position.set(2, 3, 2);
scene.add(pointLight);

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

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  controls.update();
  aetherVolume.update(elapsed);
  core.rotation.y = elapsed * 0.18;
  core.rotation.x = Math.sin(elapsed * 0.22) * 0.08;
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

animate();
