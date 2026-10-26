import type { ViewerManifest } from "./viewer/types";

// The AEGIS shield emblem was generated from the source artwork as a single model.
// The GLB is not in this repo yet: artifact export is gated on the Mint account
// (capabilities.downloadsAllowed === false). Once it is exported, save it to
// public/assets/mint/aegis-shield/original_glb.glb and this viewer runs as-is.
export const assetManifest = {
  kind: "model",
  title: "AEGIS shield emblem",
  activeItemId: "aegis-shield",
  items: [
    {
      id: "aegis-shield",
      title: "AEGIS shield emblem",
      glbUrl: "/assets/mint/aegis-shield/original_glb.glb",
      format: "glb",
      fileSizeBytes: 877764,
    },
  ],
} satisfies ViewerManifest;
