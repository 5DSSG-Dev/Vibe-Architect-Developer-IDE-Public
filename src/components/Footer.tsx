import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Download, Sparkles, AppWindow, FlaskConical } from 'lucide-react';
import { SimulationTelemetry } from '../engine/simulationEngine';
import { CoreManifest } from '../engine/relationEngine';

export interface WorkspaceSaveStatus {
  state: 'pending' | 'saved' | 'failed';
  /** Local time of the last successful save. */
  at?: string;
}

interface FooterProps {
  telemetry: SimulationTelemetry;
  coreManifest?: CoreManifest;
  /** App-level location and task line, shown at the left of the status bar. */
  wayfinder?: React.ReactNode;
  /** Result of the last workspace save to browser storage. */
  saveStatus?: WorkspaceSaveStatus;
  onSetPressure: (pressure: number) => void;
  onValidateCore?: () => void;
  onExportCore?: () => void;
  showTelemetryDeck?: boolean;
  onToggleTelemetryDeck?: () => void;
  onOpenReliquary?: () => void;
  onOpenBrowser?: () => void;
  /** The Apothecary Cabinet window, opened and closed from the bar's Apothecary button. */
  isApothecaryOpen?: boolean;
  onToggleApothecary?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  telemetry,
  coreManifest,
  wayfinder,
  saveStatus,
  onSetPressure,
  onValidateCore,
  onExportCore,
  showTelemetryDeck: propShowTelemetryDeck,
  onToggleTelemetryDeck,
  onOpenReliquary,
  onOpenBrowser,
  isApothecaryOpen = false,
  onToggleApothecary
}) => {
  const [localShowDeck, setLocalShowDeck] = useState(true);
  const showTelemetryDeck = propShowTelemetryDeck !== undefined ? propShowTelemetryDeck : localShowDeck;
  const handleToggleDeck = onToggleTelemetryDeck || (() => setLocalShowDeck(!localShowDeck));

  const [showLogs, setShowLogs] = useState(false);
  const [coreName, setCoreName] = useState(coreManifest?.name || 'My AEGIS CORE');
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 flex flex-col font-mono select-none">
      {/* Reliquary Entry Anchor / Command Console */}
      <div className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-50 transition-all duration-300 ${isConsoleOpen ? '-top-48' : '-top-10'}`}>
        
        {/* The Roll-Up Menu */}
        <div className={`w-64 bg-slate-900/95 border border-cyan-500/30 rounded-t-xl overflow-hidden transition-all duration-300 shadow-[0_-10px_30px_rgba(0,243,255,0.15)] flex flex-col justify-end ${isConsoleOpen ? 'h-40 opacity-100 mb-0' : 'h-0 opacity-0 mb-0'}`}>
          <div className="p-2 flex flex-col space-y-1 w-full h-full justify-end">
            <button
              onClick={() => {
                setIsConsoleOpen(false);
                onOpenReliquary && onOpenReliquary();
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500/20 text-purple-300 transition-colors flex items-center space-x-2 text-xs font-orbitron font-bold"
            >
              <Sparkles className="w-4 h-4" />
              <span>Alchemist's Reliquary</span>
            </button>

            <button
              onClick={() => {
                setIsConsoleOpen(false);
                onOpenBrowser && onOpenBrowser();
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-cyan-300 transition-colors flex items-center space-x-2 text-xs font-orbitron font-bold"
            >
              <AppWindow className="w-4 h-4" />
              <span>Launch Built-In Browser</span>
            </button>
            
          </div>
        </div>

        {/* The Main Tab */}
        <button
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className={`group relative px-8 py-1.5 rounded-t-xl bg-slate-950/95 border border-b-0 border-cyan-500/50 shadow-[0_-5px_15px_rgba(0,243,255,0.2)] flex items-center space-x-2 overflow-hidden transition-all hover:bg-slate-900/95 hover:border-cyan-400/80 ${!isConsoleOpen ? 'h-10' : 'h-8'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <span className="font-orbitron font-bold text-[10px] tracking-widest text-slate-100 uppercase relative z-10">
            {isConsoleOpen ? 'Close Console' : 'Command Console'}
          </span>
          {isConsoleOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 relative z-10" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400 relative z-10 animate-bounce" />
          )}
        </button>
      </div>

      {/* Bottom Status Bar: tall enough to hold the Apothecary button and the Luminary icon. */}
      <div className="h-20 panel-glass-header px-4 flex items-center justify-between bg-slate-950/90 border-t border-cyan-500/20 text-xs">
        {/* Left: Wayfinder. The header holds the only mode switch. */}
        <div className="flex-1 min-w-0 max-w-[calc(50vw-140px)] pl-12 flex items-center gap-4">
          {onToggleApothecary && (
            <button
              type="button"
              onClick={onToggleApothecary}
              aria-pressed={isApothecaryOpen}
              title={isApothecaryOpen ? 'Close the Apothecary Cabinet' : 'Open the Apothecary Cabinet'}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border font-orbitron text-[10px] font-bold tracking-wider uppercase transition-colors ${
                isApothecaryOpen
                  ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200'
                  : 'bg-slate-900/80 border-cyan-500/30 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-200'
              }`}
            >
              <FlaskConical className="w-4 h-4 text-cyan-300" />
              <span>Apothecary</span>
            </button>
          )}
          <div className="min-w-0">{wayfinder}</div>
        </div>

        {/* Right: Version, Auto Save & Export CORE Button */}
        <div className="flex items-center space-x-3">
          {/* CORE Name Input */}
          <input
            type="text"
            value={coreName}
            onChange={(e) => setCoreName(e.target.value)}
            aria-label="CORE name"
            className="bg-transparent border-none text-slate-200 font-orbitron font-bold text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400/50 rounded px-1 w-32 sm:w-44 text-right"
          />

          <div className="w-px h-3.5 bg-slate-800" />

          <span className="text-[10px] text-slate-400 hidden sm:inline">
            v0.1.0 • AUTO SAVE{' '}
            {saveStatus?.state === 'saved' ? (
              <span className="text-emerald-400 font-bold" title={`Last saved to this browser at ${saveStatus.at}`}>
                SAVED {saveStatus.at}
              </span>
            ) : saveStatus?.state === 'failed' ? (
              <span className="text-rose-400 font-bold" title="The workspace could not be written to browser storage">
                FAILED
              </span>
            ) : (
              <span className="text-slate-400 font-bold">PENDING</span>
            )}
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
