# ThreeRuntime Main-View Adoption Plan — v0.1

Planning doc for the open IDE-lane shortfall **`threeruntime-main-view-adoption-deferred`**
recorded in `IDE-TOTEM-C-0011` (and first noted as Batch 3 work in `IDE-TOTEM-C-0006`).

**Status:** DESCRIPTIVE / illumination only. This document authorizes no commit, push,
deploy, gate-open, or SSOT change. It is a scope to be executed later under direct
architect direction, one phase at a time, each phase landing green and recording its own
IDE-lane Totem (shortfall → complete).

**Domain:** IDE lane only (writer: Claude). Touches no `native/stellar/**` path and does not
affect the Stellar native execution gate, which remains CLOSED.

---

## 1. Problem

The shared runtime `src/three/ThreeRuntime.ts` is the intended single owner of the Three.js
lifecycle: renderer, scene, camera, controls, composer, clock, RAF, resize, WebGL
context-loss/restore, scene systems (write-domain arbitrated), and final disposal. It is
already adopted cleanly by the admin viewport
[AdminOperationsViewport.tsx](../src/admin/ui/AdminOperationsViewport.tsx) — the reference
pattern: `new ThreeRuntime({…})` + `createSceneAdapter` + `registerSystem(...)` +
`runtime.dispose()` on cleanup.

The **main view** [ThreeCanvas.tsx](../src/components/ThreeCanvas.tsx) (~2,340 lines) does
**not** use the runtime. It re-implements every one of those responsibilities by hand, so
the two most important 3D surfaces in the IDE diverge in camera behavior, render cadence,
picking, context-loss handling, and disposal. This shortfall is to converge the main view
onto `ThreeRuntime`.

## 2. Current bespoke ownership in ThreeCanvas.tsx

| Concern | `ThreeRuntime` provides | `ThreeCanvas.tsx` re-implements at |
|---|---|---|
| Renderer / Scene / Camera | ✓ | `:797` / `:785` / `:790` (fov **55**, near 0.1, far **1000**) |
| Composer + RenderPass + bloom | ✓ via `composerPasses` / `configureComposer` | `:1498`–`:1504` (`UnrealBloomPass`) |
| Camera controls | ✓ `CameraController` (focus / reset / home pose) | `:844` **OrbitControls** + bespoke pose tween `applyPoseToCamera` / `lerpPose` / `easeInOutCubic` (`:1673`) |
| RAF loop / Clock | ✓ `FrameScheduler` (on-demand + opt-in continuous) | `:1591` / `:1619` **unconditional** `requestAnimationFrame` |
| Resize | ✓ `ResizeObserver` | `:1699` `window` resize listener |
| Context loss + rebuild | ✓ recovery contract (`onContextLost` / rebuild) | `:837`–`:838` handlers, **no rebuild path** |
| Picking | ✓ `SelectionSystem` + `SceneRegistry` pick set | `:681` own `Raycaster` against bespoke object refs |
| Secondary label renderer | ✗ (not owned by runtime) | `:808` **`CSS2DRenderer`**, rendered each frame at `:1680` |

Runtime option defaults to preserve current look on adoption: pass `fov: 55`, `near: 0.1`,
`far: 1000` (runtime defaults are 48 / 0.1 / 500).

## 3. Migration deltas (the parts that are not find-and-replace)

1. **OrbitControls → CameraController.** Largest behavioral swap. The main view drives
   camera *feel* through OrbitControls plus its own tween. `CameraController` already exposes
   `focus` / `reset` / home-pose, so the **saved-camera** module (landed per `0011`) should
   map onto it — but this needs a deliberate parity pass or camera feel changes under users.

2. **CSS2DRenderer (labels).** The main view runs a **second renderer** the runtime has no
   hook for. Decide up front: either (a) a small `SceneSystem` that piggybacks on frame
   `update()` + resize to render labels, or (b) extend `ThreeRuntime` with an optional
   secondary-renderer callback (`onAfterRender` + resize propagation). (a) keeps the runtime
   contract untouched and is preferred unless multiple views need it.

3. **Bespoke node graph → registry / factory.** The main view builds Element Totems, orbs,
   satellites, umbilicals, and portals directly, **not** via `SceneNodeFactory`, so
   `SelectionSystem` cannot pick them until they are in `SceneRegistry`. Deepest slice:
   either register the existing objects into the registry, or refactor node construction to
   the `SceneNodeFactory` contract (`src/three/contracts.ts`). The **durable spatial-edit**
   module (landed per `0011`) writes transforms and must be reconciled with whatever owns
   node identity here.

