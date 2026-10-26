import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { AEGIS_MODEL_URLS, ALT_AEGIS_MODEL_URLS } from './assetRegistry';

export const gltfModelCache = new Map<string, THREE.Group>();

// ---------------------------------------------------------------------------
// Per-model load status + prioritized, concurrency-limited loading.
//
// Previously every one of the ~33 registered GLBs (~82 MiB) was fetched at once
// via Promise.all, and individual failures resolved silently so aggregate
// loading always reported success. This adds: a status per model, a critical
// "scene-first" ordering, a bounded concurrency pool, and a retry entry point,
// all without changing the existing preloadAllGltfModels contract.
// ---------------------------------------------------------------------------

export type ModelLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** Every registered model key, in registration order. Used by the loader HUD to
 * enumerate total/loaded/errored without re-deriving it from the URL maps. */
export const ALL_MODEL_KEYS = Object.keys(AEGIS_MODEL_URLS) as Array<keyof typeof AEGIS_MODEL_URLS>;

const modelStatus = new Map<string, ModelLoadStatus>();
const statusListeners = new Set<(key: string, status: ModelLoadStatus) => void>();

function setModelStatus(key: string, status: ModelLoadStatus): void {
  modelStatus.set(key, status);
  for (const listener of statusListeners) listener(key, status);
}

/** Current load status for one model key. */
export function getModelStatus(key: string): ModelLoadStatus {
  return modelStatus.get(key) ?? (gltfModelCache.has(key) ? 'loaded' : 'idle');
}

/** Subscribe to per-model load status changes; returns an unsubscribe fn. */
export function subscribeModelStatus(cb: (key: string, status: ModelLoadStatus) => void): () => void {
  statusListeners.add(cb);
  return () => { statusListeners.delete(cb); };
}

// Models needed for the initial CORE scene load before the long tail of
// catalog-only variants, so the scene becomes usable sooner. Any key not listed
// still loads — just after these.
const CRITICAL_MODEL_KEYS: Array<keyof typeof AEGIS_MODEL_URLS> = [
  'coreCrystal', 'coreCaged', 'coreCaged2', 'coreCluster', 'coreHaze',
  'portal', 'portalTender',
  'umbilical', 'umbilicalLong', 'umbilicalLong2', 'umbilicalShort', 'umbilicalBroken',
  'orb', 'satelite1', 'satelite2', 'satelite3', 'satelite4', 'satelite5',
].filter((key) => key in AEGIS_MODEL_URLS) as Array<keyof typeof AEGIS_MODEL_URLS>;

// How many GLBs to fetch/parse at once. Loading all 33 simultaneously saturated
// the connection and delayed the first usable model; a bounded pool lets the
// critical set finish first.
const LOAD_CONCURRENCY = 6;

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

type GltfParserForKtx2 = {
  associations: Map<THREE.Texture, { textures: number }>;
  getDependency(type: 'bufferView', index: number): Promise<ArrayBuffer>;
  json: {
    images: Array<{ bufferView?: number; mimeType?: string; name?: string; uri?: string }>;
    samplers?: Array<{ magFilter?: number; minFilter?: number; wrapS?: number; wrapT?: number }>;
    textures: Array<{
      name?: string;
      sampler?: number;
      extensions?: { KHR_texture_basisu?: { source: number } };
    }>;
  };
  options: { ktx2Loader?: KTX2Loader };
};

const WEBGL_FILTERS: Record<number, THREE.MagnificationTextureFilter | THREE.MinificationTextureFilter> = {
  9728: THREE.NearestFilter,
  9729: THREE.LinearFilter,
  9984: THREE.NearestMipmapNearestFilter,
  9985: THREE.LinearMipmapNearestFilter,
  9986: THREE.NearestMipmapLinearFilter,
  9987: THREE.LinearMipmapLinearFilter,
};
const WEBGL_WRAPPINGS: Record<number, THREE.Wrapping> = {
  33071: THREE.ClampToEdgeWrapping,
  33648: THREE.MirroredRepeatWrapping,
  10497: THREE.RepeatWrapping,
};

/**
 * GLTFLoader normally converts embedded images to blob URLs. Its preferred
 * ImageBitmapLoader then fetches those URLs, which is governed by connect-src.
 * Select TextureLoader while each parser is created so embedded PNG/JPEG data
 * stays under the already-scoped img-src blob: policy instead.
 */
