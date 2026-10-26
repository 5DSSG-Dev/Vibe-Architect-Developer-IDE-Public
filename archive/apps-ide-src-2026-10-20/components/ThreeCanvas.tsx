import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SocketBinding, ApothecaryItem, getItem3DTaxonomy } from '../engine/relationEngine';
import { getNearestVacantSocket } from '../engine/antigravity';
import { createDynamicUmbilical } from '../utils/splineBuilder';

interface ThreeCanvasProps {
  sockets: SocketBinding[];
  onSelectSocket: (socket: SocketBinding, item?: ApothecaryItem) => void;
  onDropAttachItem?: (item: ApothecaryItem, targetSocketId: string) => void;
  onRightClickElement?: (socket?: SocketBinding, item?: ApothecaryItem) => void;
  selectedSocketId?: string;
  activeMode: 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY';
}

function createGhostMesh(geometryType: string, color: number): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  switch (geometryType) {
    case 'octahedron':
      geo = new THREE.OctahedronGeometry(0.55); break;
    case 'cube':
      geo = new THREE.BoxGeometry(0.7, 0.7, 0.7); break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16); break;
    case 'dodecahedron':
      geo = new THREE.DodecahedronGeometry(0.55); break;
    case 'tetrahedron':
      geo = new THREE.TetrahedronGeometry(0.65); break;
    case 'sphere':
    default:
      geo = new THREE.SphereGeometry(0.55, 24, 24); break;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85
  });

  const mesh = new THREE.Mesh(geo, mat);

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.05);
  mesh.add(wireMesh);

  return mesh;
}

// Satellite sub-node mesh generator (Platonic solids by class)
function createSatelliteMesh(satelliteClass: string): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  let color = 0x00f3ff;

  switch (satelliteClass) {
    case 'I/O':
      geo = new THREE.OctahedronGeometry(0.18);
      color = 0x00f3ff; break;
    case 'Compute':
      geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      color = 0xffb000; break;
    case 'Storage':
      geo = new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12);
      color = 0x00ff9d; break;
    case 'Validation':
      geo = new THREE.DodecahedronGeometry(0.18);
      color = 0xa855f7; break;
    case 'Security':
    default:
      geo = new THREE.TetrahedronGeometry(0.2);
      color = 0xff2a6d; break;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1.0,
    roughness: 0.2,
    metalness: 0.3
  });

  return new THREE.Mesh(geo, mat);
}

/**
 * Creates an embedded 3D Canvas Text Sprite for the central CORE Crystal core
 */
function createCoreTextSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Header: CORE CRYSTAL
    ctx.font = 'bold 34px "Orbitron", sans-serif';
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 12;
    ctx.fillText('CORE CRYSTAL', 256, 75);

    // Subtitle 1: FORMLESS CENTER
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#00ff9d';
    ctx.shadowColor = '#00ff9d';
    ctx.shadowBlur = 8;
    ctx.fillText('FORMLESS CENTER', 256, 130);

    // Subtitle 2: NO SERIALIZED STATE
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(0, 243, 255, 0.75)';
    ctx.shadowBlur = 4;
    ctx.fillText('NO SERIALIZED STATE', 256, 175);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85,
    depthTest: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.4, 1.7, 1.0);
  sprite.position.set(0, 0, 0);

  return sprite;
}

/**
 * Calculates the exact 3D tip coordinate for an Umbilical socket arm
 * @param angleRadians Angle of the radial arm around the Y-axis (index * Math.PI / 4)
 * @param radialDistance Full distance to outer tip (R = 6.5)
 */
export function getUmbilicalTipVector(angleRadians: number, radialDistance: number = 6.5): THREE.Vector3 {
  const x = Math.sin(angleRadians) * radialDistance;
  const z = Math.cos(angleRadians) * radialDistance;
  return new THREE.Vector3(x, 0.5, z);
}

export const getUmbilicalTipPosition = (ringPos: THREE.Vector3, corePos: THREE.Vector3 = new THREE.Vector3(0,0,0), offset: number = 4.0): THREE.Vector3 => {
  const dir = new THREE.Vector3().subVectors(ringPos, corePos).normalize();
  return new THREE.Vector3().addVectors(ringPos, dir.multiplyScalar(offset));
};

