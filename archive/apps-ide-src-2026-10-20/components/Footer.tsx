import React, { useState } from 'react';
import { Activity, ShieldCheck, Terminal, AlertCircle, ChevronUp, ChevronDown, Gauge, CheckCircle2, Circle, Code, Download, Cpu, HardDrive } from 'lucide-react';
import { SimulationTelemetry } from '../engine/simulationEngine';
import { CoreManifest } from '../engine/relationEngine';

interface FooterProps {
  telemetry: SimulationTelemetry;
  coreManifest?: CoreManifest;
  activeMode?: 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY';
  onSelectMode?: (mode: 'DESIGN' | 'CODE' | 'SIMULATE' | 'DEPLOY') => void;
  onSetPressure: (pressure: number) => void;
  onValidateCore?: () => void;
  onExportCore?: () => void;
  showTelemetryDeck?: boolean;
  onToggleTelemetryDeck?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  telemetry,
  coreManifest,
  activeMode = 'DESIGN',
  onSelectMode,
  onSetPressure,
  onValidateCore,
  onExportCore,
  showTelemetryDeck: propShowTelemetryDeck,
  onToggleTelemetryDeck
}) => {
  const [localShowDeck, setLocalShowDeck] = useState(true);
  const showTelemetryDeck = propShowTelemetryDeck !== undefined ? propShowTelemetryDeck : localShowDeck;
  const handleToggleDeck = onToggleTelemetryDeck || (() => setLocalShowDeck(!localShowDeck));

  const [showLogs, setShowLogs] = useState(false);
  const [coreName, setCoreName] = useState(coreManifest?.name || 'My AEGIS CORE');

  const sockets = coreManifest?.sockets || [];
  const connectedCount = sockets.filter(s => s.state === 'Active').length;
  const totalSockets = sockets.length || 8;
  const vacantCount = totalSockets - connectedCount;
  const totalMemory = sockets.reduce((acc, s) => acc + (s.connectedItem?.memoryReq || 0), 0) || 512;

  const sampleContractJson = JSON.stringify(
    coreManifest?.contracts[0] || {
      contractId: 'ctr-alpha-99',
      protocol: '4D-VIBE-v1.0',
      direction: 'BiDirectional',
      invariants: {
        never_serializes_witness: true,
        never_persists_prompts: true,
        no_verdict_over_inner_life: true
      },
      checksum: 'sha256:7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c'
    },
    null,
    2
  );

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 flex flex-col font-mono select-none">
      {/* Expandable 3-Column Telemetry Dashboard Deck */}
      {showTelemetryDeck && (
        <div className="w-full bg-[#080b10]/95 backdrop-blur-xl border-t border-cyan-500/30 p-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-b border-cyan-500/20 shadow-[0_-10px_30px_rgba(0,243,255,0.1)]">
          {/* Column 1 — Umbilical Status */}
          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-2.5 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
              <span className="font-orbitron text-[11px] font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Column 1 • Umbilical Status</span>
              </span>
              <span className="text-[10px] font-bold text-cyan-300">
                {connectedCount} / {totalSockets} Connected
              </span>
            </div>

            {/* Socket State Icons */}
            <div className="flex items-center space-x-1.5 py-1 overflow-x-auto">
              {sockets.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                    s.state === 'Active'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : s.state === 'Degraded'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-cyan-400/60 border-cyan-500/20'
                  }`}
                  title={`${s.name} (${s.state})`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      s.state === 'Active' ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'
                    }`}
                  />
                  <span>{s.id.replace('socket-', '').substring(0, 3)}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onValidateCore && onValidateCore()}
              className="w-full btn-cyber py-1 rounded-lg text-[10px] font-orbitron font-semibold flex items-center justify-center space-x-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
              <span>VALIDATE CORE INVARIANTS</span>
            </button>
          </div>

          {/* Column 2 — CORE Summary */}
          <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-2.5 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
              <span className="font-orbitron text-[11px] font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                <Gauge className="w-3.5 h-3.5 text-purple-400" />
                <span>Column 2 • CORE Summary</span>
              </span>
              <span className="text-[10px] text-purple-300 font-bold">NOMINAL</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">Connected Orbs:</span>
                <span className="text-emerald-400 font-bold">{connectedCount}</span>
              </div>
              <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">Vacant Umbilicals:</span>
                <span className="text-cyan-400 font-bold">{vacantCount}</span>
              </div>
              <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">Total Memory:</span>
                <span className="text-purple-300 font-bold">{totalMemory} MB</span>
              </div>
              <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">CPU Load:</span>
                <span className="text-amber-300 font-bold">Medium</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span>Environmental Pressure:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={telemetry.environmentalPressure}
                onChange={(e) => onSetPressure(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-700 rounded appearance-none accent-cyan-400 cursor-pointer"
              />
              <span className="text-amber-300 font-bold">
                {(telemetry.environmentalPressure * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Column 3 — Code / Relation Contract Viewer */}
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-2.5 space-y-1.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
              <span className="font-orbitron text-[11px] font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Column 3 • Relation Contract JSON</span>
              </span>
              <span className="text-[9px] text-slate-400">READ-ONLY MONACO</span>
            </div>

            <pre className="text-[9px] text-emerald-300/90 bg-slate-900/90 p-2 rounded border border-slate-800 overflow-x-auto max-h-20 leading-tight">
              {sampleContractJson}
            </pre>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="h-10 panel-glass-header px-4 flex items-center justify-between bg-slate-950/90 border-t border-cyan-500/20 text-xs">
        {/* Left: Mode Toggles & CORE Name */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {(['DESIGN', 'CODE', 'SIMULATE', 'DEPLOY'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onSelectMode && onSelectMode(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-orbitron font-bold transition-colors ${
                  activeMode === m
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="w-px h-3.5 bg-slate-800" />

          {/* CORE Name Input */}
          <input
            type="text"
            value={coreName}
            onChange={(e) => setCoreName(e.target.value)}
            className="bg-transparent border-none text-slate-200 font-orbitron font-bold text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400/50 rounded px-1 w-32 sm:w-44"
          />
        </div>

        {/* Right: Version, Auto Save & Export CORE Button */}
        <div className="flex items-center space-x-3">
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            v0.1.0 • AUTO SAVE <span className="text-emerald-400 font-bold">ACTIVE</span>
          </span>

          <button
            onClick={handleToggleDeck}
            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
            title={showTelemetryDeck ? 'Hide Telemetry Deck' : 'Show Telemetry Deck'}
          >
            {showTelemetryDeck ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={() => onExportCore && onExportCore()}
            className="btn-cyber px-2.5 py-1 rounded-lg text-[10px] font-orbitron font-bold flex items-center space-x-1"
          >
            <Download className="w-3 h-3 text-cyan-300" />
            <span>EXPORT CORE</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
