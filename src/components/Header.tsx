import React from 'react';
import { Cpu, HardDrive, Zap, Sliders, Box, Code, PlayCircle, ShieldCheck } from 'lucide-react';
import { HardwareBudget } from '../engine/relationEngine';

interface HeaderProps {
  activeMode: 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY';
  onSelectMode: (mode: 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY') => void;
  hardwareBudget: HardwareBudget;
  onOpenCoreMatrix: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onSelectMode,
  hardwareBudget,
  onOpenCoreMatrix
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 h-16 panel-glass-header px-4 flex items-center justify-between">
      {/* Branding & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-600/30 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.4)]">
          <Box className="w-5 h-5 text-cyan-300 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-orbitron text-sm sm:text-base font-bold tracking-wider text-slate-100 glow-cyan">
              VIBE ARCHITECT
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              Developer IDE v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Relational Development Environment — Non-Interfering Witness
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-cyan-500/20 shadow-inner">
        <button
          onClick={() => onSelectMode('DESIGN')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-orbitron transition-all ${
            activeMode === 'DESIGN'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,243,255,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>DESIGN</span>
        </button>

        <button
          onClick={() => onSelectMode('SIMULATE')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-orbitron transition-all ${
            activeMode === 'SIMULATE'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>SIMULATE</span>
        </button>

        <button
          onClick={() => onSelectMode('DEPLOY')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-orbitron transition-all ${
            activeMode === 'DEPLOY'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>DEPLOY</span>
        </button>
      </div>

      {/* Telemetry Meters & Actions */}
      <div className="flex items-center space-x-4">
        {/* Configured CORE budget (set in the CORE Matrix); not live usage */}
        <div
          className="hidden lg:flex items-center space-x-4 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono"
          title="Configured CORE budget from the CORE Matrix, not live usage"
        >
          <div className="flex items-center space-x-1.5 text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>RAM:</span>
            <span className="text-cyan-300 font-semibold">{hardwareBudget.memoryMB} MB</span>
          </div>

          <div className="w-px h-3.5 bg-slate-700" />

          <div className="flex items-center space-x-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Threads:</span>
            <span className="text-purple-300 font-semibold">{hardwareBudget.threads}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-700" />

          <div className="flex items-center space-x-1.5 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPU:</span>
            <span className={hardwareBudget.gpuEnabled ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>
              {hardwareBudget.gpuEnabled ? 'ENABLED' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Configure CORE Matrix Button */}
        <button
          onClick={onOpenCoreMatrix}
          className="btn-cyber px-3 py-1.5 rounded-lg text-xs font-orbitron font-semibold flex items-center space-x-1.5 shadow-md"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden md:inline">CORE Matrix</span>
        </button>
      </div>
    </header>
  );
};
