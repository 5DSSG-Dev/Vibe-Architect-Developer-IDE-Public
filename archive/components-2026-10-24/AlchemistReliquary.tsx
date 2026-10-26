import React, { useState } from 'react';
import { X, Beaker, Zap, Database, Shield, Hexagon, ArrowRight, Save, Sparkles, Filter, Code } from 'lucide-react';


interface Reagent {
  id: string;
  name: string;
  type: 'CORE' | 'SENSOR' | 'MUTATOR' | 'GUARD';
  description: string;
  cost: number;
}

const MOCK_REAGENTS: Reagent[] = [
  { id: 'rg-1', name: 'Quantum Auth Guard', type: 'GUARD', description: 'Zero-knowledge proof authentication routine.', cost: 32 },
  { id: 'rg-2', name: 'Temporal Cache', type: 'CORE', description: 'In-memory state caching with rollback support.', cost: 128 },
  { id: 'rg-3', name: 'I/O Telemetry Stream', type: 'SENSOR', description: 'High-frequency logging for external I/O boundaries.', cost: 16 },
  { id: 'rg-4', name: 'Data Transformer', type: 'MUTATOR', description: 'Map-reduce routine for unstructured JSON payloads.', cost: 64 },
  { id: 'rg-5', name: 'Rate Limiter Shield', type: 'GUARD', description: 'Token bucket rate limiting for exposed endpoints.', cost: 24 }
];

interface AlchemistReliquaryProps {
  onClose: () => void;
}

export const AlchemistReliquary: React.FC<AlchemistReliquaryProps> = ({ onClose }) => {
  const [crucible, setCrucible] = useState<Reagent[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CORE' | 'SENSOR' | 'MUTATOR' | 'GUARD'>('ALL');
  const [outputName, setOutputName] = useState('Custom Telemetry Orb');

  const filteredReagents = filter === 'ALL' ? MOCK_REAGENTS : MOCK_REAGENTS.filter(r => r.type === filter);
  const totalCost = crucible.reduce((acc, r) => acc + r.cost, 0);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'GUARD': return <Shield className="w-4 h-4 text-rose-400" />;
      case 'CORE': return <Database className="w-4 h-4 text-emerald-400" />;
      case 'SENSOR': return <Zap className="w-4 h-4 text-cyan-400" />;
      case 'MUTATOR': return <Hexagon className="w-4 h-4 text-purple-400" />;
      default: return <Code className="w-4 h-4 text-slate-400" />;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'GUARD': return 'bg-rose-950/50 border-rose-500/30 text-rose-300';
      case 'CORE': return 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300';
      case 'SENSOR': return 'bg-cyan-950/50 border-cyan-500/30 text-cyan-300';
      case 'MUTATOR': return 'bg-purple-950/50 border-purple-500/30 text-purple-300';
      default: return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 select-none">
      <div className="absolute inset-0 bg-[#080b10]/95 animate-backdrop-fade" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-full max-h-[800px] flex flex-col bg-slate-950/90 border border-purple-500/30 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden animate-modal-zoom">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-purple-500/20 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Beaker className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h2 className="font-orbitron text-lg sm:text-xl font-bold text-slate-100 tracking-wider">
                THE ALCHEMIST'S RELIQUARY
              </h2>
              <p className="text-xs font-mono text-purple-400/80">
                Synthesize custom functions from base reagents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Pane: Reagent Library */}
          <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/50">
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-orbitron text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Reagent Library
                </span>
                <Filter className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'CORE', 'SENSOR', 'MUTATOR', 'GUARD'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-1 rounded text-[9px] font-mono font-bold transition-colors ${
                      filter === f ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredReagents.map(reagent => (
                <div
                  key={reagent.id}
                  onClick={() => setCrucible([...crucible, reagent])}
                  className={`p-3 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all group ${getColorForType(reagent.type)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      {getIconForType(reagent.type)}
                      <span className="font-bold text-[11px] font-orbitron">{reagent.name}</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-60">+{reagent.cost}MB</span>
                  </div>
                  <p className="text-[10px] font-sans opacity-80 leading-snug">
                    {reagent.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Center Pane: The Crucible */}
          <div className="flex-1 flex flex-col p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-opacity-20 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-slate-950/90 pointer-events-none" />
            
            <h3 className="text-center font-orbitron text-sm font-bold text-purple-400 tracking-widest uppercase mb-8 relative z-10">
              The Crucible
            </h3>
            
            <div className="flex-1 flex flex-col items-center justify-start space-y-4 relative z-10 overflow-y-auto">
              {crucible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-xs opacity-50">
                  <Beaker className="w-12 h-12 mb-3" />
                  <p>Click Reagents to add them to the crucible</p>
                </div>
              ) : (
                crucible.map((reagent, idx) => (
                  <React.Fragment key={idx}>
                    <div className={`w-72 p-3 flex items-center justify-between rounded-xl border shadow-lg ${getColorForType(reagent.type)}`}>
                      <div className="flex items-center space-x-3">
                        {getIconForType(reagent.type)}
                        <span className="font-orbitron font-bold text-[11px]">{reagent.name}</span>
                      </div>
                      <button 
                        onClick={() => setCrucible(crucible.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-black/20 rounded text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {idx < crucible.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-purple-500/50 rotate-90" />
                    )}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>

          {/* Right Pane: Synthesis Output */}
          <div className="w-full md:w-80 border-l border-slate-800 bg-slate-950 flex flex-col">
            <div className="p-4 sm:p-6 flex-1 flex flex-col">
              <h3 className="font-orbitron text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Synthesis Output
              </h3>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 mb-1 block">Construct Name</label>
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-orbitron font-bold text-cyan-300 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 space-y-2 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Reagents:</span>
                    <span className="text-slate-200">{crucible.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Memory Footprint:</span>
                    <span className={totalCost > 256 ? 'text-amber-400' : 'text-emerald-400'}>{totalCost} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Taxonomy:</span>
                    <span className="text-purple-300">Orb / Hybrid</span>
                  </div>
                </div>

                {crucible.length > 0 && (
                  <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-lg">
                    <h4 className="text-[9px] font-mono text-purple-400 uppercase font-bold mb-1.5 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" /> Expected Capability
                    </h4>
                    <p className="text-[10px] text-slate-300 font-sans leading-relaxed">
                      This custom Orb will combine {crucible.map(r => r.name).join(', ')} into a single deployable artifact.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4">
                <button
                  disabled={crucible.length === 0}
                  className="w-full btn-cyber py-2.5 rounded-xl text-xs font-orbitron font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 text-cyan-300" />
                  <span>SYNTHESIZE TO CATALOG</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
