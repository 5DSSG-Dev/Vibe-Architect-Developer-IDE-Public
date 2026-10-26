import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Layers, Move, ShieldCheck, Cpu, HardDrive, Zap, Lock } from 'lucide-react';
import { ApothecaryItem, CategoryType, TrustBadgeType, getItem3DTaxonomy } from '../engine/relationEngine';

interface LeftDrawerProps {
  catalog: ApothecaryItem[];
  onSelectAttachItem?: (item: ApothecaryItem) => void;
  onRightClickItem?: (item: ApothecaryItem) => void;
  onOpenOrbBuilder?: () => void;
}

// Lightweight 2D HTML5 Canvas 3D Primitive Renderer for Apothecary Palette Cards
const Item3DThumbnail: React.FC<{ item: ApothecaryItem }> = ({ item }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const taxonomy = getItem3DTaxonomy(item);
    const colorHex = taxonomy.colorHex;

    let rotX = 0.2;
    let rotY = 0.3;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const size = 18;

      rotX += 0.02;
      rotY += 0.025;

      ctx.save();
      ctx.translate(cx, cy);

      // Render wireframe shape based on geometry type
      ctx.strokeStyle = colorHex;
      ctx.fillStyle = colorHex + '33';
      ctx.lineWidth = 1.5;

      ctx.beginPath();

      if (taxonomy.geometryType === 'octahedron') {
        const top = { x: 0, y: -size * 1.2 };
        const bottom = { x: 0, y: size * 1.2 };
        const pts = [
          { x: Math.cos(rotY) * size, y: Math.sin(rotX) * (size / 2) },
          { x: Math.cos(rotY + Math.PI / 2) * size, y: Math.sin(rotX + Math.PI / 2) * (size / 2) },
          { x: Math.cos(rotY + Math.PI) * size, y: Math.sin(rotX + Math.PI) * (size / 2) },
          { x: Math.cos(rotY + Math.PI * 1.5) * size, y: Math.sin(rotX + Math.PI * 1.5) * (size / 2) }
        ];

        pts.forEach(p => {
          ctx.moveTo(top.x, top.y); ctx.lineTo(p.x, p.y);
          ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(p.x, p.y);
        });

        for (let i = 0; i < 4; i++) {
          ctx.lineTo(pts[(i + 1) % 4].x, pts[(i + 1) % 4].y);
        }
      } else if (taxonomy.geometryType === 'cube') {
        const s = size * 0.8;
        ctx.rect(-s / 2, -s / 2, s, s);
        ctx.rect(-s / 2 + 4, -s / 2 - 4, s, s);
        ctx.moveTo(-s / 2, -s / 2); ctx.lineTo(-s / 2 + 4, -s / 2 - 4);
        ctx.moveTo(s / 2, -s / 2); ctx.lineTo(s / 2 + 4, -s / 2 - 4);
        ctx.moveTo(s / 2, s / 2); ctx.lineTo(s / 2 + 4, s / 2 - 4);
        ctx.moveTo(-s / 2, s / 2); ctx.lineTo(-s / 2 + 4, s / 2 - 4);
      } else if (taxonomy.geometryType === 'cylinder') {
        ctx.ellipse(0, -size / 2, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
        ctx.ellipse(0, size / 2, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
        ctx.moveTo(-size * 0.8, -size / 2); ctx.lineTo(-size * 0.8, size / 2);
        ctx.moveTo(size * 0.8, -size / 2); ctx.lineTo(size * 0.8, size / 2);
      } else {
    const getMesh = () => {
      switch (taxonomy.geometryType) {
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
    };

    const mesh = getMesh();

    const render = () => {
      rotX += 0.015;
      rotY += 0.022;

      ctx.clearRect(0, 0, 96, 96);

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

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [item]);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={96}
      className="w-24 h-24 flex-shrink-0 cursor-grab active:cursor-grabbing rounded-xl bg-slate-950/60 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(0,243,255,0.08)]"
    />
  );
};

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
  catalog,
  onSelectAttachItem,
  onRightClickItem,
  onOpenOrbBuilder,
  isFooterExpanded = true
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [selectedTrustFilter, setSelectedTrustFilter] = useState<TrustBadgeType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCatalog = catalog.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesTrust = selectedTrustFilter === 'ALL' || item.trust === selectedTrustFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesTrust && matchesSearch;
  });

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
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className={`fixed left-4 top-20 ${isFooterExpanded ? 'bottom-[228px]' : 'bottom-14'} z-10 transition-all duration-300 flex ${
        isOpen ? 'w-80 sm:w-96' : 'w-12'
      }`}
    >
      <div className="w-full h-full panel-glass rounded-2xl flex flex-col overflow-hidden border border-cyan-500/20 shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/40">
          <div className={`flex items-center space-x-2 ${!isOpen && 'hidden'}`}>
            <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="font-orbitron text-xs font-bold tracking-wider text-slate-100 uppercase">
              Orb Apothecary Drawer
            </h2>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors ml-auto"
            title={isOpen ? 'Collapse Apothecary' : 'Expand Apothecary'}
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
              <div className="grid grid-cols-4 gap-1 mt-2.5">
                {(
                  [
                    { id: 'ALL', label: 'Tier 1 • All' },
                    { id: 'Orb', label: 'Tier 1 • Orbs' },
                    { id: 'Satellite', label: 'Tier 3 • Sats' },
                    { id: 'Constellation', label: 'Tier 4 • Ring' }
                  ] as const
                ).map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedCategory(tier.id as any)}
                    className={`py-1 rounded-lg text-[9px] font-orbitron font-semibold transition-all ${
                      selectedCategory === tier.id
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apothecary Item Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  No Apothecary items match active filters.
                </div>
              ) : (
                filteredCatalog.map((item) => {
                  const taxonomy = getItem3DTaxonomy(item);
                  const isConstellation = item.category === 'Constellations';

                  return (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => onSelectAttachItem && onSelectAttachItem(item)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (onRightClickItem) onRightClickItem(item);
                      }}
                      className="group relative panel-glass-subtle p-2.5 rounded-xl border border-cyan-500/20 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(0,243,255,0.15)] transition-all duration-200 cursor-grab active:cursor-grabbing flex items-center space-x-3 select-none"
                    >
                      {/* Rotating 3D Geometric Primitive Canvas Thumbnail */}
                      <Item3DThumbnail item={item} />

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
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Trust State Filter Bar */}
            <div className="p-2 border-t border-cyan-500/20 bg-slate-950/80 flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider pl-1">
                Trust State:
              </span>
              <div className="flex space-x-1">
                {(['ALL', 'Experimental', 'Formulated', 'Validated', 'Canonical'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTrustFilter(t as any)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold transition-all ${
                      selectedTrustFilter === t
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t === 'ALL' ? 'ALL' : t.slice(0, 3).toUpperCase()}
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
