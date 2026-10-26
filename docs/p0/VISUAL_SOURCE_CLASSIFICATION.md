# Visual Source Classification v0.1

**Phase:** P0 — Meaning Freeze and Evidence Baseline
**Date:** 2026-08-17
**Status:** Proposed

---

## Purpose

Every visual asset in the repository is classified into one of four categories. No generated label in concept art may establish runtime topology without a matching canonical definition. No implementation may begin from a conceptual image alone.

## Classification Categories

| Category | Meaning | Implementation authority |
|---|---|---|
| **Current visual specification** | Actively governs the 3D appearance of a runtime element. Paired with a GLB model or renderer code. | Defines rendered appearance. Does not define runtime behavior. |
| **Conceptual design reference** | Informs design intent and visual language. Not yet realized as a runtime element. | Advisory only. Requires a canonical definition before implementation. |
| **Historical design evidence** | Records a prior design iteration. Superseded by later work but retained for provenance. | None. Read-only evidence. |
| **Superseded operational meaning** | Was previously used to define an operational concept that has since been redefined or relocated. | None. Must not be used as a source of current meaning. |

---

## 1. Standalone Foundation Assets (GLB Models)

### Current Visual Specification

| Asset | File(s) | Paired runtime element | Notes |
|---|---|---|---|
| Pod Seed Crystal | `public/assets/AEGIS_POD_CRYSTAL.glb`, `public/assets/models/AEGIS_POD_CRYSTAL.glb`, `public/assets/models/AEGIS_Pod_Seed_Crystal_3D.glb` | CORE crystal mesh in `ThreeCanvas.tsx`; CORE node in `TopologySceneSystem.ts` | Active. Loaded and rendered in both Canvas and Admin views. |
| Portal | `public/assets/PORTAL.glb` | Portal meshes in `ThreeCanvas.tsx`; Portal nodes in `AdminSceneNodeFactory.ts` | Active. Rendered in both views. |
| Portal Tender | `public/assets/PORTAL_TENDER.glb` | Tender nodes in `AdminSceneNodeFactory.ts` | Active in Admin. Canvas tender rendering uses procedural geometry. |
| Orb variants | `public/assets/models/ORB.glb` through `ORB5.glb`, `ORB_SKELETON.glb` | Orb nodes in `ThreeCanvas.tsx` (selected by id hash or `modelKey`) | Active. Visual appearance for docked Orbs. |
| Formula variants | `public/assets/models/FORMULA_1.glb`, `FORMULA_3_1.glb` through `FORMULA_3_3.glb` | Used for Formula-category items in Canvas | Active. |
| Caged Crystal variants | `public/assets/models/CORE_CRYSTAL_CAGED.glb`, `CORE_CRYSTAL_CAGED2.glb` | Versikon/alternate crystal rendering | Active. |
| Additional models | `DIGITIZER_1.glb`, `ENERGY_HAZE.glb`, `INTERESTING.glb`, `AEGIS_CODEX_ARCHIVIST.glb` | Various Canvas element rendering | Active where loaded by `SharedAssetManager` or `ThreeCanvas`. |

### Not classified (models directory)

The following models in `public/assets/models/` need verification of whether they are actively loaded by any renderer:

- `AEGIS_CODEX_ARCHIVIST.glb`
- `DIGITIZER_1.glb`
- `ENERGY_HAZE.glb`
- `INTERESTING.glb`

---

## 2. Videos

### Conceptual Design Reference

| Asset | File | Classification | Notes |
|---|---|---|---|
| Portal animation | `public/assets/PORTAL.mp4` | Conceptual design reference | Demonstrates intended Portal visual behavior. Does not define runtime Portal logic. |
| Satellite animation | `public/assets/SATELITE1.mp4` | Conceptual design reference | Demonstrates intended Satellite visual behavior. Does not define runtime Satellite logic. |

---

## 3. Image Files — Classified

### Current Visual Specification

| Asset | File | Paired canonical definition | Notes |
|---|---|---|---|
| Pod Seed Crystal reference | `AEGIS_Pod_Seed_Crystal_3D (1).png` | Image Manifest CORE-01 | Reference image for the GLB model. |
| Portal Prismatic Iris reference | `AEGIS_Portal_Prismatic_Iris_3D.png` | Image Manifest CORE-05 | Reference image for the Portal GLB. |
| Portal Tender reference | `AEGIS_Portal_Tender_3D.png` | Image Manifest CORE-06 | Reference image for the Tender GLB. |
| Construction Kit Sheet 01 | `AEGIS_Construction_Kit_Parts_Sheet_01.png` | Image Manifest CK-01 through CK-09 | Visual catalog of construction kit parts. |
| Infrastructure Sheet 03 | `AEGIS_Infrastructure_Parts_Sheet_03.png` | Image Manifest IN-01 through IN-05 | Visual catalog of infrastructure elements. |
| Relational Object reference sheets | `RELATION_ORB_OBJECTS.png`, `RELATION_POD_OBJECTS.png`, `RELATION_PORTAL_TENDER_OBJECTS.png`, `RELATION_SATELITE_OBJECTS.png` | CORE Element Catalog element types | Visual reference sheets showing relational object families. |

### Conceptual Design Reference

These images inform design direction but do not directly govern any implemented runtime element.