// Dedicated Constructor for Docked 3D Orb resting atop Pedestal Platform
function createDockedOrbGroup(item: ApothecaryItem): THREE.Group {
  const group = new THREE.Group();
  group.name = 'docked-orb-group';

  const taxonomy = getItem3DTaxonomy(item);

  // 1. Primary Docked Orb Mesh centered at local (0,0,0) inside group
  let orbGeo: THREE.BufferGeometry;
  switch (taxonomy.geometryType) {
    case 'octahedron': orbGeo = new THREE.OctahedronGeometry(0.55); break;
    case 'cube': orbGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6); break;
    case 'cylinder': orbGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16); break;
    case 'dodecahedron': orbGeo = new THREE.DodecahedronGeometry(0.55); break;
    case 'tetrahedron': orbGeo = new THREE.TetrahedronGeometry(0.6); break;
    case 'sphere':
    default: orbGeo = new THREE.SphereGeometry(0.55, 24, 24); break;
  }

  const orbMat = new THREE.MeshPhysicalMaterial({
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

  const orbMesh = new THREE.Mesh(orbGeo, orbMat);
  orbMesh.position.set(0, 0, 0);
  group.add(orbMesh);

  // Wireframe Overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.5
  });
  const wireMesh = new THREE.Mesh(orbGeo, wireMat);
  wireMesh.scale.setScalar(1.05);
  orbMesh.add(wireMesh);

  // 2. Render Attached Satellite Sub-Nodes Orbiting Host Orb
  const satelliteClasses: string[] = [];
  if (item.satelliteClass) {
    satelliteClasses.push(item.satelliteClass);
  }
  if (item.capabilities.includes('telemetry_read')) satelliteClasses.push('I/O');
  if (item.capabilities.includes('shader_render')) satelliteClasses.push('Compute');
  if (item.capabilities.includes('tick_clock')) satelliteClasses.push('Storage');
  if (item.capabilities.includes('handshake_exec')) satelliteClasses.push('Validation');
  if (item.capabilities.includes('fault_containment')) satelliteClasses.push('Security');

  if (satelliteClasses.length === 0) {
    satelliteClasses.push('Compute', 'Validation');
  }

  const satellitesGroup = new THREE.Group();
  satellitesGroup.name = 'orbiting-satellites-group';
  satellitesGroup.position.set(0, 0, 0);

  satelliteClasses.forEach((sClass, index) => {
    const satMesh = createSatelliteMesh(sClass);
    const angle = (index / satelliteClasses.length) * Math.PI * 2;
    const orbitRadius = 0.95;
    satMesh.position.set(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0);
    satellitesGroup.add(satMesh);
  });

  group.add(satellitesGroup);

  return group;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  sockets,
  onSelectSocket,
  onDropAttachItem,
  selectedSocketId,
  activeMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSocketIdRef = useRef(selectedSocketId);
  selectedSocketIdRef.current = selectedSocketId;

  const socketsRef = useRef(sockets);
  socketsRef.current = sockets;

  const updateSocketGeometriesRef = useRef<() => void>();

  // Refs for 3D Drag & Raycaster state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const ghostMeshRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const socketMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const snappedSocketIdRef = useRef<string | null>(null);
  const [magneticSnapMessage, setMagneticSnapMessage] = useState<string | null>(null);

  // Reactive Observer: Reconcile 3D Scene Nodes on socket state changes
  useEffect(() => {
    if (updateSocketGeometriesRef.current) {
      updateSocketGeometriesRef.current();
    }
  }, [sockets]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x080b10, 0.02);

    // Elevated camera looking down at 35-degree top-down isometric angle
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 9.0, 14.0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.error('Failed to create WebGLRenderer:', err);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL Context Lost. Reloading scene...');
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 35;
    controls.minDistance = 4;

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00f3ff, 2.8, 35);
    cyanPointLight.position.set(6, 6, 6);
    scene.add(cyanPointLight);

    const violetPointLight = new THREE.PointLight(0xa855f7, 2.8, 35);
    violetPointLight.position.set(-6, -6, -6);
    scene.add(violetPointLight);

    const emeraldPointLight = new THREE.PointLight(0x00ff9d, 2.0, 25);
    emeraldPointLight.position.set(0, -7, 3);
    scene.add(emeraldPointLight);

    // Starfield Background Particles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 700;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 70;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.09,
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.5
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 3. Central CORE Crystal at Origin [0, 0, 0]
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const crystalGeo = new THREE.IcosahedronGeometry(1.9, 0);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0d131e,
      emissive: 0x002b36,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.5,
      transparent: true,
      opacity: 0.88
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, glassMaterial);
    coreGroup.add(crystalMesh);

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });
    const wireframeMesh = new THREE.Mesh(crystalGeo, wireframeMat);
    wireframeMesh.scale.setScalar(1.03);
    coreGroup.add(wireframeMesh);

    const innerLocusGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const innerLocusMat = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      transparent: true,
      opacity: 0.85
    });
    const innerLocusMesh = new THREE.Mesh(innerLocusGeo, innerLocusMat);
    coreGroup.add(innerLocusMesh);

    // Embedded 3D Canvas Text Sprite inside CORE Crystal at [0, 0, 0]
    const coreTextSprite = createCoreTextSprite();
    coreGroup.add(coreTextSprite);

    // 4. 8-Vector Radial Umbilical Socket Arms Architecture
    const socketMeshesGroup = new THREE.Group();
    scene.add(socketMeshesGroup);

    const socketMeshMap = socketMeshMapRef.current;

    // Reactive Scene Reconciler & Mesh Constructor
    const updateSocketGeometries = () => {
      while (socketMeshesGroup.children.length > 0) {
        socketMeshesGroup.remove(socketMeshesGroup.children[0]);
      }
      socketMeshMap.clear();

      const currentSockets = socketsRef.current;
      const count = currentSockets.length || 8;

      currentSockets.forEach((s, index) => {
        const angle = index * (Math.PI / 4); // 45-degree steps around Y-axis

        // 1. Arm Group (rotates around Y-axis)
        const armGroup = new THREE.Group();
        armGroup.name = `umbilical-arm-${s.id}`;
        armGroup.rotation.y = angle;

        let mainColor = 0x00f3ff; // Vacant wireframe cyan
        let isWireframe = true;
        let ringOpacity = 0.65;

        if (s.state === 'Active') {
          mainColor = 0x00ff9d; // Emerald solid active
          isWireframe = false;
          ringOpacity = 0.95;
        } else if (s.state === 'Degraded') {
          mainColor = 0xffb000;
          isWireframe = false;
          ringOpacity = 0.85;
        } else if (s.state === 'Severed') {
          mainColor = 0xff2a6d;
          isWireframe = true;
          ringOpacity = 0.95;
        }

        // 2. Conduit Tube Stem (Extends along local Z from Z = 2.5 to Z = 6.5)
        const conduitKey = s.state === 'Severed'
          ? UMBILICAL_SEVERED
          : UMBILICAL_VARIANTS[index % UMBILICAL_VARIANTS.length];
        
        // Use the new Antigravity Engine procedural spline!
        const fromPos = new THREE.Vector3(0, 0, 2.5);
        const toPos = new THREE.Vector3(0, 0, 5.5);
        const conduit = createDynamicUmbilical(fromPos, toPos, isWireframe ? 'wireframe' : 'solid');
        conduit.name = 'dynamic-umbilical';
        
        armGroup.userData = { socketId: s.id, isWireframe };
        
        if (conduit.children.length > 0) {
          armGroup.add(conduit);
        } else {
          // Procedural stem fallback
          const tubeLength = 4.0;
          const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, tubeLength, 16);
          tubeGeo.rotateX(Math.PI / 2); // Lay cylinder along local Z-axis
          const tubeMat = new THREE.MeshBasicMaterial({
            color: mainColor,
            wireframe: isWireframe,
            transparent: true,
            opacity: ringOpacity * 0.8
          });
          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
          tubeMesh.position.set(0, 0, 4.5); // Local center between R=2.5 and R=6.5
          tubeMesh.userData = { proceduralGeometry: true, ownedMaterial: true };
          armGroup.add(tubeMesh);
        }

        // 3. Umbilical Socket Ring (Mechanical collar at local Z = 2.5)
        const ringGeo = new THREE.TorusGeometry(0.5, 0.09, 16, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: mainColor,
          emissive: mainColor,
          emissiveIntensity: s.state === 'Active' ? 1.5 : 0.7,
          metalness: 0.8,
          roughness: 0.2,
          wireframe: isWireframe,
          transparent: true,
          opacity: ringOpacity
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(0, 0, 2.5);
        ringMesh.userData = { socketId: s.id, isSocket: true, ringColor: mainColor };
        armGroup.add(ringMesh);

        // 4. Docking Pedestal Platform (Disc at local Z = 6.5)
        const pedestalGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24);
        pedestalGeo.rotateX(Math.PI / 2);
        const pedestalMat = new THREE.MeshStandardMaterial({
          color: s.state === 'Active' ? 0x00ff9d : 0x00f3ff,
          emissive: s.state === 'Active' ? 0x00ff9d : 0x002b36,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          metalness: 0.5,
          transparent: true,
          opacity: 0.85
        });
        const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestalMesh.position.set(0, 0, 6.5);
        pedestalMesh.userData = { socketId: s.id, isPedestal: true };
        armGroup.add(pedestalMesh);

        // Pedestal Ring Edge Wireframe
        const pedestalRingGeo = new THREE.TorusGeometry(0.76, 0.025, 8, 32);
        const pedestalRingMat = new THREE.MeshBasicMaterial({
          color: s.state === 'Active' ? 0x00ff9d : 0x00f3ff,
          transparent: true,
          opacity: 0.9
        });
        const pedestalRingMesh = new THREE.Mesh(pedestalRingGeo, pedestalRingMat);
        pedestalMesh.add(pedestalRingMesh);

        // 5. ATTACH DOCKED ORB (Child of armGroup at local (0, 0.5, 6.5) sitting atop pedestal)
        if (s.connectedItem) {
          const dockedGroup = createDockedOrbGroup(s.connectedItem);
          dockedGroup.position.set(0, 0.5, 6.5);
          dockedGroup.userData = { socketId: s.id, isDockedOrb: true };
          armGroup.add(dockedGroup);
        }

        socketMeshesGroup.add(armGroup);
        socketMeshMap.set(s.id, armGroup);
      });
    };

    updateSocketGeometriesRef.current = updateSocketGeometries;
    updateSocketGeometries();

    // 5. 4 Orbiting Daemons
    const daemonDefs = [
      { name: 'Steward Daemon', color: 0x00a2ff, radiusX: 3.5, radiusZ: 3.0, speed: 0.8, yOffset: 0.8 },
      { name: 'Advocate Daemon', color: 0xa855f7, radiusX: 4.2, radiusZ: 3.8, speed: -0.6, yOffset: -0.9 },
      { name: 'Temporal Daemon', color: 0xf59e0b, radiusX: 3.0, radiusZ: 3.5, speed: 1.1, yOffset: 1.2 },
      { name: 'Conductor Daemon', color: 0x14b8a6, radiusX: 4.6, radiusZ: 4.2, speed: -0.9, yOffset: -0.4 }
    ];

    const daemonMeshes: { mesh: THREE.Mesh; def: typeof daemonDefs[0] }[] = [];

    daemonDefs.forEach(def => {
      const geo = new THREE.SphereGeometry(0.24, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 1.0,
        roughness: 0.1
      });
      const mesh = new THREE.Mesh(geo, mat);

      const trailGeo = new THREE.TorusGeometry(def.radiusX, 0.015, 8, 64);
      trailGeo.rotateX(Math.PI / 2);
      const trailMat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.25
      });
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      trailMesh.position.y = def.yOffset;
      scene.add(trailMesh);

      scene.add(mesh);
      daemonMeshes.push({ mesh, def });
    });

    // 6. Post-Processing Bloom
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.15,
      0.5,
      0.2
    );
    composer.addPass(bloomPass);

    // 7. Raycasting & Interaction
    const raycaster = raycasterRef.current;
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(socketMeshesGroup.children, true);

      if (intersects.length > 0) {
        let currentObj: THREE.Object3D | null = intersects[0].object;
        while (currentObj && !currentObj.userData.socketId && currentObj.parent) {
          currentObj = currentObj.parent;
        }
        if (currentObj && currentObj.userData.socketId) {
          const sId = currentObj.userData.socketId;
          const found = socketsRef.current.find(s => s.id === sId);
          if (found) {
            onSelectSocket(found, found.connectedItem);
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      coreGroup.rotation.y = elapsedTime * 0.15;
      coreGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.1;

      wireframeMesh.scale.setScalar(1.03 + Math.sin(elapsedTime * 2) * 0.02);
      innerLocusMesh.scale.setScalar(0.9 + Math.sin(elapsedTime * 3) * 0.15);

      particles.rotation.y = elapsedTime * 0.02;

      daemonMeshes.forEach(({ mesh, def }) => {
        const angle = elapsedTime * def.speed;
        mesh.position.x = Math.cos(angle) * def.radiusX;
        mesh.position.z = Math.sin(angle) * def.radiusZ;
        mesh.position.y = def.yOffset + Math.sin(angle * 2) * 0.25;
      });

      // Animate Docked Orbs & Satellite Sub-Node Orbits
      socketMeshesGroup.children.forEach(armGroup => {
        const dockedOrbGroup = armGroup.children.find(c => c.name === 'docked-orb-group');
        if (dockedOrbGroup) {
          dockedOrbGroup.rotation.y += 0.012;
          dockedOrbGroup.rotation.x += 0.006;

          const satellitesGroup = dockedOrbGroup.children.find(c => c.name === 'orbiting-satellites-group');
          if (satellitesGroup) {
            satellitesGroup.rotation.z += 0.02;
          }
        }
      });

      controls.update();
      composer.render();
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
    };

      drag.addEventListener('dragend', (event) => { 
        controls.enabled = true; 
        
        const obj = event.object;
        if (obj.name === 'docked-orb-group') {
          const worldPos = new THREE.Vector3();
          obj.getWorldPosition(worldPos);
          const nearest = getNearestVacantSocket(worldPos, socketsRef.current, 4.0);
          
          if (nearest && onDropAttachItem) {
            // apps/ide structure
            const orbChild = obj.children.find(c => c.userData.isOrb);
            const item = orbChild?.userData.item as ApothecaryItem;
            if (item) {
              onDropAttachItem(item, nearest.id);
            }
          }
          
          socketMeshesGroup.children.forEach(arm => {
            const ring = arm.children.find(c => c.userData.isSocket);
            if (ring) {
              const baseColor = ring.userData.ringColor as number;
              const mat = (ring as THREE.Mesh).material as THREE.MeshStandardMaterial;
              if (mat && mat.emissive) {
                mat.emissive.setHex(baseColor);
                mat.emissiveIntensity = 0.7;
              }
            }
          });
        }
      });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update socket ring highlights helper
  const highlightSocketAsTarget = (socketId: string) => {
    socketMeshMapRef.current.forEach((socketGroup, sId) => {
      const ringMesh = socketGroup.children.find(c => c.userData?.isSocket) as THREE.Mesh;
      if (!ringMesh) return;

      const s = socketsRef.current.find(item => item.id === sId);
      if (sId === socketId) {
        // Emerald Magnetic Snap Active Glow
        (ringMesh.material as THREE.MeshStandardMaterial).color.setHex(0x00ff9d);
        (ringMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x00ff9d);
        (ringMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6;
        (ringMesh.material as THREE.MeshStandardMaterial).wireframe = false;
      } else if (s && s.state === 'Vacant') {
        // Revert vacant to cyan wireframe
        (ringMesh.material as THREE.MeshStandardMaterial).color.setHex(0x00f3ff);
        (ringMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x00f3ff);
        (ringMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
        (ringMesh.material as THREE.MeshStandardMaterial).wireframe = true;
      }
    });
  };

  const clearSocketHighlights = () => {
    socketMeshMapRef.current.forEach((socketGroup, sId) => {
      const ringMesh = socketGroup.children.find(c => c.userData?.isSocket) as THREE.Mesh;
      if (!ringMesh) return;
      const s = socketsRef.current.find(item => item.id === sId);
      if (s && s.state === 'Vacant') {
        (ringMesh.material as THREE.MeshStandardMaterial).color.setHex(0x00f3ff);
        (ringMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x00f3ff);
        (ringMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
        (ringMesh.material as THREE.MeshStandardMaterial).wireframe = true;
      }
    });
  };

  // HTML5 Drag Over Handler (2D-to-3D Raycast, Proximity Magnetic Snapping & Trajectory Line)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const targetPosition = raycaster.ray.at(12, new THREE.Vector3());

    // Create 3D Ghost Mesh if not exists
    if (!ghostMeshRef.current) {
      const ghost = createGhostMesh('sphere', 0x00ff9d);
      ghostMeshRef.current = ghost;
      sceneRef.current.add(ghost);
    }
    const ghostMesh = ghostMeshRef.current;

    // Check Proximity Snapping to Vacant Outer Pedestal Platform R = 6.5 (d < 3.0 units)
    let minDistance = Infinity;
    let nearestSocketId: string | null = null;
    let nearestSocketWorldPos: THREE.Vector3 | null = null;

    const currentSockets = socketsRef.current;
    const count = currentSockets.length || 8;

    currentSockets.forEach((sBinding, idx) => {
      if (sBinding.state === 'Vacant') {
        const angle = idx * (Math.PI / 4);
        const pedestalWorldPos = getUmbilicalTipVector(angle, 6.5);
        const dist = targetPosition.distanceTo(pedestalWorldPos);
        if (dist < minDistance) {
          minDistance = dist;
          nearestSocketId = sBinding.id;
          nearestSocketWorldPos = pedestalWorldPos;
        }
      }
    });

    const MAGNETIC_THRESHOLD = 3.0;
    if (minDistance < MAGNETIC_THRESHOLD && nearestSocketWorldPos && nearestSocketId) {
      // Lerp snap 3D Ghost Mesh directly to Outer Tip R = 6.5
      ghostMesh.position.lerp(nearestSocketWorldPos, 0.35);
      snappedSocketIdRef.current = nearestSocketId;

      const nearestSocket = socketsRef.current.find(s => s.id === nearestSocketId);
      setMagneticSnapMessage(`MAGNETIC SNAP TRIGGERED: [${nearestSocket?.name || nearestSocketId}] (Distance: ${minDistance.toFixed(2)}u)`);
      highlightSocketAsTarget(nearestSocketId);

      // Render Dashed Trajectory Line connecting Dragged Ghost Cursor to Target Tip (R = 6.5)
      if (sceneRef.current) {
        if (trajectoryLineRef.current) {
          sceneRef.current.remove(trajectoryLineRef.current);
        }
        const curve = new THREE.QuadraticBezierCurve3(
          targetPosition,
          new THREE.Vector3().addVectors(targetPosition, nearestSocketWorldPos).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.5, 0)),
          nearestSocketWorldPos
        );
        const points = curve.getPoints(24);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xffb000,
          dashSize: 0.2,
          gapSize: 0.1,
          linewidth: 2
        });
        const trajectoryLine = new THREE.Line(lineGeo, lineMat);
        trajectoryLine.computeLineDistances();
        trajectoryLineRef.current = trajectoryLine;
        sceneRef.current.add(trajectoryLine);
      }
    } else {
      // Follow 3D raycast target position
      ghostMesh.position.copy(targetPosition);
      snappedSocketIdRef.current = null;
      setMagneticSnapMessage(null);
      clearSocketHighlights();

      if (trajectoryLineRef.current && sceneRef.current) {
        sceneRef.current.remove(trajectoryLineRef.current);
        trajectoryLineRef.current = null;
      }
    }

    ghostMesh.rotation.x += 0.03;
    ghostMesh.rotation.y += 0.04;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (ghostMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(ghostMeshRef.current);
      ghostMeshRef.current = null;
    }
    if (trajectoryLineRef.current && sceneRef.current) {
      sceneRef.current.remove(trajectoryLineRef.current);
      trajectoryLineRef.current = null;
    }
    snappedSocketIdRef.current = null;
    setMagneticSnapMessage(null);
    clearSocketHighlights();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (ghostMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(ghostMeshRef.current);
      ghostMeshRef.current = null;
    }
    if (trajectoryLineRef.current && sceneRef.current) {
      sceneRef.current.remove(trajectoryLineRef.current);
      trajectoryLineRef.current = null;
    }
    clearSocketHighlights();

    const targetSocketId = snappedSocketIdRef.current || socketsRef.current.find(s => s.state === 'Vacant')?.id;
    snappedSocketIdRef.current = null;
    setMagneticSnapMessage(null);

    const dataRaw = e.dataTransfer.getData('application/json');
    let item: ApothecaryItem | null = null;

    if (dataRaw) {
      try {
        const parsed = JSON.parse(dataRaw);
        item = parsed.item || parsed;
      } catch (err) {
        console.error('Error parsing dropped item payload:', err);
      }
    }

    if (item && targetSocketId) {
      const targetSocket = socketsRef.current.find(s => s.id === targetSocketId);
      if (targetSocket && onDropAttachItem) {
        onDropAttachItem(item, targetSocketId);
      } else if (targetSocket && onSelectSocket) {
        onSelectSocket(targetSocket, item);
      }
    }
  };

  return (
    <div
      className="absolute inset-0 z-0 w-full h-full overflow-hidden bg-[#080b10]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Proximity Magnetic Snap HUD Banner */}
      {magneticSnapMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div className="px-4 py-1.5 bg-emerald-950/90 backdrop-blur-md border border-emerald-400/80 rounded-full shadow-[0_0_20px_rgba(0,255,157,0.4)] flex items-center space-x-2 animate-bounce">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-emerald-300 tracking-wide uppercase">
              {magneticSnapMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
