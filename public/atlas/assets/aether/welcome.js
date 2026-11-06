import * as THREE from './three.module.js';
    import { GLTFLoader } from './loaders/GLTFLoader.js';
    import { vertexShader, fragmentShader } from './AetherBackground.js';

    // Values mirror the workspace Luminary presence (src/three/luminaryPresence.ts).
    const REST_GLOW = 0.3;
    const PULSE_SCALE = 0.035;
    const PULSE_RATE = 1.8;
    const MODEL_HEIGHT = 2.86;
    const LUMINARY_URL = new URL('../../../assets/models/LUMINARY.glb', import.meta.url).href;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionPreference.matches;
    const aetherCanvas = document.getElementById('aether');
    const luminaryCanvas = document.getElementById('luminary');

    let aetherRenderer = null;
    let luminaryRenderer = null;
    const owned = [];
    let materials = [];
    let loaded = false;
    let disposed = false;

    function goStill() {
      document.body.classList.add('still');
    }

    // Shared clock for both canvases; the Luminary breathes and the Aether drifts.
    const clock = new THREE.Clock();
    const schedules = [];
    // Every event reconciles one owned RAF per canvas. Lost/hidden/disposed views never schedule.
    function createSchedule(canvas, draw, ready = () => true) {
      let frame = 0;
      let lost = false;
      const stop = () => { cancelAnimationFrame(frame); frame = 0; };
      const available = () => !disposed && !lost && !document.hidden && ready();
      const tick = () => {
        frame = 0;
        if (!available() || reduceMotion) return;
        draw();
        frame = requestAnimationFrame(tick);
      };
      const reconcile = () => {
        stop();
        if (!available()) return;
        draw();
        if (!reduceMotion) frame = requestAnimationFrame(tick);
      };
      const onLost = (event) => { event.preventDefault(); lost = true; stop(); };
      const onRestored = () => { lost = false; reconcile(); };
      canvas.addEventListener('webglcontextlost', onLost);
      canvas.addEventListener('webglcontextrestored', onRestored);
      const schedule = { reconcile, stop, dispose() {
        stop();
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
      }};
      schedules.push(schedule);
      return schedule;
    }
    const reconcileAll = () => { for (const schedule of schedules) schedule.reconcile(); };
    const onMotionChange = () => { reduceMotion = motionPreference.matches; reconcileAll(); };
    motionPreference.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', reconcileAll);

    // ---- Aether background (full-screen shader, as in the IDE) -------------------------------
    try {
      aetherRenderer = new THREE.WebGLRenderer({ canvas: aetherCanvas, antialias: false, alpha: false });
    } catch (err) {
      goStill();
    }

    let aetherMaterial = null;
    if (aetherRenderer) {
      aetherRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      aetherRenderer.setSize(window.innerWidth, window.innerHeight, false);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      aetherMaterial = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false
      });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), aetherMaterial));
      owned.push(aetherMaterial, scene.children[0].geometry);

      const drawAether = () => {
        aetherMaterial.uniforms.u_time.value = clock.getElapsedTime();
        aetherRenderer.render(scene, camera);
      };
      const aetherSchedule = createSchedule(aetherCanvas, drawAether);
      aetherCanvas.addEventListener('webglcontextlost', goStill);
      aetherCanvas.addEventListener('webglcontextrestored', () => {
        if (!disposed) document.body.classList.remove('still');
      });
      window.addEventListener('resize', () => {
        if (disposed) return;
        aetherRenderer.setSize(window.innerWidth, window.innerHeight, false);
        aetherMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
        aetherSchedule.reconcile();
      });
      aetherSchedule.reconcile();
    }

    // ---- The 3D Luminary --------------------------------------------------------------------
    let luminaryScene = null;
    let luminaryCamera = null;
    let body = null;

    try {
      luminaryRenderer = new THREE.WebGLRenderer({ canvas: luminaryCanvas, antialias: true, alpha: true });
    } catch (err) {
      luminaryRenderer = null;
    }

    if (luminaryRenderer) {
      luminaryRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      luminaryRenderer.outputColorSpace = THREE.SRGBColorSpace;
      luminaryRenderer.setClearColor(0x000000, 0);

      luminaryScene = new THREE.Scene();
      luminaryCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      luminaryCamera.position.set(0, 0, 6);
      luminaryCamera.lookAt(0, 0, 0);

      // The same lights as the workspace presence: a warm key and a soft white fill.
      const key = new THREE.PointLight(0xfcd34d, 0.6, 9, 2);
      key.position.set(0, 0.4, 0.8);
      const fill = new THREE.PointLight(0xffffff, 1.4, 12, 2);
      fill.position.set(0.6, 0.8, 3);
      luminaryScene.add(key, fill);
      body = new THREE.Group();
      luminaryScene.add(body);

      const resizeLuminary = () => {
        const { clientWidth: w, clientHeight: h } = luminaryCanvas;
        if (!w || !h) return;
        luminaryRenderer.setSize(w, h, false);
        luminaryCamera.aspect = w / h;
        luminaryCamera.updateProjectionMatrix();
      };
      resizeLuminary();
      window.addEventListener('resize', resizeLuminary);

      // Match StrictCspGltfLoader in the workspace: embedded images use img-src blob:,
      // not ImageBitmapLoader's fetch (which would require widening connect-src).
      class StrictCspGltfLoader extends GLTFLoader {
        parse(data, path, onLoad, onError) {
          const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
          Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: undefined });
          try { super.parse(data, path, onLoad, onError); }
          finally {
            if (descriptor) Object.defineProperty(globalThis, 'createImageBitmap', descriptor);
            else Reflect.deleteProperty(globalThis, 'createImageBitmap');
          }
        }
      }
      const loader = new StrictCspGltfLoader();
      loader.load(
        LUMINARY_URL,
        (gltf) => {
          if (disposed) {
            disposeModel(gltf.scene);
            return;
          }
          const model = gltf.scene;
          model.traverse((node) => {
            if (!node.isMesh) return;
            // The supplied export carries no normals; lighting needs them.
            if (!node.geometry.getAttribute('normal')) node.geometry.computeVertexNormals();
            const own = node.material.clone();
            // Lit as a surface, not as metal: with no environment map a metallic finish renders dark.
            own.metalness = 0;
            own.emissiveMap = own.map ?? own.emissiveMap;
            own.emissive = new THREE.Color(0xffffff);
            own.emissiveIntensity = REST_GLOW;
            owned.push(own);
            node.material = own;
            materials.push(own);
          });
          // Fit to the same height as the workspace presence and centre it on the origin.
          const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
          if (size.y > 0) model.scale.multiplyScalar(MODEL_HEIGHT / size.y);
          const centre = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
          model.position.sub(centre);
          body.add(model);
          loaded = true;
          luminarySchedule.reconcile();
        },
        undefined,
        () => {
          // A failed load leaves the page text in place with no Luminary; the Aether still shows.
          luminaryCanvas.style.display = 'none';
        }
      );

      const drawLuminary = (elapsed) => {
        const breath = reduceMotion ? 0 : Math.sin(elapsed * PULSE_RATE);
        body.scale.setScalar(1 + breath * PULSE_SCALE);
        for (const material of materials) material.emissiveIntensity = REST_GLOW * (1 + breath * 0.12);
        key.intensity = 0.4 + REST_GLOW * 1.2 * (1 + breath * 0.12);
        luminaryRenderer.render(luminaryScene, luminaryCamera);
      };

      const luminarySchedule = createSchedule(luminaryCanvas,
        () => drawLuminary(reduceMotion ? 0 : clock.getElapsedTime()), () => loaded);
      luminaryCanvas.addEventListener('webglcontextlost', () => { luminaryCanvas.style.visibility = 'hidden'; });
      luminaryCanvas.addEventListener('webglcontextrestored', () => {
        if (!disposed) luminaryCanvas.style.visibility = '';
      });
    } else {
      luminaryCanvas.style.display = 'none';
    }

    // ---- Clean up animation loops and WebGL resources when the view closes ------------------
    function disposeModel(root) {
      root.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
      });
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      motionPreference.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', reconcileAll);
      for (const schedule of schedules) schedule.dispose();
      for (const item of owned) item.dispose?.();
      owned.length = 0;
      if (body) {
        const textures = new Set();
        body.traverse(node => { if (node.isMesh) for (const value of Object.values(node.material)) if (value?.isTexture) textures.add(value); });
        for (const texture of textures) texture.dispose();
        disposeModel(body);
      }
      materials = [];
      if (aetherRenderer) { aetherRenderer.dispose(); aetherRenderer.forceContextLoss(); }
      if (luminaryRenderer) { luminaryRenderer.dispose(); luminaryRenderer.forceContextLoss(); }
    }
    window.addEventListener('pagehide', dispose);
    // A cached document owns disposed GPU resources; rebuild it when browser Back restores it.
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
