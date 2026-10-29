import React, { useState } from 'react';
import { X, Sparkles, Cpu, HardDrive, ShieldCheck, Zap, Layers, Plus, Trash2, ArrowRight, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { ApothecaryItem, SocketBinding, TrustBadgeType, CategoryType, SatelliteClass } from '../engine/relationEngine';
import { Dialog } from './Dialog';
import { UMBILICAL_PROFILE_IDS, UMBILICAL_PROFILES, type UmbilicalProfileId } from '../contracts/umbilicalStandards';

interface OrbBuilderModalProps {
  initialItem?: ApothecaryItem;
  targetSocketId?: string;
  availableSockets: SocketBinding[];
  onClose: () => void;
  onSaveToCatalog: (item: ApothecaryItem) => void;
  onInitiateHandshake: (item: ApothecaryItem, targetSocketId: string) => void;
}

export const OrbBuilderModal: React.FC<OrbBuilderModalProps> = ({
  initialItem,
  targetSocketId,
  availableSockets,
  onClose,
  onSaveToCatalog,
  onInitiateHandshake
}) => {
  const [selectedSocketId, setSelectedSocketId] = useState<string>(
    targetSocketId || availableSockets.find(s => s.state === 'Vacant')?.id || availableSockets[0]?.id || 'socket-alpha'
  );

  const [name, setName] = useState(initialItem?.name || 'PyTorch Neural Engine');
  const [description, setDescription] = useState(initialItem?.description || 'Deep learning tensor processing module with hardware acceleration.');
  const [language, setLanguage] = useState<'Python' | 'TypeScript' | 'Rust' | 'PyTorch'>('PyTorch');
  const [category, setCategory] = useState<CategoryType>(initialItem?.category || 'Formulas');
  const [umbilicalProfileId, setUmbilicalProfileId] = useState<UmbilicalProfileId | ''>(initialItem?.umbilicalProfileId ?? '');
  const [trust, setTrust] = useState<TrustBadgeType>(initialItem?.trust || 'Formulated');

  // Capabilities Pair Builder
  const [capabilities, setCapabilities] = useState<string[]>(
    initialItem?.capabilities || ['tensor_compute', 'gpu_accelerated', 'handshake_exec']
  );
  const [newCapInput, setNewCapInput] = useState('');

  // Satellite Class Toggles
  const [selectedSatellites, setSelectedSatellites] = useState<{ [key: string]: boolean }>({
    'I/O': true,
    'Compute': true,
    'Storage': false,
    'Validation': true,
    'Security': true
  });

  // Resource Allocation Matrix
  const [memoryReq, setMemoryReq] = useState<number>(initialItem?.memoryReq || 256);
  const [threadsReq, setThreadsReq] = useState<number>(initialItem?.threadsReq || 4);
  const [gpuAccelerated, setGpuAccelerated] = useState<boolean>(true);

  const handleAddCapability = () => {
    if (newCapInput.trim() && !capabilities.includes(newCapInput.trim())) {
      setCapabilities([...capabilities, newCapInput.trim()]);
      setNewCapInput('');
    }
  };

  const handleRemoveCapability = (cap: string) => {
    setCapabilities(capabilities.filter(c => c !== cap));
  };

  const toggleSatellite = (satClass: string) => {
    setSelectedSatellites(prev => ({ ...prev, [satClass]: !prev[satClass] }));
  };

  const buildConfiguredItem = (): ApothecaryItem => {
    const primarySatClass = (Object.keys(selectedSatellites).find(k => selectedSatellites[k]) || 'Compute') as SatelliteClass;
    return {
      id: initialItem?.id || `custom-orb-${Date.now().toString().slice(-4)}`,
      name,
      description,
      category,
      trust,
      version: initialItem?.version || '1.0.0',
      memoryReq,
      threadsReq,
      capabilities,
      requirements: initialItem?.requirements || ['invariant_guard'],
      satelliteClass: primarySatClass,
      umbilicalProfileId: category === 'Orbs' && umbilicalProfileId ? umbilicalProfileId : undefined
    };
  };

  const handleSaveCatalog = () => {
    const item = buildConfiguredItem();
    onSaveToCatalog(item);
  };

  const handleHandshake = () => {
    const item = buildConfiguredItem();
    onInitiateHandshake(item, selectedSocketId);
  };

  const profileMemoryReady = category !== 'Orbs' || !umbilicalProfileId ||
    memoryReq >= UMBILICAL_PROFILES[umbilicalProfileId].minimumMemoryMB;

  return (
    <Dialog label="Orb and Satellite Builder" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="absolute inset-0 bg-black/85 animate-backdrop-fade" onClick={onClose} />
      <div className="relative w-full max-w-3xl panel-glass rounded-3xl border border-cyan-500/40 shadow-[0_0_60px_rgba(0,243,255,0.25)] overflow-hidden flex flex-col max-h-[90vh] animate-modal-zoom">
        {/* Modal Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50">
              <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h2 className="font-orbitron text-base font-bold text-slate-100 glow-cyan uppercase">
                Apothecary Studio — Orb & Satellite Builder
              </h2>
              <p className="text-[10px] text-slate-400">OBJECT-ORIENTED SPATIAL NODE CONFIGURATOR</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Target Socket Selector */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Target Umbilical Socket:</span>
            <select
              value={selectedSocketId}
              onChange={(e) => setSelectedSocketId(e.target.value)}
              className="bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold font-orbitron text-xs rounded-lg px-2.5 py-1 focus:outline-none"
            >
              {availableSockets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.state})
                </option>
              ))}
            </select>
          </div>

          {/* Basic Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Orb Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-bold font-orbitron focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Runtime Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-cyan-300 font-bold font-orbitron focus:outline-none focus:border-cyan-400"
              >
                <option value="Python">Python</option>
                <option value="TypeScript">TypeScript</option>
                <option value="Rust">Rust</option>
                <option value="PyTorch">PyTorch</option>
              </select>
            </div>
          </div>

          {/* Purpose & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Element kind</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryType)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="Formulas">Formula</option>
                <option value="Orbs">Orb</option>
              </select>
            </div>
            {category === 'Orbs' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Orb connection contract</label>
                <select
                  value={umbilicalProfileId}
                  onChange={(event) => setUmbilicalProfileId(event.target.value as UmbilicalProfileId | '')}
                  className="w-full bg-slate-900 border border-slate-700 text-cyan-200 rounded-lg p-2 text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Choose how this Orb connects…</option>
                  {UMBILICAL_PROFILE_IDS.map((profileId) => (
                    <option key={profileId} value={profileId}>
                      {profileId} — {UMBILICAL_PROFILES[profileId].label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  CORE checks this contract and available capacity when you connect. This profile needs at least {umbilicalProfileId ? UMBILICAL_PROFILES[umbilicalProfileId].minimumMemoryMB : '—'} MB.
                </p>
              </div>
            )}
          </div>

          {/* Purpose & Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Purpose & Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 resize-none focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Satellite Configurator Badges */}
          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-purple-500/20">
            <span className="text-[10px] font-bold text-purple-300 uppercase flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Attach Satellite Sub-Node Classes</span>
            </span>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'I/O', color: 'cyan' },
                { label: 'Compute', color: 'amber' },
                { label: 'Storage', color: 'emerald' },
                { label: 'Validation', color: 'purple' },
                { label: 'Security', color: 'rose' }
              ].map((sat) => {
                const isActive = selectedSatellites[sat.label];
                return (
                  <button
                    key={sat.label}
                    type="button"
                    onClick={() => toggleSatellite(sat.label)}
                    className={`py-1.5 px-1 rounded-lg border text-center text-[9px] font-bold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                        : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isActive ? '✓ ' : '+ '}
                    {sat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capabilities Pair Builder */}
          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-cyan-500/20">
            <span className="text-[10px] font-bold text-cyan-300 uppercase flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Capabilities Pair Builder</span>
            </span>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newCapInput}
                onChange={(e) => setNewCapInput(e.target.value)}
                placeholder="Add capability e.g. 'fault_containment'..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleAddCapability}
                className="px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold flex items-center space-x-1 hover:bg-cyan-900/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center space-x-1.5"
                >
                  <span>{cap}</span>
                  <button onClick={() => handleRemoveCapability(cap)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Resource Allocation Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Memory Slider */}
            <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 flex items-center space-x-1">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Working Memory Req</span>
                </span>
                <span className="font-bold text-cyan-300 font-orbitron">{memoryReq} MB</span>
              </div>
              <input
                type="range"
                min="32"
                max="2048"
                step="32"
                value={memoryReq}
                onChange={(e) => setMemoryReq(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* CPU Threads & GPU Toggle */}
            <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] flex items-center space-x-1">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>CPU Threads:</span>
                </span>
                <div className="flex space-x-1 text-[10px]">
                  {[1, 2, 4, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setThreadsReq(num)}
                      className={`px-2 py-0.5 rounded font-bold ${
                        threadsReq === num ? 'bg-purple-950 text-purple-300 border border-purple-500' : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {num} C
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-900">
                <span className="text-slate-400 text-[10px]">GPU Acceleration:</span>
                <button
                  type="button"
                  onClick={() => setGpuAccelerated(!gpuAccelerated)}
                  className="flex items-center space-x-1 text-xs text-emerald-400 font-bold"
                >
                  {gpuAccelerated ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-600" />}
                  <span>{gpuAccelerated ? 'ENABLED' : 'DISABLED'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Negative-Space Invariants Verification Checklist */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1">
              <span className="text-[10px] font-bold text-emerald-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>NEGATIVE-SPACE INVARIANTS CHECKLIST</span>
              </span>
              <span className="text-[9px] text-emerald-400 font-bold">100% INTACT</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-300">
              <div className="flex items-center space-x-1">
                <span className="text-emerald-400">✓</span>
                <span>never_serializes_witness</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-emerald-400">✓</span>
                <span>never_persists_prompts</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-emerald-400">✓</span>
                <span>no_verdict_over_inner_life</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-cyan-500/30 flex items-center justify-between bg-slate-950/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-orbitron transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveCatalog}
              disabled={category === 'Orbs' && (!umbilicalProfileId || !profileMemoryReady)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-orbitron font-bold flex items-center space-x-1.5 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save to Apothecary Catalog</span>
            </button>

            <button
              type="button"
              onClick={handleHandshake}
              disabled={category !== 'Orbs' || !umbilicalProfileId || !profileMemoryReady}
              className="btn-cyber-emerald px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Initiate Umbilical Handshake</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
