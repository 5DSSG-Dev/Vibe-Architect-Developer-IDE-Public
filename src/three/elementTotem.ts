import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  ApothecaryItem,
  PortalPlacement,
  getItem3DTaxonomy,
  isSatelliteItem,
} from '../engine/relationEngine';

/**
 * Element Totem (CSS2D billboard) — a passive communication and illumination
 * record floating above an Element, in the sense defined by totemContinuity.ts
 * ("A Totem is a passive communication and illumination record"). Collapsed it
 * is a small plaque naming the Element; on hover it expands to illuminate the
 * Element's function (its description) alongside its trust, version, and
 * declared capabilities.
 *
 * It is display-only: it renders what the manifest already declares and issues,
 * authorizes, or mutates nothing. The server-side totemContinuity record (which
 * carries integrity hashes and provenance) remains the durable evidence form;
 * this is only its on-screen illumination.
 *
 * Shared by the CORE scene (ThreeCanvas) and the drill-down Environment views so
 * every tier — CORE, Orb, Satellite, Actuator, Portal — carries the same label.
 */
export interface TotemDescriptor {
  kind: string;
  name: string;
  color: number;
  meta: string;
  description: string;
  capabilities: string[];
}

export function buildTotem(descriptor: TotemDescriptor, options: { showMarker?: boolean } = {}): CSS2DObject {
  const showMarker = options.showMarker ?? true;
  const accent = `#${descriptor.color.toString(16).padStart(6, '0')}`;
  const kind = descriptor.kind;

  // A thin black pinstripe around white glyphs. The bloom pass bleeds bright
  // text, so the stroke (painted behind the fill) holds the letter edges crisp
  // while the glow around the plaque is kept intact.
  const textOutline = [
    '-webkit-text-stroke:0.75px rgba(0,0,0,0.92)',
    'paint-order:stroke fill',
    'text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px rgba(0,0,0,0.85)',
  ].join(';');

  const root = document.createElement('div');
  root.className = 'element-totem';
  root.style.cssText = [
    `pointer-events:${showMarker ? 'auto' : 'none'}`,
    'cursor:default',
    'position:relative',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    "font-family:'JetBrains Mono',ui-monospace,monospace",
    'user-select:none',
    'width:max-content',
  ].join(';');

  // Collapsed marker — by default just a glowing icon so the scene stays
  // uncluttered. Hover expands it into the naming plaque (and the popup below).
  const plaque = document.createElement('div');
  plaque.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:6px',
    'padding:5px',
    'border-radius:9999px',
    `border:1px solid ${accent}80`,
    'background:rgba(8,11,16,0.82)',
    'backdrop-filter:blur(4px)',
    `box-shadow:0 0 12px ${accent}40`,
    'white-space:nowrap',
    'transition:border-color 0.15s,box-shadow 0.15s,padding 0.15s',
  ].join(';');

  const dot = document.createElement('span');
  dot.style.cssText = `width:11px;height:11px;border-radius:9999px;background:${accent};box-shadow:0 0 8px ${accent},0 0 2px #fff inset;flex:none`;

  const nameEl = document.createElement('span');
  nameEl.textContent = descriptor.name;
  // Hidden until hover — this is the label that used to always show.
  nameEl.style.cssText = `display:none;font-size:15px;font-weight:700;letter-spacing:0.02em;color:#ffffff;${textOutline}`;

  plaque.append(dot, nameEl);

  // Expanded popup — hover reveals the Element's function, framed as the Totem.
  const popup = document.createElement('div');
  popup.style.cssText = [
    'position:absolute',
    'top:calc(100% + 6px)',
    'left:50%',
    'transform:translateX(-50%)',
    'width:264px',
    'padding:12px 14px',
    'border-radius:10px',
    `border:1px solid ${accent}66`,
    'background:rgba(5,10,18,0.94)',
    'backdrop-filter:blur(8px)',
    `box-shadow:0 8px 28px rgba(0,0,0,0.55),0 0 18px ${accent}33`,
    'display:none',
    'z-index:40',
    'text-align:left',
  ].join(';');

  const header = document.createElement('div');
  header.textContent = `TOTEM · ${kind.toUpperCase()}`;
  header.style.cssText = `font-size:10px;letter-spacing:0.28em;color:${accent};margin-bottom:5px`;

  const target = document.createElement('div');
  target.textContent = descriptor.name;
  target.style.cssText = `font-size:16px;font-weight:700;color:#ffffff;margin-bottom:3px;${textOutline}`;

  const meta = document.createElement('div');
  meta.textContent = descriptor.meta;
  meta.style.cssText = 'font-size:10px;color:#94a3b8;margin-bottom:9px;letter-spacing:0.04em';

  const fnLabel = document.createElement('div');
  fnLabel.textContent = 'FUNCTION';
  fnLabel.style.cssText = 'font-size:9px;letter-spacing:0.24em;color:#64748b;margin-bottom:3px';

  const summary = document.createElement('div');
  summary.textContent = descriptor.description || 'No function description recorded for this Element.';
  summary.style.cssText = `font-size:13px;line-height:1.55;color:#ffffff;${textOutline}`;

  popup.append(header, target, meta, fnLabel, summary);

  if (descriptor.capabilities.length > 0) {
    const capLabel = document.createElement('div');
    capLabel.textContent = 'CAPABILITIES';
    capLabel.style.cssText = 'font-size:9px;letter-spacing:0.24em;color:#64748b;margin:10px 0 5px';
    const capWrap = document.createElement('div');
    capWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px';
    for (const cap of descriptor.capabilities.slice(0, 8)) {
      const chip = document.createElement('span');
      chip.textContent = cap;
      chip.style.cssText = `font-size:10px;padding:2px 7px;border-radius:9999px;border:1px solid ${accent}40;color:#cbd5e1;background:${accent}14`;
      capWrap.append(chip);
    }
    popup.append(capLabel, capWrap);
  }

  if (showMarker) root.append(plaque);
  root.append(popup);

  const reveal = () => {
    nameEl.style.display = 'inline';
    plaque.style.padding = '4px 12px';
    popup.style.display = 'block';
    plaque.style.borderColor = accent;
    plaque.style.boxShadow = `0 0 18px ${accent}80`;
  };
  const hide = () => {
    nameEl.style.display = 'none';
    plaque.style.padding = '5px';
    popup.style.display = 'none';
    plaque.style.borderColor = `${accent}80`;
    plaque.style.boxShadow = `0 0 12px ${accent}40`;
  };
  root.addEventListener('pointerenter', reveal);
  root.addEventListener('pointerleave', hide);

  const totem = new CSS2DObject(root);
  totem.userData.isElementTotem = true;
  totem.userData.popupRoot = root;
  totem.userData.showElementPopup = reveal;
  totem.userData.hideElementPopup = hide;
  // CSS2D billboards sort by DOM order, not depth; keep them above the canvas
  // chrome but let true HUD overlays (preloader, CORE selector) win.
  totem.center.set(0.5, 0);
  return totem;
}