4. **Continuous motion → scheduler.** The animate loop (`:1619`) runs unconditionally and
   mutates many objects per frame gated on `motionEnabledRef` (CORE rotation, portal irises,
   aether points, docked orb / satellites, `aether.update`). The runtime is invalidate-driven
   with opt-in continuous render, so this motion must move into a `SceneSystem.update()` /
   `sceneAdapter.update()` returning `{ needsContinuousRender: true }` while motion is on.
   Bloom needs no such handling — the runtime already supports external composer passes.

5. **Context-loss "Restore 3D View" (free-ish win).** The runtime's `onContextLost` recovery
   contract + rebuild gives the main view the "Restore 3D View" path that was also an open
   Batch-3 item in `0006`; the React wrapper needs to construct a fresh runtime on rebuild.

## 4. Phased execution

Each phase must end green (`npx tsc --noEmit` clean + app tests pass), be visually confirmed
in the live dev build (`http://localhost:3002`), and record its own IDE-lane Totem.

- **P0 — parity spike (feature-flagged).** Stand up a `ThreeRuntime` behind a flag that
  renders only the CORE scene with matched fov/near/far + bloom. No picking, no motion.
  *Acceptance:* CORE renders identically to the bespoke path under the flag; old path still
  default.

- **P1 — camera & labels.** Port OrbitControls behavior + saved-camera onto `CameraController`;
  resolve the CSS2DRenderer decision (§3.2) and wire labels. *Acceptance:* orbit/zoom/pan feel
  and saved-camera restore match current; labels track nodes; resize correct.

- **P2 — topology into registry.** Register CORE / orbs / satellites / umbilicals / portals so
  `SelectionSystem` picks them; retire the bespoke raycaster; reconcile durable spatial-edit
  with registry identity. *Acceptance:* selection + drill-down (CORE→Orb→Satellite→Actuator)
  parity; spatial edits persist.

- **P3 — motion as a system + cutover.** Move animate-loop motion into a system with
  continuous-render opt-in; delete bespoke RAF / resize / context handlers; wire context-loss
  rebuild ("Restore 3D View"); flip the flag to default and remove the old path. *Acceptance:*
  motion parity with `motionEnabledRef`; reduced-motion respected; context-loss recovers.

## 5. Risks & test strategy

- **Primary risk: thin main-view test coverage.** The only runtime test is
  `src/three/runtimeFoundation.test.ts`; `ThreeCanvas.tsx` has **no dedicated test**, so
  regressions ride on visual verification. **Mitigation:** before P2, add characterization
  tests over the seams that *are* testable headlessly — registry contents, pick-set size,
  camera pose (home/saved/restore), and the motion system's `needsContinuousRender` output.
- **Behavioral drift risk:** camera feel (§3.1) and motion timing (§3.4) are the most likely
  to change subtly; gate each on side-by-side visual confirmation.
- **Rollback:** the feature flag is the rollback until P3 cutover; keep the bespoke path until
  P3 acceptance holds.

## 6. Cross-lane dependency (the sibling shortfall)

The other open shortfall in `0011`, **`stellar-coding-env-readiness-awaiting-codex-confirmation`**,
is **not** IDE work. The IDE host is already staged (dev stack green, native gate CLOSED,
`native/stellar/**` untouched); it unblocks only when **Codex records a readiness + gate/authority
decision on the `STELLAR-TOTEM` Language chain**. When that lands, the standing roadmap
(`0011` / `0004`) is the directed **IDE → All-Stellar** migration — which will interact with this
plan, since All-Stellar rewriting touches the same main-view surface. Until then: wait.

## 7. Definition of done

- Main view constructs and disposes exactly one `ThreeRuntime`; no bespoke renderer / scene /
  camera / composer / RAF / resize / raycaster / context handlers remain in `ThreeCanvas.tsx`.
- Camera, selection, drill-down, motion, labels, spatial-edit, and saved-camera all at parity.
- `tsc` clean; app tests green (with the new characterization tests added).
- Shortfall `threeruntime-main-view-adoption-deferred` recorded **complete** on the IDE lane,
  naming the commit(s) and binding the changed files by SHA-256.