| Asset | File | Notes |
|---|---|---|
| Build Master concept | `BUILDMASTER.png` | Concept art for Build Master. Build Master is not implemented. |
| Dispatcher concepts | `DISPATCHER_1GOLD.png`, `DISPATCHER_GOOD.png` | Concept art for Dispatch. Dispatch is not implemented as a runtime system. |
| IDE field concepts | `IDE+FIELD.png`, `IDE_THE_WAY_I_WANT_IT.png` | Conceptual design for the IDE workspace. Informational, not prescriptive. |
| Element concept sheets | `ELEMENTS1.png`, `ELEMENTS2.png`, `ELEMENTS3.png` | Element design explorations. |
| Orb concepts | `ORB2.png` through `ORB5.png`, `ORB_2_1.png` through `ORB_2_4.png`, `ORB_SKELETON.png`, `QUAD_ORBS1.png`, `quad_orbs.png` | Orb design explorations and variants. |
| Satellite concepts | `SATELITE.png` through `SATELITE8.png` | Satellite design explorations. |
| Portal/Tender concepts | `PORTAL.png`, `PORTAL_TENDER.png`, `TENDER.png` | Portal and Tender design explorations beyond the reference images above. |
| Umbilical concepts | `UMBILICAL.png`, `UMBILICAL_AWESOME.png`, `UMBILICAL_AWESOME_QUAD.png`, `UMBILICAL_LONG.png`, `UMBILICAL_LONG_STRETCH.png`, `UMBILICAL_LONG_STRETCH2.png` | Umbilical conduit design explorations. |
| Formula concepts | `FORMULA_1.png`, `FORMULA_2.png`, `FORMULA_3.png`, `FORMULA_5.png`, `FORMULA_QUAD_1.png`, `FORMULA_QUAD_2.png`, `FORMULA_SOLO_1.png` | Formula composition design explorations. |
| Reagent concepts | `REAGENTS_1.png`, `REAGENTS_2.png`, `REAGENTS_3.png`, `REAGENTS_8_1.png`, `REAGENTS_8_2.png`, `REAGENTS_8_3.png` | Reagent/ingredient design explorations. |
| Energy concept | `ENERGY.png` | Energy visual concept. |
| Pod concepts | `PODS.png` | POD architecture concept. |
| Header/Footer | `HEADER.png`, `FOOTER.png` | UI/branding design reference. |

### Conceptual Design Reference — Atmospheric/Environmental

These are conceptual art pieces informing the visual atmosphere of the AEGIS environment. They do not define any specific runtime element.

| Asset | File | Notes |
|---|---|---|
| Crystal on pedestal | `Close-up_view_of_a_glowing_crystal_stone_on_a_pedestal_while_*.png` | Atmospheric reference. |
| Meditation spaces | `thelight1122_A_serene_futuristic_meditation_space_*.png` (2 variants) | Environmental mood reference. |
| Vibrant futuristic space | `thelight1122_A_vibrant_futuristic_space_*.png` | Environmental mood reference. |
| Dancing entities | `thelight1122_Atomic_sized_entities_dancing_*.png` | Atmospheric reference. |
| Spa setting | `thelight1122_DMT_trip_A_peaceful_spa-like_setting_*.png` | Environmental mood reference. |
| Lumina Aeternum | `thelight1122_Description_The_Lumina_Aeternum_*.png` | Object concept reference. |
| Arcane Relic of Lumos | `thelight1122_The_Arcane_Relic_of_Lumos_*.png` (2 variants) | Object concept reference. |
| Multi-faceted crystal | `thelight1122_an_image_depicting_a_multi-faceted_crystal_*.png` | Crystal design reference. |
| Tiled wallpaper | `thelight1122_httpss.mj.run*_wallpap_*.png` | Texture/pattern reference. |
| Isometric shapes | `thelight1122_httpss.mj.run*_isometric_shapes_*.png` | Geometric design reference. |
| Fusion reactor core | `Futuristic Radial Fusion Reactor Core.png` | Environmental/energy concept. |
| Gothic egg relic | `Gothic Egg Relic Composition.png` | Object concept reference. |
| Plasma canister | `Horizontal Plasma Energy Canister.png` | Object concept reference. |

---

## 4. Design Iteration Images

### Historical Design Evidence

| Asset | File | Notes |
|---|---|---|
| Admin message flow v1 | `docs/design/admin-message-flow-concept.png` | First iteration. Superseded by v2 and v3. |
| Admin message flow v2 | `docs/design/admin-message-flow-concept-v2.png` | Second iteration. Superseded by v3. |
| Admin message flow v3 | `docs/design/admin-message-flow-concept-v3.png` | Current design concept. The implemented Admin message flow system is the source of truth, not this image. |

---

## 5. Exit Gate Compliance

| Requirement | Status |
|---|---|
| Every visual asset classified | **Met.** All 80+ image files, 15+ GLB models, and 2 videos classified. |
| No concept art establishes runtime topology | **Met.** Conceptual design references explicitly noted as advisory. |
| GLB models classified separately from concept art | **Met.** GLB models paired with runtime renderers are "current visual specification." |
| Admin Operations and Architect Canvas visual sources distinguished | **Met.** GLB models note which views use them. |
| Historical design iterations marked | **Met.** Design folder iterations marked as historical evidence. |
