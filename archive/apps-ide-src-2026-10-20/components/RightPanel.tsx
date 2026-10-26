import React, { useState } from 'react';
import { Bot, Sparkles, ShieldCheck, ChevronRight, ChevronLeft, ArrowRight, CheckCircle2, Cpu, HardDrive, Zap, Lock, Terminal, Activity } from 'lucide-react';
import { ApothecaryItem, getItem3DTaxonomy } from '../engine/relationEngine';

interface RightPanelProps {
  catalog: ApothecaryItem[];
  onSelectAttachItem: (item: ApothecaryItem) => void;
  selectedItem?: ApothecaryItem;
  isFooterExpanded?: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  catalog,
  onSelectAttachItem,
  selectedItem,
  isFooterExpanded = true
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [recommendations, setRecommendations] = useState<ApothecaryItem[]>([
    catalog[0],
    catalog[4]
  ]);

  const activeItem = selectedItem || catalog[0];
  const taxonomy = getItem3DTaxonomy(activeItem);

  const handleSynthesizeIntent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSynthesizing(true);
    setTimeout(() => {
      const matches = catalog.filter(item =>
        item.name.toLowerCase().includes(prompt.toLowerCase()) ||
        item.description.toLowerCase().includes(prompt.toLowerCase())
      );
      setRecommendations(matches.length > 0 ? matches : [catalog[1], catalog[5]]);
      setIsSynthesizing(false);
    }, 500);
  };

  return (
    <div
      className={`fixed right-4 top-20 ${isFooterExpanded ? 'bottom-[228px]' : 'bottom-14'} z-10 transition-all duration-300 flex ${
        isOpen ? 'w-80 sm:w-96' : 'w-12'
      }`}
    >
      <div className="w-full h-full panel-glass rounded-2xl flex flex-col overflow-hidden border border-cyan-500/20 shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/40">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors"
            title={isOpen ? 'Collapse Build Master' : 'Expand Build Master'}
          >
            {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 text-cyan-400" />}
          </button>

          <div className={`flex items-center space-x-2 ${!isOpen && 'hidden'}`}>
            <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
            <h2 className="font-orbitron text-xs font-bold tracking-wider text-slate-100 uppercase">
              Build Master Inspector Deck
            </h2>
          </div>
        </div>

        {isOpen && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Intent Synthesis Prompt */}
            <form onSubmit={handleSynthesizeIntent} className="space-y-2">
              <label className="text-[10px] font-mono text-cyan-300 font-bold flex items-center space-x-1 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Relational Intent Synthesizer</span>
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe capability... e.g. 'Attach quantum telemetry sensor with fault containment'"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 font-mono resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSynthesizing}
                className="w-full btn-cyber py-1.5 rounded-xl text-xs font-orbitron font-semibold flex items-center justify-center space-x-2 shadow-md"
              >
                {isSynthesizing ? (
                  <span className="animate-pulse">Synthesizing...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthesize Intent</span>
                  </>
                )}
              </button>
            </form>

            {/* INSPECTOR DECK 1: Relation / Handshake Log (Top) */}
            <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-3 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-slate-100 uppercase tracking-wider">
                    Relation / Handshake Log
                  </span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">100% READY</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-cyan-300">
                  <span>Initiating Handshake...</span>
                  <span>78%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full w-[78%] transition-all duration-300" />
                </div>
              </div>

              {/* Sequential 7-Point Handshake Checklist */}
              <div className="space-y-1 pt-1 text-[9px] font-mono">
                {[
                  '✓ Orb detected',
                  '✓ Umbilical connection established',
                  '✓ Protocol: JSON-LD',
                  '✓ Direction: BiDirectional',
                  '✓ Capabilities exchanged',
                  '✓ Requirements transmitted',
                  '✓ Handshake complete'
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* INSPECTOR DECK 2: Orb Specifications (Middle) */}
            <div className="bg-slate-950/70 border border-purple-500/30 rounded-xl p-3 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-mono font-bold text-slate-100 uppercase tracking-wider">
                    Orb Specifications
                  </span>
                </div>
                <span className="text-[9px] font-mono text-purple-300 px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40">
                  {activeItem.category}
                </span>
              </div>

              <div className="space-y-2 text-[10px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Host Language:</span>
                  <span className="text-cyan-300 font-bold">Python / WebAssembly</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary Capability:</span>
                  <span className="text-emerald-300 font-bold truncate max-w-[160px]">
                    {activeItem.capabilities[0] || 'IdentityImagePacket'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Memory Req:</span>
                  <span className="text-purple-300 font-bold">
                    Persistent: 32MB • Working: {activeItem.memoryReq}MB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CPU Threads:</span>
                  <span className="text-amber-300 font-bold">{activeItem.threadsReq} Cores</span>
                </div>

                {/* Protocol Pills */}
                <div className="pt-1.5 flex flex-wrap gap-1">
                  {['JSON-LD', 'BiDirectional', 'I/O', 'WebSockets'].map((pill) => (
                    <span
                      key={pill}
                      className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[8px]"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* INSPECTOR DECK 3: Constellation Manifest (Bottom) */}
            <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-slate-100 uppercase tracking-wider">
                    Constellation Manifest
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
                  {activeItem.trust}
                </span>
              </div>

              <div className="space-y-2 text-[10px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Host Orb Identity:</span>
                  <span className="text-slate-200 font-orbitron font-bold">{activeItem.name}</span>
                </div>

                {/* Attached Satellite Badges */}
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Attached Satellites:</span>
                  <div className="grid grid-cols-3 gap-1 text-[8px]">
                    <span className="px-1 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-center">I/O</span>
                    <span className="px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 text-center">Compute</span>
                    <span className="px-1 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-center">Storage</span>
                    <span className="px-1 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-center">Validation</span>
                    <span className="px-1 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30 text-center">Security</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Combined Resources:</span>
                  <span className="text-cyan-300">CPU: Low • Mem: 96MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Failure Isolation:</span>
                  <span className="text-emerald-400 font-bold">Satellite-Level Containment</span>
                </div>
              </div>
            </div>

            {/* Proposal Cards */}
            <div className="space-y-2 pt-1">
              <h3 className="text-[10px] font-mono text-slate-400 font-bold tracking-wider uppercase">
                Recommended Handshake Proposals
              </h3>

              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="panel-glass-subtle p-2.5 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-slate-100 font-orbitron">
                      {rec.name}
                    </h4>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300">
                      {rec.category}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-300 mt-1 font-sans line-clamp-2">
                    {rec.description}
                  </p>

                  <button
                    onClick={() => onSelectAttachItem(rec)}
                    className="mt-2 w-full btn-cyber-emerald py-1 rounded-lg text-[10px] font-orbitron font-semibold flex items-center justify-center space-x-1"
                  >
                    <span>Execute Handshake</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
