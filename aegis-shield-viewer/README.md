# AEGIS shield emblem viewer

Vite + TypeScript + vanilla Three.js viewer for the AEGIS shield emblem model
generated from the source artwork.

## Status

The model generated successfully (single GLB, 877,764 bytes). The file is **not
in this repo yet** — artifact export is disabled on the Mint account that owns
it (`capabilities.downloadsAllowed: false`, no active subscription). Generation
runs on usage credits; export does not.

## Finishing the wiring

1. Export the model's Original GLB from the generation chat.
2. Save it as:

   ```
   public/assets/mint/aegis-shield/original_glb.glb
   ```

3. Run the viewer:

   ```bash
   npm install && npm run dev
   ```

`src/asset-manifest.ts` already points at that path, so no code change is
needed. Until the file is present the viewer shows its load-error state.

## Controls

Orbit, pan, zoom, reset. Material / Solid / Normal display modes with an
independent wireframe overlay. Asset details open from the info button.

## Notes

- `mint-assets.json` records the Mint Project association for this codebase.
  Reuse it for any further generations rather than creating another project.
- GLB loading goes through the shared Draco-capable helper in
  `src/viewer/gltf-runtime.ts`. Do not swap in a bare `GLTFLoader`.
