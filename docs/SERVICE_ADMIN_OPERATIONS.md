# Service Admin Operations

The Service Admin application is the protected, observation-only operations view at `/admin/operations`. It presents one POD as a visual CORE with its Orbs, Orb-owned Satellites, Umbilicals, declared Portals, operational routes, and evidence. The existing Architect application remains at `/`.

The default Admin mode is **Flow**: a transaction-first message-flow observatory. **Topology** remains available as the secondary navigation tab for inspecting the underlying CORE, Orbs, Satellites, Umbilicals, and Portals. The current visual direction is recorded in [the user-corrected Admin symmetric message-flow concept](design/admin-message-flow-concept-v3.png). [Concept v2](design/admin-message-flow-concept-v2.png) and [concept v1](design/admin-message-flow-concept.png) are retained as design history, not current routing authority. The runtime UI remains evidence-driven and does not treat concept-art labels as source data.

## Source and domain authority

- The active application authority is the root `src/` tree. `apps/ide` and `aether-realm` are retained historical/experimental trees and are not synchronized by this feature.
- Data crosses an explicit boundary: canonical POD input -> sanitized Admin domain projection -> Three.js scene projection. Three.js systems do not consume unrestricted source records.
- `CORE` is presentation language only. Canonical serialized identity remains `pod_id`; `core_id` is forbidden.
- Pod, Orb, and Umbilical records remain canonical and field-faithful. Satellites are explicitly noncanonical `fixture_satellite` or `conceptual_satellite` projections and must belong to an Orb; they cannot attach directly to CORE.
- Portals are explicitly noncanonical `conceptual_portal` projections. Tender is an optional, noncanonical safeguard projection within a declared Portal, never a freely attachable scene object.
- Runtime, evidence, attachment, health, and source-boundary statuses remain separate axes. A contained or failed Satellite operation remains evidence and does not automatically make CORE non-nominal.

The client-facing contracts and strict validators are under `src/admin/domain`. `PodTopologySnapshot` and `OperationEvent` are the stable transport seam. A future live provider must emit those same validated, allowlisted shapes; it must not expose prompts, completions, credentials, witness state, or unrestricted evidence payloads.

## Gateway, authorization, and operations transport

The same-origin gateway owns both HTML routing and protected APIs:

- `GET /auth/entra/login`
- `GET /auth/entra/callback`
- `POST /auth/logout`
- `GET /api/admin/session`
- `GET /api/admin/operations/snapshot`
- `GET /api/admin/operations/stream` (SSE, with event IDs and cursor resume)

Microsoft Entra authorization is server-enforced on every Admin endpoint. The required app-role value is exactly `service.operations.read`. The browser gate only controls presentation; it is not an authorization boundary. Sessions use an opaque, rotated ID in an HttpOnly, SameSite cookie. Production additionally requires Secure `__Host-` cookie scope, an Entra certificate credential, an exact HTTPS origin/callback, explicit proxy trust, and `REDIS_URL`; production refuses to use the development in-memory session store.

The current `ReplayOperationsProvider` is deterministic fixture data and the UI labels it `REPLAY DATA`. The browser depends on `OperationsDataSource`, while the gateway depends on `OperationsProvider`. A live adapter replaces the provider behind those interfaces without changing the Admin UI, domain schema, replay store, or Three.js projection. Invalid state, authorization loss, sequence gaps, and unsupported routes fail closed or remain visible rather than being converted into success.

Each classified event may carry an allowlisted `SanitizedMessageFlowProjection`. The Flow rail and transaction inspector consume that projection directly; they never infer stages, exchange direction, or terminal party from operation IDs or summaries. Sender and Receiver are per-transaction roles: the same pipeline supports both Human-to-AI and AI-to-Human exchanges without assigning either party a permanent origin role. The supported observations are Sender Ingress, inbound PIM, IRG, CORE Transit, RBC, the Prism/IDS fork, outbound PIM, Receiver Delivery, Return to Sender, and Unavailable. The UI preserves these boundaries:

- RBC is the sole Prism/IDS branch authority.
- Prism proceeds through the receiver-side outbound-PIM projection to Receiver Delivery.
- IDS always loops left through the sender-side outbound-PIM projection to Return to Sender, including the direct lane that bypasses IRG/RBC.
- Both visual outbound-PIM positions represent the single semantic `pim_out` stage; their placement communicates the selected terminal path without inventing separate service stages.
- `exchangeDirection` identifies Human-to-AI or AI-to-Human for the selected transaction. `terminalOutcome` identifies delivery to Receiver, return to the original Sender, shortfall return to the original Sender, pending, or unavailable.
- CORE Transit is explicitly noncanonical, presentation-only coordination.
- Outbound PIM is explicitly a placeholder/pass-through and is never presented as a completed screen.
- Missing `messageFlow` data remains unclassified operational evidence rather than being guessed.

