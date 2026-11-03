import React, { useState, useSyncExternalStore } from 'react';
import { isLuminaryEngaged, setLuminaryEngaged, subscribeLuminaryEngaged } from '../luminary/presence';
import { X, Sliders, Cpu, HardDrive, Zap, Shield, CheckCircle2, Circle } from 'lucide-react';
import { HardwareBudget } from '../engine/relationEngine';
import { Dialog } from './Dialog';
import { CoreCrystalPreview, CoreCrystalThumbnail } from './CoreCrystalPreview';
import type { CoreManifest } from '../engine/relationEngine';

const APP_TYPES = ['Web App', 'Database', 'Desktop App', 'Mobile App', 'Browser Extension', 'API / Service', 'Library / Package', 'Automation', 'Other'];
const CRYSTALS = [
  ['AEGIS_POD_CRYSTAL.glb', 'Seed Crystal'],
  ['CORE_CRYSTAL_CAGED.glb', 'Caged Crystal'],
  ['CORE_CRYSTAL_CAGED2.glb', 'Caged Crystal II'],
  ['crystals.glb', 'Crystal Cluster'],
];
const defaultCrystal = (type: string) => type === 'Database' ? CRYSTALS[1][0] : type === 'API / Service' || type === 'Automation' ? CRYSTALS[2][0] : type === 'Library / Package' ? CRYSTALS[3][0] : CRYSTALS[0][0];

interface CoreMatrixModalProps {
  hardwareBudget: HardwareBudget;
  manifest: CoreManifest;
  onUpdateApp: (patch: Partial<Pick<CoreManifest, 'name' | 'version' | 'appConfiguration'>>) => void;
  onUpdateHardwareBudget: (budget: HardwareBudget) => void;
  onClose: () => void;
}

