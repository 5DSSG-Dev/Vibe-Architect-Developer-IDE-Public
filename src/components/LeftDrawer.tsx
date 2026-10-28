import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRetractWhenDone } from './useRetractWhenDone';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Layers, Move, ShieldCheck, Cpu, HardDrive, Zap, Lock } from 'lucide-react';
import {
  ApothecaryItem,
  CategoryType,
  TrustBadgeType,
  getItem3DTaxonomy,
  isSatelliteItem,
  isOrbItem,
  SATELLITE_DRAG_TYPE,
  ORB_DRAG_TYPE
} from '../engine/relationEngine';
import { preloadAllGltfModels } from '../utils/gltfLoaderService';
import { groupCatalogByCategory } from '../utils/apothecaryGroups';
import { renderThumbnail, thumbnailModelKey, isThumbnailReady } from '../utils/thumbnailStudio';

interface LeftDrawerProps {
  catalog: ApothecaryItem[];
  onSelectAttachItem?: (item: ApothecaryItem) => void;
  onRightClickItem?: (item: ApothecaryItem) => void;
  onOpenOrbBuilder?: () => void;
  isFooterExpanded?: boolean;
}

type WireMesh = { verts: number[][]; edges: number[][] };

/**
 * Single shared requestAnimationFrame scheduler for every thumbnail card.
 *
 * Previously each card ran its own permanent rAF loop, so an open cabinet drove
 * N independent loops every frame regardless of whether the card was hovered,
 * selected, or even on screen. Cards now register a tick callback here ONLY while
 * they are actively animating (hovered/selected AND visible); the loop runs at
 * all only while at least one card is active and stops itself when the set empties.
 */
