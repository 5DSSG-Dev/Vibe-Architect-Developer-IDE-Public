# Housekeeping Ledger

**What this is:** a list of everything in the repository (the project's shared folder of code and documents, tracked by Git) that can be moved, merged, removed or tidied so the project is clean for the Meta hackathon.

**Who it's for:** anyone on the team, coder or not. Plain words come first. The technical term follows in parentheses, and some items have a **"More detail"** section you can open for the advanced version.

Scanned: 2026-10-24, by Verus (Claude Code), on branch `stp/0002-ai-integration-and-luminary-presence` at commit `b3e5dd5`.
Status: **Nothing has been moved or deleted yet.** Every item waits for the Architect's go-ahead.

---

## How to read an entry

| Column | Meaning |
|---|---|
| **#** | The item's number, so people can say "do H12". |
| **What** | The thing, in plain words. |
| **Where** | The file or folder (its path). |
| **Why** | What's wrong with it now. |
| **Do** | The proposed fix. **Archive** means move it into `archive/` so it's out of the way but still kept. **Remove** means take it out of the project (Git history still keeps a copy). |
| **Owner** | Which team member's area it falls in (see [the team charter](TEAM_SYSTEMS_AND_LANES.md)): S1 Verus, S2 Claude Code 2, S3 Codex, S4 ChatGPT Work. |
| **Risk** | **Low** = safe, nothing uses it. **Check** = something might use it; confirm first. **Decide** = the Architect has to choose. |

---

## The big picture

| | Count | Size |
|---|---|---|
| Files tracked in the project (tracked files) | 3,051 | about 730 MB |
| Pictures and 3D models (`public/`) | 305 | 662 MB |
| Stellar language build history (`native/stellar/v0_1/evidence` and `release`) | 1,873 | 14 MB |
| Exact copies of another file (byte-for-byte duplicates), outside the Stellar history | 118 | 78 MB |
| Loose files sitting at the very top of the project (the repository root) | 38 | 43 MB |

The three biggest wins:
1. **Clear the top level.** Visitors see it first, and right now it holds zip files, compiled leftovers and logs.
2. **Remove duplicate pictures and models.** About 78 MB of exact copies.
3. **One copy of each design document.** Two key specs exist twice, and the copies disagree.

---

## Rules for doing the cleanup

1. **Nothing is deleted outright.** Things move to `archive/`, or they're removed from the project while Git history still holds them.
2. **Claim before you move.** Every move goes on the claims board (`.aegis/claims.md`), because moving a file another peer is editing breaks their work.
3. **Don't touch the main checkout's unsaved work.** The main folder (`G:\AEGIS_DEVELOPMENT_REPOS\Vibe-Architect-Developer-IDE`, branch `totem/ide-c-0012-threeruntime-adoption-scope`) has **59 changes that haven't been saved to Git yet (uncommitted changes)**. They include edits to the 3D scene, four deleted models and new files. Someone is mid-work there. Cleanup happens on its own branch and is merged later; nobody tidies that folder directly.
4. **Leave the "proof" files alone.** Some files are checked by their exact contents (hash-bound), so moving or editing them breaks the record that proves they're authentic. These are listed in section G.
5. **Hackathon timing.** Cleanup doesn't add features, so it shouldn't raise the "pre-existing code" question (STP-0002 finding S11). Still, it's best finished before the event opens on Monday, Oct 26.
6. **Prove nothing broke.** After each group of moves: the type check (`tsc`), the tests (`npm test`) and the build (`npm run build`) must all pass.

---

## A. Clear the top level

These are loose files at the top of the project. None of them is used by the app.

| # | What | Where | Why | Do | Owner | Risk |
|---|---|---|---|---|---|---|
| H1 | A 40 MB zip of the Stellar native folder | `native.zip` | A copy of `native/`, which is already in the project. It's the single biggest file. | Remove | S4 | Low |
| H2 | A zip of the ORBS folder | `ORBS.zip` | A copy of `ORBS/`. | Remove | S1 | Low |
| H3 | Seven compiled leftovers from building Stellar (object files) | `canonical_json.obj`, `lab_gateway_bridge.obj`, `lab_gateway_bridge_selftest.obj`, `protected_installed_artifact.obj`, `protected_installed_artifact_selftest.obj`, `relational-flow-validator-selftest.obj` | Machine output from a build. It belongs in a build folder, not the top level, and can be regenerated. | Remove, and add `*.obj` to the ignore list (`.gitignore`) | S4 | Check |
| H4 | Two one-off Python scripts for the Stellar font | `build_new_stellar_fixed.py`, `verify_new_stellar_fixed.py` | Two docs mention the first one. | Move to `scripts/stellar-font/` and update the two docs that point to it | S4 | Check |
| H5 | A log export from Grok (another AI) | `grok_logs.csv` | A chat or log dump, not project material. | Archive | S4 | Low |
| H6 | An asset list for the separate shield viewer | `mint-assets.json` | It belongs to `aegis-shield-viewer/`, which has its own copy. | Remove the top-level copy | S3 | Check |
| H7 | A settings file for an editor plug-in (webhint) | `.hintrc` | Nothing uses it. | Remove | S4 | Low |
| H8 | PDF and picture copies of documents | `CORE_CONNECTION_STANDARD.pdf`, `CORE_CONNECTION_STANDARD.jpg`, `CORE_ELEMENT_CATALOG.pdf`, `IMPLEMENTATION_PLAN.pdf` | Printed versions of Markdown documents that are kept elsewhere. They go out of date silently. | Move to `docs/print/`, or remove | S4 | Decide |
| H9 | Four large design documents at the top level | `AEGIS_LIVING_SOFTWARE_DOCTRINE.md`, `AEGIS_PROGRESSIVE_REASONING_MATHEMATICS.md`, `DISCUSSION_ON_IDE_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md` | Documents belong in `docs/`. The top level should hold only the README, the agent and Totem guides, and setup files. | Move to `docs/` (H10 covers the two duplicated specs) | S4 | Check |

**After A, the top level would hold only:** `README.md`, `AGENTS.md`, `ROOT_TOTEM.md`, the package and setup files (`package.json`, `tsconfig*.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.env.example`, `.gitignore`, `.gitattributes`) and the folders.

---

## B. Documents that exist twice

| # | What | Where | Why | Do | Owner | Risk |
|---|---|---|---|---|---|---|
| H10 | The Living Development Environment Spec, twice | top level (626 lines) and `docs/` (1,155 lines) | The two copies differ. A reader can't tell which is current. | The Architect picks the current one. It stays in `docs/` and the other goes to `archive/`. | S4 | Decide |
| H11 | The Operating Standards and Flows, twice | top level (1,355 lines) and `docs/` (726 lines) | Same problem, but here the top-level copy is the longer one. | Same as H10 | S4 | Decide |
| H12 | Office documents with no readable version | `docs/*.odt` (4 files), `docs/Elements of the AEGIS Pod Architecture.ods` | GitHub and AI peers can't read OpenDocument files (`.odt`, `.ods`), so whatever they say is invisible to the team. | Convert each to Markdown in `docs/`; keep the originals in `docs/source/` | S4 | Low |
| H13 | Misspelled file names | `docs/AEGIS_VIBE_ARCHITECT_IDE_ACTUIATORS.md` (Actuators), and the reference to `APOTHOCARY_RECIPIES.md` | Misspellings make files hard to find by search. | Rename and fix the links | S4 | Check |

---

## C. Duplicate pictures and models

| # | What | Where | Why | Do | Owner | Risk |
|---|---|---|---|---|---|---|
| H14 | 20 pictures stored twice | `public/assets/image_files/` and `.../ELEMENT_IMAGES/2D_IMAGE_FILES_TO_BE_CONVERTED/` | Byte-for-byte copies (Satellites, Orbs, Umbilicals, Formulas, Tender). | Keep one copy | S3 | Check |
| H15 | Extra copies of the REAGENTS and VERIFIERS pictures | `public/assets/image_files/REAGENTS_*.png`, `ELEMENT_IMAGES/VERIFIERS*.png` | Seven more exact copies under different names. | Keep one of each | S3 | Check |
| H16 | A model saved twice | `public/assets/models/prismatic-aegis-emblem-optimized (1).glb` | A copy made by a download, with " (1)" added to its name. | Remove | S3 | Low |
| H17 | **A Formula that is secretly an Orb** | `FORMULA_3_3.glb` and `ORB_2_9.glb` | These two files are identical. Either a Formula is using an Orb's model by mistake, or the file was misnamed. | The Architect says which object this is; Codex fixes the other. | S3 | Decide |
| H18 | None of the pictures in `image_files/` is loaded by the app by name | `public/assets/image_files/` (192 files) | They're design source art, not app assets, and they make the app's download bigger. | Move unused art to `design-sources/`; keep only what the app shows | S3 | Check |
| H19 | About 70 of the 101 tracked models aren't used by the app yet | `public/assets/models/` | Mostly the Actuator figures, waiting to be wired in. Not wrong, but heavy. | Keep. They become the optimized set in System 3's plan. | S3 | Low |

<details>
<summary>More detail: how duplicates were found</summary>

Every tracked file outside the Stellar history was fingerprinted (SHA-1 content hash), and files with the same fingerprint were grouped. That found 117 groups with 118 extra copies, about 77.7 MB in total. Copies inside the Stellar test folders are deliberate and are listed under G.
</details>

---

## D. Code that nothing uses

| # | What | Where | Why | Do | Owner | Risk |
|---|---|---|---|---|---|---|
| H20 | An old version of the Apothecary drawer | `src/components/ApothecaryDrawer.tsx` | Nothing imports it. `LeftDrawer.tsx` replaced it and exports the same name. An identical copy is already in `archive/`. | Remove | S2 | Low |
| H21 | An unused Alchemist component | `src/components/AlchemistReliquary.tsx` | Nothing imports it; the app uses `AlchemistReliquaryModal.tsx` instead. | Archive | S2 | Low |
| H22 | Unused 3D helper code | `src/utils/threeUtils.ts` | Nothing imports it. | Remove | S3 | Low |
| H23 | A stray editor workspace file inside the code | `src/components/aether-realm.code-workspace` | A VS Code setting file inside the components folder. | Remove | S4 | Low |
| H24 | The broken ORBS experiment | `ORBS/` | About 240 lines that import folders which don't exist, plus a pasted AI output file (`gemini-code-1787019969774.ts`) that is a copy of another file. Not part of the IDE. | Archive (STP-0003 P7, already approved) | S1 | Low |
| H25 | An early 3D experiment | `ANTIGRAVITY_ENGINE/` (4 files) | Nothing refers to it. `src/engine/antigravity.ts` is the live version. | Archive | S3 | Check |
| H35 | A background pattern downloaded from an outside website | `src/components/AlchemistReliquaryModal.tsx:156` (and the unused copy in H21) | The panel loads its texture from `transparenttextures.com` each time it opens. If that site is slow or down during the demo, the panel looks different, and it's an outside request the project doesn't control. | Save the pattern into `public/assets/` and point to the local copy | S2 | Low |
| H26 | An empty app folder | `apps/` | Holds only two TOTEM files; the code was archived on Oct 20. | Archive with its Totems | S4 | Low |

<details>
<summary>More detail: how unused code was found</summary>

For each source file in `src/` (not counting tests and the entry file `main.tsx`), the scan looked for any `import` or lazy `import()` of it from `src/`, `server/` or `scripts/`. Only the three files in H20–H22 have none. Code loaded only by a string path, or a separate web page, wouldn't show up this way, so the "Check" items should be opened once before removal.
</details>

---

## E. Leftover tool output

| # | What | Where | Why | Do | Owner | Risk |
|---|---|---|---|---|---|---|
| H27 | Saved browser-page snapshots from testing tools | `.playwright-cli/` (21), `.playwright-mcp/` (1) | Automatic snapshots from browser test runs (Playwright), mostly from August. Two pairs are exact copies. | Remove, and add both folders to `.gitignore` | S4 | Low |
| H28 | Process ID files | `output/playwright/*.pid` (3) | Temporary files that record a running program; they mean nothing once it stops. | Remove, add `*.pid` to `.gitignore` | S4 | Low |
| H29 | Screenshots and test results | `output/` | Useful as proof of past work, but `output/` mixes proof with scratch. | Move proof screenshots to `docs/evidence/`; remove the rest; ignore `output/` | S4 | Check |

---

## F. Decisions for the Architect

| # | Question | Where | Why it matters |
|---|---|---|---|
| H30 | Do the two side apps stay? | `aegis-shield-viewer/`, `aether-realm/` | Each is a separate small app with its own packages (`package.json`). `.claude/launch.json` starts the shield viewer, and the Service Admin doc mentions Aether Realm. If they're part of the demo, they need a README line explaining what they are; if not, archive them. |
| H31 | Where should the very large 3D originals live? | `public/assets/models/3D_GLB_IMAGE_FILES/` (main checkout only, not tracked, about 1.8 GB) | Too big for Git and not backed up. Options: Git Large File Storage (Git LFS), cloud storage, or keep them only on this computer and track the optimized copies. |
| H32 | Should 3D test tooling be inside the art folder? | `public/assets/image_files/ELEMENT_IMAGES/to3d-desktop-automation/` (main checkout, untracked) | It holds a full `node_modules` program folder inside `public/`, so it would be published with the app if it were ever committed. Move it to `scripts/` or its own folder. |
| H33 | Where do the `.github/agents` files belong? | `.github/agents/` | They call Probe and Seeker "Actuators", while the team's diagram calls them Satellites. Pick one name and align the files. |
| H34 | Unify the Element type lists | 4 places in `src/` | Already approved as STP-0003 P1. Listed here so the ledger is complete. |

---

## G. Leave alone, on purpose

These look messy but are intentional. **Don't move them.**

| What | Where | Why it stays |
|---|---|---|
| Stellar build and release history | `native/stellar/v0_1/evidence/`, `release/` (1,873 files) | It proves how the Stellar compiler was built and tested. Many files are checked by their exact contents (hash-bound). |
| Copies of the Stellar schemas inside the tests | `native/stellar/v0_1/tests/schemas/` (36), `sandbox/build-check` and `build-debug` | The tests must run against fixed copies, so these duplicates are deliberate. |
| Totem records and STP files | `totems/`, `.aegis/`, every `TOTEM.md` | Append-only continuity. Their line endings are pinned (in `.gitattributes`) so the hashes hold. |
| The archive | `archive/` | It already exists for this purpose. Cleanup adds to it. |
| Engine files with identical copies in the archive | `src/engine/antigravity.ts`, `contractStore.ts`, `resourceAllocator.ts`, `simulationEngine.ts` | The live files are in use; the archive copies are the dated snapshot from Oct 20. |

---

## Suggested order

1. **Low-risk group first:** H1, H2, H5, H7, H16, H20–H23, H26–H28. Run the checks after.
2. **"Check" group:** H3, H4, H6, H9, H13–H15, H18, H25, H29. Each needs a quick look first.
3. **Architect decisions:** H8, H10, H11, H17, H30–H33.
4. **Already planned elsewhere:** H24 and H34 (STP-0003), H19 (System 3).

Each item is small, so peers can split them by Owner. The full list could reasonably be done in one day.


## 2026-10-31 | Lumin | Authorized branch and navigation housekeeping

Architect authorized housekeeping in this chat. Audit baseline: `origin/main` at `907e225`. This update supersedes the ledger's initial "nothing moved or deleted" status for the actions below; earlier entries remain historical. Prior archive work is also recorded in [archive/README.md](../archive/README.md). Old H-item counts and paths must be rechecked rather than treated as current instructions.

Deleted remote heads were checked for ancestry in main, absence of open PR head/base dependencies, and absence of an attached worktree. Deletions used exact-head leases to reject concurrent branch updates. No local branches or peer worktrees were removed. PR conversations and historical continuity records remain.

| Branch | Audited head | Outcome |
|---|---|---|
| `claude/dataquad-meta-hackathon-9793f8` | `b3d999150d2027d8dec80530d19724c44a7ae55f` | Kept: attached worktree |
| `claude/docs-plan-rev16` | `09b565d2174260aa6f20bb60f1f5a3403d3b0cb8` | Kept: open PR 31 |
| `claude/project-thread-7v37qe` | `8b727a178241d3f188faa2648062df83634076fa` | Kept: open PR 21 |
| `claude/project-thread-9fdggm` | `da0b847b11d2d8bceaf81c3acb1529ddeb8bfe56` | Kept: open PR 28 |
| `claude/project-thread-h0z478` | `f9aa90462fd0b2d17cd0b95b844326bbf1faca31` | Deleted: exact head preserved in main |
| `claude/project-thread-p03e4i` | `cf325e2a46fdce5a858a95d8fa393e91855df955` | Deleted: exact head preserved in main |
| `claude/project-thread-zapc7o` | `72e35790e37ebbdb570e1f6d0e43b0d575fb9685` | Deleted: exact head preserved in main |
| `codex/governance-durable-admission` | `e1611fbbd00b440aec1777a1954db3ff73b40178` | Kept: attached worktree |
| `codex/m3-test-and-lane-followups` | `00808f9c3d6200a0675569aac0be153290c6eeaa` | Deleted: exact head preserved in main |
| `codex/m4-child-element-removal` | `1254c134d348a1ac4c50de9e539df764f035172a` | Kept: open PR 29 |
| `codex/m4-continuous-zoom` | `e34ef99580d0d4a75a96cf756a01aff86f63ad37` | Kept: head not an ancestor of main; unique history needs review |
| `codex/m4-core-motion-transitions` | `d5e0e73b626b954cf95c23367cf0ee9dfb4cc5d2` | Kept: head not an ancestor of main; unique history needs review |
| `codex/m4-element-inspection-framing` | `3e7249b5069ef8fd19b8851c2ed3ea2dd52b52f2` | Deleted: exact head preserved in main |
| `codex/m5-readiness-stp` | `2d5ec6a3ff7a8abfbfdfc4eceef6329f420887ff` | Deleted: exact head preserved in main |
| `codex/remove-demo-modes` | `31ad332cbf41dfced0bc9ac9bceac18a5a2eb7ff` | Deleted: exact head preserved in main |
| `codex/stp-0003-connection-event-history` | `68eeb74fe11ed07d462b1223486bb121fdec92c7` | Deleted: exact head preserved in main |
| `codex/stp-0003-customs-tumbler-review` | `1e1e7e8617e226dc59190484c9c1f12ae283ee6f` | Kept: head not an ancestor of main; unique history needs review |
| `codex/stp-0003-p1-element-schema` | `b0e5e2478e918cdf8ab9c3f25f90171025add2c2` | Kept: attached worktree |
| `codex/stp-0003-review-followups` | `486bdfacf7a0ff7ef827653c3b54c93790d07cc7` | Kept: head not an ancestor of main; unique history needs review |
| `codex/stp-0003-umbilical-completion` | `4a82b68edf831adcd5d6ffa0f726b5ed7968a6f7` | Deleted: exact head preserved in main |
| `codex/stp-0003-umbilical-contracts` | `33c1202951f681a614dee454a13edba302cc1cea` | Deleted: exact head preserved in main |
| `codex/stp-0004-blueprint-closeout` | `6e28d28aa903f2de48b07ec0b4077dfc1aa8b52f` | Kept: head not an ancestor of main; unique history needs review |
| `codex/unblock-verus-m3-notes` | `16d623deba5dda78371cfa07baa352faf2ca7624` | Kept: head not an ancestor of main; unique history needs review |
| `codex/vibe-atlas-reference-library` | `b3e072c93bcdeebbe54ec886aaa95b65d6d256b3` | Kept: open PR 30 |

Navigation: added docs/README.md and root entry links. Updated README to reflect retired simulation/deployment screens and storage-only admission integration limits. No product behavior, source assets, historical lanes, STPs, or hashed records were deleted. Existing divergent branches are retained intentionally; their presence is not evidence that they are active or approved.