See [server/README.md](../server/README.md) for the authoritative Entra registration, CSP, session, proxy, and production setup procedure.

## Three.js runtime and interaction model

- `ThreeRuntime` is the sole owner of renderer, scene, camera, controls, composer, animation frame, resize handling, diagnostics, and teardown. No subsystem may create its own render loop.
- `TopologySceneSystem` is the only writer for structural CORE/Orb/Satellite/Portal objects. `OperationFlowSystem` owns transient operation packets and route effects. `CameraController` alone changes camera pose. `SelectionSystem` emits domain selections from an intentional pick set.
- `FrameScheduler` renders continuously only for active controls, camera transitions, or packet motion. The Aether scene adapter requests a bounded cadence while otherwise idle; invalidation wakes a single frame.
- `SharedAssetManager` owns cached GLBs, textures, shared geometry, material leases, and final disposal. Scene systems release leases and must not dispose borrowed assets.
- Operation movement is derived from replay time and stable IDs. The fixed-capacity `InstancedMesh` pool contains 128 packets; operation events do not create meshes or replace topology object identities.
- Decorative smoke, stars, bloom shells, route effects, labels, and CORE internals are excluded from picking. WebGL context loss preserves the DOM dashboard, disposes the failed runtime, and offers `Restore 3D View` from external state.

Admin controls are observation-only: orbit, select, focus, inspect, filter, pause/play the view, step, seek, change replay speed, jump to live, and reset replay. There is no topology drag/drop, editor opening, attach/detach, retry, cancel, restart, or trust mutation.

The left drawer opens to the message-flow stage rail with distinct Sender Ingress, Receiver Delivery, and Return to Sender endpoints, plus active transaction counts; Topology remains a secondary tab. The right drawer is transaction-first with Summary, Stage Trace, Boundary Evidence, and Topology tabs. Summary and Stage Trace state the selected exchange direction and terminal party. The bottom replay surface preserves the selected transaction, its observed stage route, the RBC fork, exchange direction, and terminal party. These are semantic HTML surfaces and remain usable when the WebGL viewport is unavailable.

Keyboard controls:

- `Enter` or `F`: focus the selected object
- `Escape`: clear selection
- `Home`: reset the camera
- `Space`: pause or play the view; it never pauses the service

Reduced-motion preference replaces continuous packet travel with bounded/static presentation. The DOM topology, timeline, and inspector remain the accessible operational surface when 3D is unavailable.

## Run, test, build, and deploy

```powershell
npm install
npm run dev
npm run test:gateway
npx tsx --test "src/admin/**/*.test.ts" "src/three/*.test.ts"
npm run build
npm start
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution policy blocks the `.ps1` shims. `npm run dev` starts the Express/Vite same-origin gateway (default `http://localhost:3002`). `npm run build` type-checks the browser and server, emits the client to `dist`, and emits the gateway to `dist-server`. `npm start` serves the production output.

Copy `.env.example` to an untracked local environment file or supply process environment variables. Local development requires `APP_ORIGIN`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_REDIRECT_URI`, and a development-only `ENTRA_CLIENT_SECRET`. Production requires `NODE_ENV=production`, an exact HTTPS `APP_ORIGIN`, matching callback URI, `ENTRA_CLIENT_CERT_THUMBPRINT`, `ENTRA_CLIENT_CERT_PRIVATE_KEY`, `REDIS_URL`, and explicit `TRUST_PROXY`. Never put Entra credentials in browser/Vite variables.

## QA baseline and remaining work

Before the message-flow HUD shift, the authorized desktop production-preview check passed with 61/61 automated tests, full browser/server type-checks, a production build, and zero production dependency vulnerabilities. That measured view used 14 draw calls, 140,027 triangles, 24 geometries, 5 textures, 7 programs, 7 pick targets, DPR 1, and the 128-packet pool. Idle Aether rendering was bounded at approximately 13 frames per second rather than a continuous 60 FPS. Treat these as the prior rendering baseline until the transaction-first Flow HUD completes its coordinated desktop QA pass.

Known residuals:

- The main bundle is 1,051.94 kB (285.04 kB compressed); code splitting and dependency review remain advisable.
- The build reports 29 runtime-resolved GLB warnings. All corresponding browser requests returned HTTP 200 in desktop QA, but asset URL handling should be normalized.
- The unchanged Architect `/` route still reports six nonblocking model-cache timing errors while the GLBs load successfully.
- Mobile QA has not been run. The responsive DOM layout and optional viewport behavior must be validated on target touch devices before release.
