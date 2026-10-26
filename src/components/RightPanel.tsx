import React, { useState } from 'react';
import { Search, Sparkles, ShieldCheck, ChevronRight, ChevronLeft, ArrowRight, Activity, CheckCircle2, Terminal } from 'lucide-react';
import { ApothecaryItem, CoreManifest } from '../engine/relationEngine';
import { SimulationTelemetry } from '../engine/simulationEngine';
import { ChevronDown, ChevronUp, Gauge, Code, Sun, Moon } from 'lucide-react';
import { WorkRequestPanel } from './WorkRequestPanel';

interface RightPanelProps {
  catalog: ApothecaryItem[];
  onSelectAttachItem: (item: ApothecaryItem) => void;
  selectedItem?: ApothecaryItem;
  isFooterExpanded?: boolean;
  telemetry?: SimulationTelemetry;
  coreManifest?: CoreManifest;
  onSetPressure?: (p: number) => void;
  // New props for Aether control
  ambientIntensity?: number;
  directionalIntensity?: number;
  directionalAngle?: number;
  onUpdateAether?: (key: 'ambientIntensity' | 'directionalIntensity' | 'directionalAngle', value: number) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  catalog,
  onSelectAttachItem,
  selectedItem,
  isFooterExpanded = true,
  telemetry,
  coreManifest,
  onSetPressure,
  ambientIntensity = 0.5,
  directionalIntensity = 1.0,
  directionalAngle = 0.9,
  onUpdateAether
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  // Catalog search is a plain keyword match over names and descriptions. It is
  // not AI and must not be presented as Luminary activity.
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ApothecaryItem[]>([]);