/** Element Totem for a docked Orb, tethered Satellite, or Actuator. */
export function createElementTotem(item: ApothecaryItem, options: { showMarker?: boolean } = {}): CSS2DObject {
  const kind = item.category === 'Actuators'
    ? 'actuator'
    : isSatelliteItem(item)
      ? 'satellite'
      : item.category === 'Orbs' || item.category === 'Formulas' || item.category === 'Cores'
        ? 'orb'
        : item.category.toLowerCase();
  const totem = buildTotem({
    kind,
    name: item.name,
    color: getItem3DTaxonomy(item).color,
    meta: `${item.category} · ${item.trust} · v${item.version}`,
    description: item.description,
    capabilities: item.capabilities,
  }, options);
  totem.userData.elementItemId = item.id;
  return totem;
}

/**
 * Element Totem for a CORE boundary Portal. A Portal is a placement rather than
 * an Apothecary Element, so its function is described from the boundary-gateway
 * grammar the assembly implements.
 */
export function createPortalTotem(placement: PortalPlacement): CSS2DObject {
  return buildTotem({
    kind: 'portal',
    name: placement.name,
    color: 0xa855f7,
    meta: 'Boundary Gateway · CORE-05 / CORE-06',
    description: 'Prismatic Iris gateway through the CORE boundary. Its Portal Tender conduit carries the active Relation from this gateway out to an exterior service endpoint.',
    capabilities: ['boundary_gateway', 'external_relation'],
  });
}

/**
 * Element Totem for the central CORE Crystal. The CORE is the relational
 * substrate every umbilical arm and boundary Portal binds into, so its function
 * is described from the doctrine rather than an Apothecary manifest.
 */
export function createCoreTotem(): CSS2DObject {
  return buildTotem({
    kind: 'core',
    name: 'Aegis CORE Crystal',
    color: 0x00f3ff,
    meta: 'Relational Substrate · UNSERIALIZED_PRISTINE',
    description: 'The central relational substrate. Every umbilical Relation and boundary Portal binds into it. It holds the formless CORE state, guards its invariants, and never serializes the witness or persists prompts.',
    capabilities: ['invariant_guard', 'never_persists_prompts', 'sandbox_runtime'],
  });
}