class StrictCspGltfLoader extends GLTFLoader {
  override parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: Parameters<GLTFLoader['parse']>[2],
    onError?: Parameters<GLTFLoader['parse']>[3],
  ): void {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      super.parse(data, path, onLoad, onError);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'createImageBitmap', originalDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'createImageBitmap');
      }
    }
  }
}

const loader = new StrictCspGltfLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();

// One shared decoder covers every model loaded through this service, including
// Mint-optimized refreshes that declare KHR_draco_mesh_compression. The decoder
// payload is copied verbatim from the installed Three.js package and served by
// the Lab, so loading a model never depends on a third-party runtime origin.
export const DRACO_DECODER_PATH = '/draco/gltf/';
dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
loader.setDRACOLoader(dracoLoader);

// Self-hosted, eval-free Basis transcoder from the pinned official Three.js
// distribution recorded in public/basis/PROVENANCE.json.
// The AEGIS .glb assets declare KHR_texture_basisu + EXT_meshopt_compression as
// extensionsRequired, so both decoders must be attached or every load rejects.
ktx2Loader.setTranscoderPath('/basis/');
loader.setKTX2Loader(ktx2Loader);
loader.setMeshoptDecoder(MeshoptDecoder);

// The stock KHR_texture_basisu path converts embedded bufferViews to blob URLs
// and asks FileLoader to fetch them, which would require connect-src blob:.
// Override that one extension with an in-memory KTX2 parse so the strict CSP can
// keep connect-src same-origin while worker-src remains narrowly blob-enabled.
loader.register((rawParser) => {
  const parser = rawParser as unknown as GltfParserForKtx2;
  return {
    name: 'KHR_texture_basisu',
    loadTexture(textureIndex: number): Promise<THREE.Texture> | null {
      const textureDef = parser.json.textures[textureIndex];
      const extension = textureDef.extensions?.KHR_texture_basisu;
      if (!extension) return null;

      const sourceDef = parser.json.images[extension.source];
      const bufferViewIndex = sourceDef.bufferView;
      const configuredLoader = parser.options.ktx2Loader;
      if (!configuredLoader) {
        throw new Error('THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures');
      }
      if (bufferViewIndex === undefined) {
        // External same-origin KTX2 files do not create blob fetches.
        return new Promise((resolve, reject) => {
          configuredLoader.load(sourceDef.uri ?? '', resolve, undefined, reject);
        });
      }

      return parser.getDependency('bufferView', bufferViewIndex).then((buffer) => (
        new Promise<THREE.Texture>((resolve, reject) => {
          configuredLoader.parse(buffer, resolve, reject);
        })
      )).then((texture) => {
        const sampler = parser.json.samplers?.[textureDef.sampler ?? -1] ?? {};
        texture.flipY = false;
        texture.name = textureDef.name ?? sourceDef.name ?? '';
        texture.magFilter = WEBGL_FILTERS[sampler.magFilter ?? -1] as THREE.MagnificationTextureFilter
          ?? THREE.LinearFilter;
        texture.minFilter = WEBGL_FILTERS[sampler.minFilter ?? -1] as THREE.MinificationTextureFilter
          ?? THREE.LinearMipmapLinearFilter;
        texture.wrapS = WEBGL_WRAPPINGS[sampler.wrapS ?? -1] ?? THREE.RepeatWrapping;
        texture.wrapT = WEBGL_WRAPPINGS[sampler.wrapT ?? -1] ?? THREE.RepeatWrapping;
        parser.associations.set(texture, { textures: textureIndex });
        return texture;
      });
    },
  };
});

// KTX2Loader must be told which compressed texture formats the GPU supports
// before it parses anything. Gate the first load on that call.
let resolveRendererReady: () => void;
const rendererReady = new Promise<void>((resolve) => {
  resolveRendererReady = resolve;
});

export function setupGltfLoaderRenderer(renderer: THREE.WebGLRenderer) {
  try {
    ktx2Loader.detectSupport(renderer);
  } catch (err) {
    console.warn('Failed to detect KTX2 support on WebGLRenderer:', err);
  }
  resolveRendererReady();
}

/**
 * Every AEGIS .glb exports with metallicFactor=1 and roughnessFactor=1. At
 * metalness 1 a surface has no diffuse response — it shows only reflected
 * environment — so without an envMap the models render as black silhouettes and
 * the prismatic baseColorTexture (the "shader skin") is never visible.
 *
 * Rebalance toward reflective-but-not-pure-metal, and drive a gentle emissive
 * from the base colour map so each model self-glows in ITS OWN colours rather
 * than being flattened to one tint. Applied once to the cached source model, so
 * every clone inherits it and no per-instance material cloning is needed.
 */