const thumbnailScheduler = (() => {
  const ticks = new Set<() => void>();
  let rafId = 0;

  const frame = () => {
    ticks.forEach((fn) => fn());
    rafId = ticks.size > 0 ? requestAnimationFrame(frame) : 0;
  };

  return {
    add(fn: () => void) {
      ticks.add(fn);
      if (rafId === 0) rafId = requestAnimationFrame(frame);
    },
    remove(fn: () => void) {
      ticks.delete(fn);
      if (ticks.size === 0 && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }
  };
})();

// Wireframe primitive geometry for the fallback thumbnail (drawn until the real
// GLB model is cached). Pure function of the taxonomy geometry type.
const getWireMesh = (geometryType: string): WireMesh => {
      switch (geometryType) {
        case 'octahedron':
          return {
            verts: [
              [0, 1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, -1, 0]
            ],
            edges: [
              [0,1],[0,2],[0,3],[0,4],
              [5,1],[5,2],[5,3],[5,4],
              [1,2],[2,3],[3,4],[4,1]
            ]
          };
        case 'cube':
          return {
            verts: [
              [-0.7,-0.7,-0.7],[0.7,-0.7,-0.7],[0.7,0.7,-0.7],[-0.7,0.7,-0.7],
              [-0.7,-0.7,0.7],[0.7,-0.7,0.7],[0.7,0.7,0.7],[-0.7,0.7,0.7]
            ],
            edges: [
              [0,1],[1,2],[2,3],[3,0],
              [4,5],[5,6],[6,7],[7,4],
              [0,4],[1,5],[2,6],[3,7]
            ]
          };
        case 'cylinder': {
          const v: [number,number,number][] = [];
          const e: [number,number][] = [];
          const segs = 10;
          for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            v.push([Math.cos(a)*0.6, -0.7, Math.sin(a)*0.6]);
            v.push([Math.cos(a)*0.6, 0.7, Math.sin(a)*0.6]);
            const topIdx = i * 2;
            const botIdx = i * 2 + 1;
            const nextTop = ((i + 1) % segs) * 2;
            const nextBot = ((i + 1) % segs) * 2 + 1;
            e.push([topIdx, nextTop], [botIdx, nextBot], [topIdx, botIdx]);
          }
          return { verts: v, edges: e };
        }
        case 'dodecahedron': {
          const phi = (1 + Math.sqrt(5)) / 2;
          const a = 0.5, b = 0.5 / phi, c = 0.5 * phi;
          const v: [number,number,number][] = [
            [-a,-a,-a],[-a,-a,a],[-a,a,-a],[-a,a,a],[a,-a,-a],[a,-a,a],[a,a,-a],[a,a,a],
            [0,-b,-c],[0,-b,c],[0,b,-c],[0,b,c],[-b,-c,0],[-b,c,0],[b,-c,0],[b,c,0],
            [-c,0,-b],[-c,0,b],[c,0,-b],[c,0,b]
          ];
          const e: [number,number][] = [];
          for (let i = 0; i < v.length; i++) {
            for (let j = i + 1; j < v.length; j++) {
              const dx = v[i][0] - v[j][0];
              const dy = v[i][1] - v[j][1];
              const dz = v[i][2] - v[j][2];
              const distSq = dx*dx + dy*dy + dz*dz;
              if (distSq > 0.4 && distSq < 0.65) {
                e.push([i, j]);
              }
            }
          }
          return { verts: v, edges: e };
        }
        case 'tetrahedron':
          return {
            verts: [
              [0, 1, 0], [0.94, -0.33, 0], [-0.47, -0.33, 0.81], [-0.47, -0.33, -0.81]
            ],
            edges: [
              [0,1],[0,2],[0,3],[1,2],[2,3],[3,1]
            ]
          };
        case 'sphere':
        default: {
          const v: [number,number,number][] = [];
          const e: [number,number][] = [];
          const rings = 4;
          const pts = 8;
          for (let r = 0; r < rings; r++) {
            const lat = ((r + 1) / (rings + 1) - 0.5) * Math.PI;
            const rad = Math.cos(lat) * 0.8;
            const y = Math.sin(lat) * 0.8;
            for (let p = 0; p < pts; p++) {
              const lon = (p / pts) * Math.PI * 2;
              v.push([Math.cos(lon)*rad, y, Math.sin(lon)*rad]);
            }
          }
          v.push([0, -0.8, 0], [0, 0.8, 0]);
          for (let r = 0; r < rings; r++) {
            for (let p = 0; p < pts; p++) {
              const idx = r * pts + p;
              const nextP = r * pts + ((p + 1) % pts);
              e.push([idx, nextP]);
              if (r < rings - 1) {
                e.push([idx, (r + 1) * pts + p]);
              }
            }
          }
          return { verts: v, edges: e };
        }
      }
      return { verts: [], edges: [] };
};

/**
 * Catalogue card thumbnail.
 *
 * Static by default: draws a single frame (wireframe primitive, upgraded to the
 * real GLB once it is cached). It animates ONLY while `active` (hovered/selected)
 * AND on screen, driven by the shared scheduler rather than a permanent per-card
 * rAF loop, and leaves a final static frame behind when animation stops.
 */