  // Accordion States for Telemetry
  const [showUmbilical, setShowUmbilical] = useState(false);
  const [showCoreSummary, setShowCoreSummary] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showAether, setShowAether] = useState(true);

  const activeItem = selectedItem || catalog[0];
  const contractCount = coreManifest?.contracts.length ?? 0;
  const latestContract = coreManifest?.contracts[0];

  const sockets = coreManifest?.sockets || [];
  const connectedCount = sockets.filter(s => s.state === 'Active').length;
  const totalSockets = sockets.length || 8;
  const totalMemory = sockets.reduce((acc, s) => acc + (s.connectedItem?.memoryReq || 0), 0);

  const sampleContractJson = JSON.stringify(
    coreManifest?.contracts[0] || {
      contractId: 'ctr-alpha-99',
      protocol: '4D-VIBE-v1.0',
      direction: 'BiDirectional',
      invariants: { never_serializes_witness: true }
    },
    null,
    2
  );

  const handleCatalogSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = prompt.trim().toLowerCase();
    if (!query) return;

    setRecommendations(
      catalog.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    );
    setSearchedFor(prompt.trim());
  };

  return (
    <div
      className={`fixed right-4 top-20 ${isFooterExpanded ? 'bottom-[228px]' : 'bottom-14'} z-10 transition-all duration-300 flex ${
        isOpen ? 'w-80 sm:w-96' : 'w-12'
      }`}
    >
      <div className="w-full h-full panel-glass rounded-2xl flex flex-col overflow-hidden border border-cyan-500/20 shadow-2xl legible-glass">
        {/* Header */}
        <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/40">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors"
            title={isOpen ? 'Collapse Inspector Deck' : 'Expand Inspector Deck'}
            aria-label={isOpen ? 'Collapse Inspector Deck' : 'Expand Inspector Deck'}
          >
            {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 text-cyan-400" />}
          </button>

          <div className={`flex items-center space-x-2 ${!isOpen && 'hidden'}`}>
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="font-orbitron text-xs font-bold tracking-wider text-slate-100 uppercase">
              Inspector Deck
            </h2>
          </div>
        </div>

        {isOpen && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <WorkRequestPanel />

            {/* Catalog Search: keyword match, not AI */}
            <form onSubmit={handleCatalogSearch} className="space-y-2">
              <label htmlFor="catalog-search" className="text-[10px] font-mono text-cyan-300 font-bold flex items-center space-x-1 uppercase">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Catalog Search</span>
                <span className="normal-case font-normal text-slate-500">· keyword match, not AI</span>
              </label>
              <div className="relative">
                <textarea
                  id="catalog-search"
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Search Element names and descriptions, e.g. 'telemetry'"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 font-mono resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full btn-cyber py-1.5 rounded-xl text-xs font-orbitron font-semibold flex items-center justify-center space-x-2 shadow-md"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Catalog</span>
              </button>
            </form>

            {/* INSPECTOR DECK 1: Relation / Handshake Log (Top). Reads the most
                recent committed Relation Contract; nothing here is preset. */}
            <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-3 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-mono font-bold text-slate-100 uppercase tracking-wider">
                    Relation / Handshake Log
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">
                  {contractCount} contract{contractCount === 1 ? '' : 's'}
                </span>
              </div>

              {latestContract ? (
                <div className="space-y-1 text-[9px] font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="truncate">
                      Last: {latestContract.sourceItemName} → {latestContract.targetSocketName}
                    </span>
                    <span
                      className={
                        latestContract.handshakeStatus === 'SUCCESS'
                          ? 'text-emerald-400 font-bold'
                          : latestContract.handshakeStatus === 'FAILED'
                            ? 'text-rose-400 font-bold'
                            : 'text-amber-300 font-bold'
                      }
                    >
                      {latestContract.handshakeStatus}
                    </span>
                  </div>
                  <div className="text-slate-500 truncate" title={latestContract.contractId}>
                    {latestContract.contractId} · step {latestContract.handshakeCompletedStep} ·{' '}
                    {latestContract.negotiatedProtocolVersion}
                  </div>
                  {latestContract.capabilitiesExchanged.length > 0 && (
                    <div className="flex items-center space-x-1.5 text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">Capabilities: {latestContract.capabilitiesExchanged.join(', ')}</span>
                    </div>
                  )}
                  {latestContract.failureReason && (
                    <div className="text-rose-300">{latestContract.failureReason}</div>
                  )}
                </div>
              ) : (
                <p className="text-[9px] font-mono text-slate-500">No handshake committed yet.</p>
              )}
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
                <span
                  className="text-[8px] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-slate-600/60"
                  title="Some values in this card are fixed placeholders, not read from the Element"
                >
                  PREVIEW
                </span>
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
                <span
                  className="text-[8px] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-slate-600/60"
                  title="Some values in this card are fixed placeholders, not read from the Element"
                >
                  PREVIEW
                </span>
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
                Catalog Matches
              </h3>

              {recommendations.length === 0 && (
                <p className="text-[10px] text-slate-500 font-mono">
                  {searchedFor === null ? 'Search the catalog to list matching Elements.' : `No Elements match "${searchedFor}".`}
                </p>
              )}

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

            {/* TELEMETRY ACCORDIONS */}
            <div className="space-y-2 pt-4 border-t border-cyan-500/20 mt-4">
              <h3 className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider uppercase mb-2 flex justify-between items-center">
                <span>Telemetry Deck</span>
              </h3>
              
              {/* Umbilical Status Accordion */}
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowUmbilical(!showUmbilical)}
                  className="w-full p-2 flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-orbitron text-[10px] font-bold text-slate-100 uppercase flex items-center space-x-1.5">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>Umbilical Status ({connectedCount}/{totalSockets})</span>
                  </span>
                  {showUmbilical ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {showUmbilical && (
                  <div className="p-2.5 border-t border-cyan-500/20 space-y-2">
                    <div className="flex flex-wrap gap-1.5 py-1">
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
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${s.state === 'Active' ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`}
                          />
                          <span>{s.id.replace('socket-', '').substring(0, 3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CORE Summary Accordion */}
              <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowCoreSummary(!showCoreSummary)}
                  className="w-full p-2 flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-orbitron text-[10px] font-bold text-slate-100 uppercase flex items-center space-x-1.5">
                    <Gauge className="w-3 h-3 text-purple-400" />
                    <span>CORE Summary</span>
                  </span>
                  {showCoreSummary ? <ChevronUp className="w-3.5 h-3.5 text-purple-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {showCoreSummary && (
                  <div className="p-2.5 border-t border-purple-500/20 space-y-2 text-[10px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex flex-col">
                        <span className="text-slate-400">Total Mem:</span>
                        <span className="text-purple-300 font-bold">{totalMemory} MB</span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex flex-col">
                        <span className="text-slate-400">CPU Load:</span>
                        <span className="text-amber-300 font-bold">Medium</span>
                      </div>
                    </div>
                    {telemetry && onSetPressure && (
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-2">
                        <span>Pressure:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={telemetry.environmentalPressure}
                          onChange={(e) => onSetPressure(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-slate-700 rounded appearance-none accent-cyan-400 cursor-pointer"
                        />
                        <span className="text-amber-300 font-bold w-6 text-right">
                          {(telemetry.environmentalPressure * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AETHER VIBE Accordion */}
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAether(!showAether)}
                  className="w-full p-2 flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-orbitron text-[10px] font-bold text-slate-100 uppercase flex items-center space-x-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Aetherial Vibe</span>
                  </span>
                  {showAether ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {showAether && (
                  <div className="p-2.5 border-t border-cyan-500/20 space-y-3 text-[10px]">
                    {/* Ambient Light Slider */}
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Moon className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="w-24">Ambient Light:</span>
                      <input
                        type="range"
                        min="0" max="2" step="0.05"
                        value={ambientIntensity}
                        onChange={(e) => onUpdateAether && onUpdateAether('ambientIntensity', parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-slate-700 rounded appearance-none accent-cyan-400 cursor-pointer"
                      />
                      <span className="text-cyan-300 font-bold w-8 text-right">
                        {ambientIntensity.toFixed(2)}
                      </span>
                    </div>
                    {/* Directional Light Intensity Slider */}
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="w-24">Sun Intensity:</span>
                      <input
                        type="range"
                        min="0" max="4" step="0.1"
                        value={directionalIntensity}
                        onChange={(e) => onUpdateAether && onUpdateAether('directionalIntensity', parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-slate-700 rounded appearance-none accent-amber-400 cursor-pointer"
                      />
                      <span className="text-amber-300 font-bold w-8 text-right">{directionalIntensity.toFixed(1)}</span>
                    </div>
                    {/* Directional Light Angle Slider */}
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="w-24">Sun Angle:</span>
                      <input
                        type="range" min="-3.14" max="3.14" step="0.1"
                        value={directionalAngle}
                        onChange={(e) => onUpdateAether && onUpdateAether('directionalAngle', parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-slate-700 rounded appearance-none accent-amber-400 cursor-pointer"
                      />
                      <span className="text-amber-300 font-bold w-8 text-right">{((directionalAngle * 180) / Math.PI).toFixed(0)}°</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contract JSON Accordion */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowContract(!showContract)}
                  className="w-full p-2 flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-orbitron text-[10px] font-bold text-slate-100 uppercase flex items-center space-x-1.5">
                    <Code className="w-3 h-3 text-emerald-400" />
                    <span>Relation Contract</span>
                    {!latestContract && <span className="normal-case font-mono font-normal text-slate-500">(sample)</span>}
                  </span>
                  {showContract ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {showContract && (
                  <div className="p-2.5 border-t border-emerald-500/20">
                    <pre className="text-[9px] text-emerald-300/90 bg-slate-900/90 p-2 rounded border border-slate-800 overflow-x-auto max-h-40 leading-tight">
                      {sampleContractJson}
                    </pre>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