function conditionAegisMaterial(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of mats) {
      const mat = raw as THREE.MeshStandardMaterial;
      if (!('metalness' in mat)) continue;

      mat.metalness = 0.72;
      mat.roughness = 0.26;
      mat.envMapIntensity = 1.35;

      if (mat.map) {
        mat.emissiveMap = mat.map;
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 0.42;
      }
      mat.needsUpdate = true;
    }
  });
}

const PRESERVE_AUTHORED_MATERIAL_KEYS = new Set<keyof typeof AEGIS_MODEL_URLS>([
  'aegisShield'
]);

function loadOne(key: keyof typeof AEGIS_MODEL_URLS): Promise<void> {
  // Idempotent: an already-cached model is a no-op success, so retries and
  // repeated preloads never refetch.
  if (gltfModelCache.has(key)) {
    setModelStatus(key, 'loaded');
    return Promise.resolve();
  }
  setModelStatus(key, 'loading');
  return new Promise<void>((resolve) => {
    const tryLoad = (targetUrl: string, isAlt = false) => {
      const fallback = (reason: unknown) => {
        const altUrl = ALT_AEGIS_MODEL_URLS[key];
        if (!isAlt && altUrl && altUrl !== targetUrl) {
          tryLoad(altUrl, true);
        } else {
          console.warn(`[GLTF WARNING] Could not load ${key} from ${targetUrl}:`, reason);
          setModelStatus(key, 'error');
          resolve();
        }
      };

      try {
        loader.load(
          targetUrl,
          (gltf) => {
            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            if (!PRESERVE_AUTHORED_MATERIAL_KEYS.has(key)) {
              conditionAegisMaterial(gltf.scene);
            }
            gltfModelCache.set(key, gltf.scene);
            setModelStatus(key, 'loaded');
            console.log(`[GLTF SUCCESS] Loaded ${key} from ${targetUrl}`);
            resolve();
          },
          undefined,
          fallback
        );
      } catch (err) {
        fallback(err);
      }
    };

    tryLoad(AEGIS_MODEL_URLS[key]);
  });
}

/** Ordered key list: the critical scene set first, then everything else. */
function prioritizedKeys(): Array<keyof typeof AEGIS_MODEL_URLS> {
  const all = Object.keys(AEGIS_MODEL_URLS) as Array<keyof typeof AEGIS_MODEL_URLS>;
  const critical = CRITICAL_MODEL_KEYS.filter((key) => all.includes(key));
  const criticalSet = new Set<string>(critical);
  const rest = all.filter((key) => !criticalSet.has(key));
  return [...critical, ...rest];
}

/**
 * Load a specific ordered subset of models (critical-first, concurrency-limited).
 * Resolves true when all requested models are cached, false if any errored.
 */
export async function preloadModels(
  keys: Array<keyof typeof AEGIS_MODEL_URLS>,
  renderer?: THREE.WebGLRenderer,
): Promise<boolean> {
  if (renderer) setupGltfLoaderRenderer(renderer);
  await rendererReady;
  await runWithConcurrency(keys, LOAD_CONCURRENCY, loadOne);
  return keys.every((key) => gltfModelCache.has(key));
}

/** Retry a single model that previously failed. Resolves true when now cached. */
export async function retryModel(
  key: keyof typeof AEGIS_MODEL_URLS,
  renderer?: THREE.WebGLRenderer,
): Promise<boolean> {
  if (renderer) setupGltfLoaderRenderer(renderer);
  await rendererReady;
  await loadOne(key);
  return gltfModelCache.has(key);
}

// Single in-flight promise shared by every caller. Without this the ~13MB of
// .glb assets were re-fetched once per call site per StrictMode mount.
let preloadPromise: Promise<boolean> | null = null;

export function preloadAllGltfModels(renderer?: THREE.WebGLRenderer): Promise<boolean> {
  if (renderer) {
    setupGltfLoaderRenderer(renderer);
  }

  if (!preloadPromise) {
    const keys = prioritizedKeys();
    preloadPromise = rendererReady
      .then(() => runWithConcurrency(keys, LOAD_CONCURRENCY, loadOne))
      .then(() => keys.every((key) => gltfModelCache.has(key)))
      .catch((err) => {
        console.warn('Some GLTF assets failed to load:', err);
        return false;
      });
  }

  return preloadPromise;
}