const Item3DThumbnail: React.FC<{ item: ApothecaryItem; active: boolean }> = ({ item, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef({ x: 0.2, y: 0.3 });
  const tickRef = useRef<(() => void) | null>(null);
  const drawStaticRef = useRef<() => void>(() => {});
  const [isVisible, setIsVisible] = useState(false);

  // A stable wrapper so the scheduler always adds/removes the SAME function
  // reference even as tickRef is reassigned when the item changes.
  const tickWrapper = useCallback(() => {
    tickRef.current?.();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const taxonomy = getItem3DTaxonomy(item);
    const colorHex = taxonomy.colorHex;
    const mesh = getWireMesh(taxonomy.geometryType);
    const modelKey = thumbnailModelKey(item);
    void preloadAllGltfModels(); // shared promise; no-op if already in flight

    // Draws exactly one frame at the current rotation. Returns true when the real
    // GLB was drawn, false when it fell back to the wireframe primitive.
    const drawFrame = (): boolean => {
      const rotX = rotRef.current.x;
      const rotY = rotRef.current.y;

      ctx.clearRect(0, 0, 96, 96);

      // Preferred path: the real GLB, drawn by the shared offscreen renderer.
      // Falls through to the wireframe primitive until the model is cached.
      const glb = renderThumbnail(modelKey, rotY, Math.sin(rotX) * 0.28);
      if (glb) {
        const grad = ctx.createRadialGradient(48, 48, 2, 48, 48, 40);
        grad.addColorStop(0, colorHex + '30');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 96, 96);
        ctx.drawImage(glb, 0, 0, 96, 96);
        return true;
      }

      const cx = 48;
      const cy = 48;
      const scale = 30;

      const proj: [number, number, number][] = mesh.verts.map(([x, y, z]) => {
        const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

        const px = cx + x1 * scale;
        const py = cy + y2 * scale;
        return [px, py, z2];
      });

      // Background neon glow radial gradient
      const grad = ctx.createRadialGradient(48, 48, 2, 48, 48, 38);
      grad.addColorStop(0, colorHex + '35');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 96, 96);

      // Draw 3D Edges
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = colorHex;
      ctx.shadowBlur = 6;

      mesh.edges.forEach(([i, j]) => {
        const p1 = proj[i];
        const p2 = proj[j];
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      });

      // Draw 3D Vertices
      ctx.fillStyle = '#ffffff';
      proj.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      return false;
    };

    // One advancing frame — driven only by the shared scheduler while active.
    const tick = () => {
      rotRef.current.x += 0.015;
      rotRef.current.y += 0.022;
      drawFrame();
    };
    tickRef.current = tick;
    drawStaticRef.current = () => { drawFrame(); };

    // Static-by-default: draw one frame now. If the GLB is not cached yet, poll
    // lightly (no rAF) until it arrives, then draw once more and stop.
    let pollId: number | undefined;
    const drawUntilReady = () => {
      const drewGlb = drawFrame();
      if (!drewGlb && !isThumbnailReady(modelKey)) {
        pollId = window.setTimeout(drawUntilReady, 200);
      }
    };
    drawUntilReady();

    return () => {
      if (pollId !== undefined) clearTimeout(pollId);
      thumbnailScheduler.remove(tickWrapper);
      tickRef.current = null;
    };
  }, [item, tickWrapper]);

  // Track on-screen visibility: never animate a card scrolled out of view.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Gate animation on (hovered || selected) AND visible. When gating off, drop
  // out of the shared scheduler and leave one final static frame on the canvas.
  useEffect(() => {
    if (active && isVisible) {
      thumbnailScheduler.add(tickWrapper);
      return () => thumbnailScheduler.remove(tickWrapper);
    }
    thumbnailScheduler.remove(tickWrapper);
    drawStaticRef.current();
  }, [active, isVisible, tickWrapper]);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={96}
      className="w-24 h-24 flex-shrink-0 cursor-grab active:cursor-grabbing rounded-xl bg-slate-950/60 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(0,243,255,0.08)]"
    />
  );
};

const getTrustBadgeClass = (trust: TrustBadgeType) => {
  switch (trust) {
    case 'Canonical': return 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50';
    case 'Validated': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50';
    case 'Formulated': return 'bg-purple-500/20 text-purple-300 border border-purple-400/50';
    case 'Experimental': return 'bg-amber-500/20 text-amber-300 border border-amber-400/50';
  }
};

const handleDragStart = (e: React.DragEvent, item: ApothecaryItem) => {
  const taxonomy = getItem3DTaxonomy(item);
  const payload = {
    orb_id: item.id,
    item_id: item.id,
    type: item.category,
    geometry_type: taxonomy.geometryType,
    satelliteClass: taxonomy.satelliteClass,
    item: item
  };
  e.dataTransfer.setData('application/json', JSON.stringify(payload));
  if (isSatelliteItem(item)) {
    e.dataTransfer.setData(SATELLITE_DRAG_TYPE, item.id);
  }
  // Only Orbs advertise the handshake type, so the canvas offers a socket target
  // for Orbs alone. Every other element is inert against the Umbilical.
  if (isOrbItem(item)) {
    e.dataTransfer.setData(ORB_DRAG_TYPE, item.id);
  }
  e.dataTransfer.effectAllowed = 'copy';

  // Suppress the default HTML card drag ghost — the 3D ghost mesh in the
  // scene is sufficient visual feedback.
  const blank = document.createElement('canvas');
  blank.width = 1;
  blank.height = 1;
  e.dataTransfer.setDragImage(blank, 0, 0);
};

