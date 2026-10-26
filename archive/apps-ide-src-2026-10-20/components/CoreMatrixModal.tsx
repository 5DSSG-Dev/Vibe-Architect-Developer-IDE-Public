import React from 'react';
import { X, Sliders, Cpu, HardDrive, Zap, Shield, CheckCircle2, Circle } from 'lucide-react';
import { HardwareBudget, ActiveDaemons } from '../engine/relationEngine';

interface CoreMatrixModalProps {
  hardwareBudget: HardwareBudget;
  activeDaemons: ActiveDaemons;
  onUpdateHardwareBudget: (budget: HardwareBudget) => void;
  onToggleDaemon: (daemonKey: keyof ActiveDaemons) => void;
  onClose: () => void;
}

export const CoreMatrixModal: React.FC<CoreMatrixModalProps> = ({
  hardwareBudget,
  activeDaemons,
  onUpdateHardwareBudget,
  onToggleDaemon,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl panel-glass rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50">
              <Sliders className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h2 className="font-orbitron text-base font-bold text-slate-100 glow-cyan">
                POD CORE MATRIX CONFIGURATOR
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                Hardware Budget & Daemon Witness Trajectory Controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Formless Locus Banner */}
          <div className="bg-cyan-950/40 border border-cyan-500/40 p-3.5 rounded-2xl text-center space-y-1">
            <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase font-bold">
              POD CRYSTAL FORMLESS LOCUS STATUS
            </span>
            <div className="text-xs font-mono font-bold text-emerald-300 glow-emerald">
              [ FORMLESS CENTER — NOT A COMPONENT — NO SERIALIZED STATE ]
            </div>
          </div>

          {/* Section 1: Hardware Resource Allocation Budget */}
          <div className="space-y-4">
            <h3 className="text-xs font-orbitron font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800 pb-2">
              1. Processor Hardware Resource Budget
            </h3>

            {/* Memory Slider */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center space-x-1.5">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>ALLOCATED HEAP MEMORY</span>
                </span>
                <span className="font-bold text-cyan-300 font-orbitron">{hardwareBudget.memoryMB} MB</span>
              </div>
              <input
                type="range"
                min="1024"
                max="16384"
                step="512"
                value={hardwareBudget.memoryMB}
                onChange={(e) => onUpdateHardwareBudget({ ...hardwareBudget, memoryMB: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Threads Selector */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center space-x-1.5">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>THREAD POOL WORKERS</span>
                </span>
                <span className="font-bold text-purple-300 font-orbitron">{hardwareBudget.threads} THREADS</span>
              </div>
              <div className="flex gap-2">
                {[2, 4, 8, 16, 32].map((num) => (
                  <button
                    key={num}
                    onClick={() => onUpdateHardwareBudget({ ...hardwareBudget, threads: num })}
                    className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                      hardwareBudget.threads === num
                        ? 'bg-purple-500/30 border border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}T
                  </button>
                ))}
              </div>
            </div>

            {/* GPU Toggle */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-xs font-mono">
                <Zap className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-bold text-slate-200">GPU WebGL Shading Acceleration</div>
                  <div className="text-[10px] text-slate-400">Enable physical transmission & bloom pass</div>
                </div>
              </div>

              <button
                onClick={() => onUpdateHardwareBudget({ ...hardwareBudget, gpuEnabled: !hardwareBudget.gpuEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 border ${
                  hardwareBudget.gpuEnabled
                    ? 'bg-emerald-950 border-emerald-500'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-emerald-400 transition-transform ${
                    hardwareBudget.gpuEnabled ? 'translate-x-6' : 'translate-x-0 bg-slate-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Orbiting Daemons */}
          <div className="space-y-4">
            <h3 className="text-xs font-orbitron font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800 pb-2">
              2. Active Witness Daemons
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'steward' as const, name: 'Steward Daemon', role: 'Context Witness', color: 'text-cyan-400', desc: 'Maintains state boundary consistency' },
                { key: 'advocate' as const, name: 'Advocate Daemon', role: 'Affective Witness', color: 'text-purple-400', desc: 'Monitors emotional resonance' },
                { key: 'temporal' as const, name: 'Temporal Daemon', role: 'Tick Clock Witness', color: 'text-amber-400', desc: 'Drives microsecond pulse ticks' },
                { key: 'conductor' as const, name: 'Conductor Daemon', role: 'Pipeline Router Witness', color: 'text-teal-400', desc: 'Routes inter-satellite handshakes' },
              ].map((d) => {
                const isActive = activeDaemons[d.key];
                return (
                  <div
                    key={d.key}
                    onClick={() => onToggleDaemon(d.key)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-900/90 border-cyan-500/40 shadow-[0_0_15px_rgba(0,243,255,0.15)]'
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-orbitron text-xs font-bold ${d.color}`}>{d.name}</span>
                      {isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">{d.role}</div>
                    <div className="text-[11px] text-slate-300 mt-1.5 font-sans">{d.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="btn-cyber px-6 py-2 rounded-xl text-xs font-orbitron font-semibold shadow-lg"
          >
            Save & Return to HUD
          </button>
        </div>
      </div>
    </div>
  );
};
