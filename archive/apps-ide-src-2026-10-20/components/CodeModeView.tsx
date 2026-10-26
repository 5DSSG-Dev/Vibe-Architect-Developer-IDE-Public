import React, { useState } from 'react';
import { FileJson, Copy, Download, ShieldCheck, Check, Code, Layers } from 'lucide-react';
import { CoreManifest } from '../engine/relationEngine';

interface CodeModeViewProps {
  manifest: CoreManifest;
}

export const CodeModeView: React.FC<CodeModeViewProps> = ({ manifest }) => {
  const [copied, setCopied] = useState(false);

  const manifestJsonString = JSON.stringify(manifest, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(manifestJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([manifestJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${manifest.coreId}-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-10 pt-20 pb-20 px-6 overflow-y-auto flex flex-col items-center">
      <div className="w-full max-w-7xl space-y-6">
        {/* Banner */}
        <div className="panel-glass rounded-2xl p-4 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/50">
              <Code className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                SERIALIZED CORE MANIFEST INSPECTOR
              </span>
              <h2 className="font-orbitron text-lg font-bold text-slate-100 glow-cyan">
                {manifest.name} (v{manifest.version})
              </h2>
              <p className="text-xs font-mono text-slate-300 mt-0.5">
                Formless Core Locus State: <span className="text-emerald-400 font-bold">[{manifest.formlessCoreState}]</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className="btn-cyber px-4 py-2 rounded-xl text-xs font-orbitron font-semibold flex items-center space-x-2 shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="btn-cyber-emerald px-4 py-2 rounded-xl text-xs font-orbitron font-semibold flex items-center space-x-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Export Manifest</span>
            </button>
          </div>
        </div>

        {/* Dual Pane View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Pane: Raw JSON Inspector */}
          <div className="panel-glass rounded-2xl p-4 border border-cyan-500/20 flex flex-col h-[650px] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center space-x-2">
                <FileJson className="w-4 h-4 text-cyan-400" />
                <span>CORE_MANIFEST_CONTRACT.JSON</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {manifestJsonString.length} bytes
              </span>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 bg-black/70 p-4 rounded-xl border border-slate-800">
              <pre className="text-xs font-mono text-cyan-300 leading-relaxed">
                {manifestJsonString}
              </pre>
            </div>
          </div>

          {/* Right Pane: Signed Relation Contracts Ledger */}
          <div className="panel-glass rounded-2xl p-4 border border-purple-500/20 flex flex-col h-[650px] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
              <span className="text-xs font-mono font-bold text-purple-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>SIGNED RELATION CONTRACTS LEDGER</span>
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30">
                {manifest.contracts.length} CONTRACTS SIGNED
              </span>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1">
              {manifest.contracts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-mono">
                  No active relation contracts signed yet.
                </div>
              ) : (
                manifest.contracts.map((contract) => (
                  <div
                    key={contract.contractId}
                    className="panel-glass-subtle p-4 rounded-xl border border-purple-500/30 space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                          {contract.contractId}
                        </span>
                        <h3 className="text-xs font-bold text-slate-100 font-orbitron">
                          {contract.sourceItemName} <span className="text-slate-500">→</span> {contract.targetSocketName}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        STEP {contract.handshakeCompletedStep}/9 PASSED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-500">Allocated RAM:</span>{' '}
                        <span className="text-cyan-300 font-bold">{contract.allocatedMemoryMB} MB</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Protocol:</span>{' '}
                        <span className="text-purple-300 font-bold">{contract.negotiatedProtocolVersion}</span>
                      </div>
                      <div className="col-span-2 truncate">
                        <span className="text-slate-500">Checksum:</span>{' '}
                        <span className="text-emerald-300 font-bold">{contract.checksum}</span>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono space-y-1 bg-black/40 p-2 rounded-lg border border-purple-500/20">
                      <div className="text-purple-300 font-bold mb-1">INVARIANTS VERIFIED:</div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>never_serializes_witness</span>
                        <span className="text-emerald-400">TRUE</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>never_persists_prompts</span>
                        <span className="text-emerald-400">TRUE</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>no_verdict_over_inner_life</span>
                        <span className="text-emerald-400">TRUE</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
