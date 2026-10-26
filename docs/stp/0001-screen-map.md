# STP-0001 Screen Map: Hackathon Journey

Output of proposal P8 (STP-0001, `.aegis/stp/0001-ui-flow-and-design.md`). Closes unknown U2.

Walked 2026-10-20 by verus in headless Chromium (1440x900, SwiftShader WebGL) against the Vite client (`vite`, no gateway) on branch `stp/0001-ui-flow-and-design` at 22343f1. Screenshots are in `docs/stp/0001-walk/`. The gateway (`npm run dev`) was not running, so gateway-backed features (native Stellar run, sign-in) were not exercised.

## Journey

```
 [Open app]
     |
     v
 DESIGN root ......................................... root-loaded.png
   left: Apothecary Cabinet   right: Build Master Inspector Deck
   bottom: Footer (2nd mode switch, Reliquary, Browser, Export)
     |  click catalog card / "Execute Handshake"
     v
 Orb Builder modal ................................... (overlay)
     |  "Initiate Umbilical Handshake"
     v
 Handshake modal: pick socket, "Execute 9-Step Protocol"  hs-1.png
     |
     v
 DESIGN root, orb docked
     |  click the docked orb in 3D (no visible cue)       [D4]
     v
 Orb Environment: CORE > HTTP API Gateway ............ drill-1.png
   Apothecary and Build Master are gone               [D2]
     |  click a satellite
     v
 Satellite Environment > Actuator
     |  "Back" / breadcrumb                 reload => CORE root  [D3]
     v
 CODE (Stellar Native Starter) ....................... mode-CODE.png
     v
 SIMULATE (Telemetry & Stress) ....................... mode-SIMULATE.png
     v
 DEPLOY (Invariant Audit & Export) ................... mode-DEPLOY.png
```

Overlays reachable from anywhere: CORE Matrix (header), Reliquary and Built-In Browser (footer), Inspector tiers (right-click a card).

## Dead ends and friction found

| # | What happened in the browser | Gap | Fixed by |
|---|---|---|---|
| D1 | Escape does not close the CORE Matrix or the Orb Builder. Only the X or Cancel works. (ov-corematrix.png) | G5 | P3 |
| D2 | Entering an Orb removes the Apothecary and the Build Master entirely; the only controls left are Back and the breadcrumb. CODE, SIMULATE and DEPLOY have no Luminary surface either. (drill-1.png) | G1 | P2 |
| D3 | Reloading inside an Orb Environment returns to the CORE root; the drill position is lost. Mode survives reload. | G2 | P4 |
| D4 | Nothing tells the user a docked orb can be entered. I found the drill-down only by clicking across the scene. | G4 | P1 (current task line) |
| D5 | Two mode switchers (header and footer). Header shows "CORE Matrix" enabled while the footer lists "Core Matrix (Locked)" disabled. | G3, G6 | P1, P5 |
| D6 | The right panel's handshake log reads "100% READY" beside a 78% bar labelled "Initiating Handshake...", at first load with no user action. | G6 | P5 |
| D7 | Header RAM, Threads and "GPU: ACTIVE" are fixed values; footer shows "AUTO SAVE ACTIVE" regardless of save result. | G6 | P5 |
| D8 | Apothecary tier tabs and trust filters are truncated ("T1: Ingred...", "Expe", "Form", "Vali", "Cano"). | G8 | P7 |
| D9 | In SIMULATE and DEPLOY, the 3D canvas view controls (Quality, Motion, Edits) stay visible bottom-right and overlap the mode panels. (mode-SIMULATE.png) | new | not in P1-P8; recorded as an observation |

Modal stacking (G5) could not be reproduced by mouse: the CORE Matrix backdrop blocks clicks on the footer, so the risk is in code paths (state setters firing together), not in this walk. P3 still applies.

## Effect on the order of P1-P7

The walk confirms the approved M1 order. P3 first (D1 is the most frequent friction and every later proposal adds or touches overlays), then P1 (gives D4 a home and removes D5), then P2 (D2), P5 (D5-D7), P6, P4 (D3), P7 (D8). D9 is a new finding outside the approved proposals; it is recorded here and in STP-0001, not acted on.
