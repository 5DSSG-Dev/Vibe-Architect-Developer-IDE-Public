import React from 'react';
import { Activity, Gauge, AlertTriangle, ShieldAlert, CheckCircle2, Zap, RefreshCw, Layers } from 'lucide-react';
import { SimulationTelemetry, globalSimulationEngine } from '../engine/simulationEngine';

interface SimulateModeViewProps {
  telemetry: SimulationTelemetry;
  onSetPressure: (pressure: number) => void;
  onInjectSatelliteFault: () => void;
  onInjectHostOrbCrash: () => void;
  onClearFaults: () => void;
}

export const SimulateModeView: React.FC<SimulateModeViewProps> = ({
  telemetry,
  onSetPressure,
  onInjectSatelliteFault,
  onInjectHostOrbCrash,
  onClearFaults
}) => {
  return (
    <div className="absolute inset-0 z-10 pt-20 pb-20 px-6 overflow-y-auto flex flex-col items-center legible-glass">
      <div className="w-full max-w-7xl space-y-6">
        {/* Header Banner */}
        <div className="panel-glass rounded-2xl p-4 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/50">
              <Activity className="w-6 h-6 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                SIMULATION & FAULT CONTAINMENT DASHBOARD
              </span>
              <h2 className="font-orbitron text-lg font-bold text-slate-100 glow-emerald">
                Real-Time Telemetry & Stress Engine
              </h2>
              <p className="text-xs font-mono text-slate-300 mt-0.5">
                Deterministic Ticks • Environmental Load • Umbilical Boundary Fault Isolation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClearFaults}
              className="btn-cyber-emerald px-4 py-2 rounded-xl text-xs font-orbitron font-semibold flex items-center space-x-2 shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Containment</span>
            </button>
          </div>
        </div>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tick Clock */}
          <div className="panel-glass rounded-2xl p-4 border border-cyan-500/20 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              DETERMINISTIC TICK CLOCK
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-orbitron text-2xl font-bold text-cyan-300 glow-cyan">
                {telemetry.tick}
              </span>
              <span className="text-xs font-mono text-slate-400">{telemetry.uptimeSeconds}s uptime</span>
            </div>
          </div>

          {/* Card 2: Environmental Pressure */}
          <div className="panel-glass rounded-2xl p-4 border border-amber-500/20 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              ENVIRONMENTAL PRESSURE
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-orbitron text-2xl font-bold text-amber-300 glow-amber">
                {(telemetry.environmentalPressure * 100).toFixed(0)}%
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold">
                {telemetry.environmentalPressure > 0.75 ? 'HIGH STRESS' : 'NORMAL'}
              </span>
            </div>
          </div>

          {/* Card 3: Tension Load */}
          <div className="panel-glass rounded-2xl p-4 border border-purple-500/20 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              SYSTEM TENSION LOAD
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-orbitron text-2xl font-bold text-purple-300">
                {telemetry.tensionLoad.toFixed(1)} / 100
              </span>
              <span className="text-xs font-mono text-purple-400">DYNAMIC</span>
            </div>
          </div>

          {/* Card 4: Witness Index */}
          <div className="panel-glass rounded-2xl p-4 border border-emerald-500/20 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              T-WITNESS INTEGRITY
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-orbitron text-2xl font-bold text-emerald-300 glow-emerald">
                {telemetry.tWitnessIndex.toFixed(4)}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">VERIFIED</span>
            </div>
          </div>
        </div>

        {/* Controls & Fault Injection Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stress Load & Pressure Slider */}
          <div className="panel-glass rounded-2xl p-5 border border-cyan-500/20 space-y-5 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-cyan-500/20 pb-3">
              <Gauge className="w-5 h-5 text-amber-400" />
              <h3 className="font-orbitron text-sm font-bold text-slate-100">
                Environmental Load & Stress Controller
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">Inject Environmental Stress Load</span>
                <span className="text-amber-300 font-bold font-orbitron">
                  {(telemetry.environmentalPressure * 100).toFixed(0)}% Load
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={telemetry.environmentalPressure}
                onChange={(e) => onSetPressure(parseFloat(e.target.value))}
                className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0% (Pristine)</span>
                <span>50% (Nominal)</span>
                <span>100% (Maximum Tension)</span>
              </div>
            </div>

            {/* Dynamic Tension Visualization Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Dynamic Tension Load Envelope:</span>
                <span className="text-purple-300 font-bold">{telemetry.tensionLoad.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-amber-400 to-purple-500 transition-all duration-300"
                  style={{ width: `${telemetry.tensionLoad}%` }}
                />
              </div>
            </div>
          </div>

          {/* Fault Injection & Boundary Containment Testing */}
          <div className="panel-glass rounded-2xl p-5 border border-crimson-500/30 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="font-orbitron text-sm font-bold text-slate-100">
                Boundary Fault Injection Suite
              </h3>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Test the core boundary invariant: Satellite failures must isolate gracefully at the umbilical boundary without causing host Orb or CORE crashes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={onInjectSatelliteFault}
                className="btn-cyber-crimson p-3 rounded-xl text-left font-mono space-y-1 shadow-md"
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold font-orbitron">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Simulate Satellite Fault</span>
                </div>
                <div className="text-[10px] text-slate-300 leading-tight">
                  Injects isolated runtime failure into active satellite socket.
                </div>
              </button>

              <button
                onClick={onInjectHostOrbCrash}
                className="btn-cyber p-3 rounded-xl text-left font-mono space-y-1 shadow-md border-purple-500/40 text-purple-300"
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold font-orbitron text-purple-300">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>Simulate Host Orb Crash</span>
                </div>
                <div className="text-[10px] text-slate-300 leading-tight">
                  Triggers host panic to verify Formless Center stateless recovery.
                </div>
              </button>
            </div>

            {/* Active Fault Status */}
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-1">
              <div className="text-[11px] font-mono text-slate-400 font-bold uppercase">
                CONTAINMENT PROOF STATUS
              </div>
              <div className="text-xs font-mono font-semibold text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {telemetry.activeFaults.length === 0
                    ? 'All boundaries nominal. Host continuity 100% verified.'
                    : `Active Faults Contained (${telemetry.activeFaults.length}): Host continuous.`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