interface CatalogCardProps {
  item: ApothecaryItem;
  isSelected: boolean;
  onSelect: (item: ApothecaryItem) => void;
  onRightClick?: (item: ApothecaryItem) => void;
}

/**
 * One catalogue row. Owns its own hover state so the thumbnail can animate on
 * hover; combined with `isSelected` this is what gates the (otherwise static)
 * thumbnail into its shared-scheduler animation.
 */
const CatalogCard: React.FC<CatalogCardProps> = ({ item, isSelected, onSelect, onRightClick }) => {
  const [hovered, setHovered] = useState(false);
  const isConstellation = item.category === 'Constellations';

  return (
    <div
      draggable={true}
      onDragStart={(e) => handleDragStart(e, item)}
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onRightClick) onRightClick(item);
      }}
      className="group relative panel-glass-subtle p-2.5 rounded-xl border border-cyan-500/20 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(0,243,255,0.15)] transition-all duration-200 cursor-grab active:cursor-grabbing flex items-center space-x-3 select-none"
    >
      {/* Rotating 3D Geometric Primitive Canvas Thumbnail */}
      <Item3DThumbnail item={item} active={hovered || isSelected} />

      {/* Card Metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between space-x-1">
          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wide truncate">
            {item.satelliteClass ? `Satellite [${item.satelliteClass}]` : item.category}
          </span>
          <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-mono font-semibold ${getTrustBadgeClass(item.trust)}`}>
            {item.trust}
          </span>
        </div>

        <h3 className="text-xs font-bold text-slate-100 font-orbitron group-hover:text-cyan-300 transition-colors truncate mt-0.5">
          {item.name}
        </h3>

        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 font-sans leading-tight">
          {item.description}
        </p>

        {/* Tier 4 Pentagonal Ring of 5 Connected Satellites Indicator */}
        {isConstellation && (
          <div className="mt-1.5 flex items-center space-x-1 text-[8px] font-mono text-purple-300 bg-purple-950/40 p-1 rounded border border-purple-500/30">
            <span className="font-bold uppercase">Satellites:</span>
            <span className="text-cyan-300">I/O</span>
            <span>•</span>
            <span className="text-amber-300">Compute</span>
            <span>•</span>
            <span className="text-emerald-300">Storage</span>
            <span>•</span>
            <span className="text-purple-300">Valid</span>
            <span>•</span>
            <span className="text-rose-300">Sec</span>
          </div>
        )}

        {/* Specs & Drag Cue */}
        <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span className="text-purple-300 font-medium">{item.memoryReq}MB RAM</span>
          <div className="flex items-center space-x-1 text-cyan-400/80 group-hover:text-cyan-300">
            <Move className="w-3 h-3 animate-pulse" />
            <span className="text-[8px]">DRAG TO 3D</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
  catalog,
  onSelectAttachItem,
  onRightClickItem,
  onOpenOrbBuilder,
  isFooterExpanded = true
}) => {
  // Tucked away by default; opens when picked and tucks back when done (useRetractWhenDone).
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const retract = useCallback(() => setIsOpen(false), []);
  useRetractWhenDone(drawerRef, isOpen, retract);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [selectedTrustFilter, setSelectedTrustFilter] = useState<TrustBadgeType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Category sections, a first step of semantic zoom: an overview of what kinds
  // of Elements exist, opened one kind at a time. Orbs start open because
  // docking an Orb is the first step of the journey.
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryType>>(() => new Set(['Orbs']));
  const toggleCategory = (category: CategoryType) =>
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const filteredCatalog = catalog.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesTrust = selectedTrustFilter === 'ALL' || item.trust === selectedTrustFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesTrust && matchesSearch;
  });
  const catalogGroups = groupCatalogByCategory(filteredCatalog);
  // A search or filter is a request to see the matches, so it opens every section.
  const isNarrowed = searchQuery.trim() !== '' || selectedCategory !== 'ALL' || selectedTrustFilter !== 'ALL';

  return (
    <div
      ref={drawerRef}
      className={`fixed left-4 top-20 z-10 transition-all duration-300 flex ${
        isOpen ? `${isFooterExpanded ? 'bottom-[228px]' : 'bottom-14'} w-80 sm:w-96` : 'h-12 w-12'
      }`}
    >
      <div className="w-full h-full panel-glass rounded-2xl flex flex-col overflow-hidden border border-cyan-500/20 shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/40">
          <div className={`flex items-center space-x-2 ${!isOpen && 'hidden'}`}>
            <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="font-orbitron text-xs font-bold tracking-wider text-slate-100 uppercase">
              The Apothecary Cabinet
            </h2>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors ml-auto"
            title={isOpen ? 'Collapse Apothecary Cabinet' : 'Expand Apothecary Cabinet'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {isOpen && (
          <>
            {/* Search Bar */}
            <div className="p-3 pb-2 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Orbs, Satellites & Constellations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 font-mono"
                />
              </div>

              {/* Create Custom Orb Trigger */}
              <button
                onClick={() => onOpenOrbBuilder && onOpenOrbBuilder()}
                className="mt-2 w-full btn-cyber py-1.5 rounded-xl text-xs font-orbitron font-bold flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Create Custom Orb</span>
              </button>

              {/* 4-Tier Compositional Hierarchy Selector */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {(
                  [
                    { id: 'Ingredients', label: 'T1: Ingredients' },
                    { id: 'Formulas', label: 'T2: Formulas' },
                    { id: 'Satellites', label: 'T3: Satellites' },
                    { id: 'Constellations', label: 'T4: Constellation' },
                    { id: 'Portals', label: 'Portals' },
                    { id: 'Orbs', label: 'Orbs' },
                    { id: 'Cores', label: 'Cores' },
                    { id: 'Umbilicals', label: 'Umbilicals' }
                  ] as const
                ).map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedCategory(selectedCategory === tier.id ? 'ALL' : (tier.id as any))}
                    aria-pressed={selectedCategory === tier.id}
                    className={`py-1 px-1.5 rounded-md text-[9px] font-mono font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === tier.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactile 3D Object Palette Grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  No matching 3D modules found in the Apothecary Cabinet.
                </div>
              ) : (
                catalogGroups.map(({ category, items }) => {
                  const isExpanded = isNarrowed || expandedCategories.has(category);
                  const sectionId = `apothecary-section-${category.toLowerCase()}`;
                  return (
                    <section key={category} className="space-y-2">
                      <button
                        onClick={() => toggleCategory(category)}
                        disabled={isNarrowed}
                        aria-expanded={isExpanded}
                        aria-controls={sectionId}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-orbitron font-bold tracking-wider text-slate-200 uppercase disabled:cursor-default"
                      >
                        <span>{category}</span>
                        <span className="flex items-center gap-1.5 font-mono font-normal text-slate-400">
                          {items.length}
                          <ChevronDown
                            aria-hidden="true"
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                          />
                        </span>
                      </button>
                      {isExpanded && (
                        <div id={sectionId} className="space-y-3">
                          {items.map((item) => (
                            <CatalogCard
                              key={item.id}
                              item={item}
                              isSelected={selectedId === item.id}
                              onSelect={(picked) => {
                                setSelectedId(picked.id);
                                if (onSelectAttachItem) onSelectAttachItem(picked);
                              }}
                              onRightClick={onRightClickItem}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>

            {/* Bottom Trust State Filter Bar */}
            <div className="p-2 border-t border-cyan-500/20 bg-slate-950/60 flex items-start justify-between gap-2">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                Trust State:
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {(['ALL', 'Experimental', 'Formulated', 'Validated', 'Canonical'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTrustFilter(t)}
                    aria-pressed={selectedTrustFilter === t}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold transition-colors ${
                      selectedTrustFilter === t
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const ApothecaryDrawer = LeftDrawer;