export const CoreMatrixModal: React.FC<CoreMatrixModalProps> = ({
  hardwareBudget,
  manifest,
  onUpdateApp,
  onUpdateHardwareBudget,
  onClose
}) => {
  const luminaryEngaged = useSyncExternalStore(subscribeLuminaryEngaged, isLuminaryEngaged);
  const [pickerOpen, setPickerOpen] = useState(false);
  const config = manifest.appConfiguration ?? { appType: 'Web App', purpose: '', crystalModel: CRYSTALS[0][0], updatedAt: '' };
  const updateConfig = (patch: Partial<typeof config>) => onUpdateApp({ appConfiguration: { ...config, ...patch, updatedAt: new Date().toISOString() } });
  const fieldClass = "w-full mt-1 rounded-xl border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none";
  return (
    <Dialog label="CORE Matrix Configurator" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl panel-glass rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] overflow-hidden flex flex-col max-h-[90vh] animate-modal-zoom">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50">
              <Sliders className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h2 className="font-orbitron text-base font-bold text-slate-100 glow-cyan">
                CORE MATRIX CONFIGURATOR
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                App identity, resources and CORE crystal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close CORE Matrix Configurator"
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          <div className="bg-cyan-950/40 border border-cyan-500/40 p-4 rounded-2xl text-sm text-slate-200">
            <strong className="text-cyan-300">Your app starts with its CORE.</strong>
            <p className="mt-1">The CORE brings your app’s identity and connected Elements together. Set the resources available to its Orbs, describe what you are building, and choose a crystal to represent it.</p>
          </div>

          {/* Section 1: Hardware Resource Allocation Budget */}
          <div className="space-y-4">
            <h3 className="text-xs font-orbitron font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800 pb-2">
              1. App resource budget
            </h3>

            <p className="text-xs text-slate-400">These budgets guide Element connections; they do not reserve your computer’s physical memory or processor threads.</p>
            {/* Memory Slider */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center space-x-1.5">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>Memory budget</span>
                </span>
                <span className="font-bold text-cyan-300 font-orbitron">{hardwareBudget.memoryMB} MB</span>
              </div>
              <p className="text-xs text-slate-400">How much memory connected Orbs can share.</p>
              <input
                aria-label="Memory budget in megabytes"
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
                  <span>Parallel work slots</span>
                </span>
                <span className="font-bold text-purple-300 font-orbitron">{hardwareBudget.threads} THREADS</span>
              </div>
              <p className="text-xs text-slate-400">How many work slots connected Orbs can share.</p>
              <div className="flex gap-2">
                {[2, 4, 8, 16, 32].map((num) => (
                  <button
                    key={num}
                    aria-pressed={hardwareBudget.threads === num}
                    onClick={() => onUpdateHardwareBudget({ ...hardwareBudget, threads: num })}
                    className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                      hardwareBudget.threads === num
                        ? 'bg-purple-500/30 border border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* GPU Toggle */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-xs font-mono">
                <Zap className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-bold text-slate-200">Graphics capability</div>
                  <div className="text-[10px] text-slate-400">Allow connected Orbs to request GPU access</div>
                </div>
              </div>

              <button
                aria-label="Allow graphics capability"
                aria-pressed={hardwareBudget.gpuEnabled}
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

          <section className="space-y-4">
            <h3 className="text-sm font-orbitron text-slate-200 border-b border-slate-800 pb-2">2. CORE Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm text-slate-300">
                <label className="block">App name<input className={fieldClass} maxLength={120} value={manifest.name} onChange={e => onUpdateApp({ name: e.target.value })} /></label>
                <label className="block">App type<select className={fieldClass} value={config.appType} onChange={e => updateConfig({ appType: e.target.value, crystalModel: defaultCrystal(e.target.value) })}>{APP_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
                <label className="block">Purpose<textarea className={fieldClass} rows={3} maxLength={2000} placeholder="What will this app help people do?" value={config.purpose} onChange={e => updateConfig({ purpose: e.target.value })} /></label>
                <label className="block">Version<input className={fieldClass} maxLength={40} value={manifest.version} onChange={e => onUpdateApp({ version: e.target.value })} /></label>
                <dl className="text-xs space-y-2 break-all"><div><dt className="text-slate-400">App identifier</dt><dd>{manifest.coreId}</dd></div><div><dt className="text-slate-400">Created</dt><dd>{manifest.createdAt}</dd></div></dl>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm text-cyan-300">{config.appType} CORE</h4>
                <CoreCrystalPreview model={CRYSTALS.some(([file]) => file === config.crystalModel) ? config.crystalModel : CRYSTALS[0][0]} />
                <div className="text-sm text-slate-300">
                  <button type="button" aria-expanded={pickerOpen} aria-controls="core-crystal-options" onClick={() => setPickerOpen(open => !open)} className={`${fieldClass} flex items-center justify-between text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300`}>
                    <span>Crystal · {CRYSTALS.find(([file]) => file === config.crystalModel)?.[1] ?? 'Seed Crystal'}</span><span aria-hidden="true">{pickerOpen ? '▴' : '▾'}</span>
                  </button>
                  {pickerOpen && <div id="core-crystal-options" role="group" aria-label="Choose a CORE crystal" className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-slate-700 bg-slate-950 p-2">
                    {CRYSTALS.map(([file, name]) => <button key={file} type="button" aria-pressed={config.crystalModel === file} onClick={() => { updateConfig({ crystalModel: file }); }} className={`rounded-xl border p-2 text-center text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${config.crystalModel === file ? 'border-cyan-300 bg-cyan-950/60 text-cyan-200' : 'border-slate-700 hover:border-cyan-500'}`}>
                      <CoreCrystalThumbnail model={file} /><span>{name}{config.crystalModel === file ? ' ✓' : ''}</span>
                    </button>)}
                  </div>}
                </div>
                <p className="text-xs text-slate-400">A visual identity for your app. Choosing a type suggests a crystal; you can choose another. This does not change the workspace’s central model.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-slate-950/60 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span aria-hidden="true" />
          <button type="button" onClick={() => setLuminaryEngaged(!luminaryEngaged)} aria-expanded={luminaryEngaged} aria-label={luminaryEngaged ? 'Minimize Luminary conversation' : 'Talk to the Vibe Luminary'} className="px-3 py-2 rounded-xl flex items-center gap-2 bg-slate-950/85 border border-amber-400/40 hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
            <img src="/assets/luminary/luminary-codeglass-96.webp" alt="" className="w-7 h-7 object-contain" />
            <span className="text-left leading-tight"><span className="block text-xs font-bold text-amber-100">Luminary</span><span className="block text-[10px] text-amber-200/80">{luminaryEngaged ? 'Minimize conversation' : 'Click to talk'}</span></span>
          </button>
          <button
            onClick={onClose}
            className="btn-cyber justify-self-end px-6 py-2 rounded-xl text-xs font-orbitron font-semibold shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </Dialog>
  );
};
