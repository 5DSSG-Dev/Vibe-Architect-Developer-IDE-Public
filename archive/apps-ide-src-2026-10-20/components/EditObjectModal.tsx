import React, { useState } from 'react';
import { X, Edit3, ShieldCheck, Cpu, HardDrive, Save, Code } from 'lucide-react';
import { ApothecaryItem, SocketBinding, TrustBadgeType } from '../engine/relationEngine';

interface EditObjectModalProps {
  item?: ApothecaryItem;
  socket?: SocketBinding;
  onClose: () => void;
  onSaveProperties: (updatedItem: ApothecaryItem) => void;
  onOpenCodeEditor: () => void;
}

export const EditObjectModal: React.FC<EditObjectModalProps> = ({
  item,
  socket,
  onClose,
  onSaveProperties,
  onOpenCodeEditor
}) => {
  const initialItem: ApothecaryItem = item || socket?.connectedItem || {
    id: socket?.id || 'socket-alpha',
    name: socket?.name || 'Umbilical Socket',
    category: 'Formulas',
    trust: 'Validated',
    version: '1.0.0',
    memoryReq: 64,
    threadsReq: 2,
    capabilities: ['socket_binding', 'json_ld'],
    requirements: ['invariant_guard'],
    description: `Umbilical Arm registered to 3D CORE Locus.`
  };

  const [name, setName] = useState(initialItem.name);
  const [description, setDescription] = useState(initialItem.description);
  const [memoryReq, setMemoryReq] = useState(initialItem.memoryReq);
  const [threadsReq, setThreadsReq] = useState(initialItem.threadsReq);
  const [trust, setTrust] = useState<TrustBadgeType>(
    initialItem.trust || 'Validated'
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ApothecaryItem = {
      ...initialItem,
      name,
      description,
      memoryReq,
      threadsReq,
      trust
    };
    onSaveProperties(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-2xl panel-glass rounded-3xl border border-emerald-500/40 shadow-[0_0_50px_rgba(0,255,157,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/30 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50">
              <Edit3 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-orbitron text-base font-bold text-slate-100 glow-emerald">
                PROPERTY INSPECTOR & EDITOR
              </h2>
              <p className="text-[10px] text-slate-400">NON-CODING ARCHITECT PARAMETER TUNING</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Element Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Element Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-bold font-orbitron focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 resize-none focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Memory Allocation Slider (32 MB to 2048 MB) */}
          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-cyan-500/20">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Memory Allocation Slider</span>
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

          {/* CPU Thread Selection */}
          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-purple-500/20">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>CPU Thread Budget</span>
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Low', cores: 1 },
                { label: 'Medium', cores: 2 },
                { label: 'High', cores: 4 },
                { label: 'Dedicated', cores: 8 }
              ].map((opt) => (
                <button
                  key={opt.cores}
                  type="button"
                  onClick={() => setThreadsReq(opt.cores)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    threadsReq === opt.cores
                      ? 'bg-purple-950 text-purple-300 border-purple-500 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold">{opt.label}</p>
                  <p className="text-[9px]">{opt.cores} Cores</p>
                </button>
              ))}
            </div>
          </div>

          {/* Trust State Selector */}
          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-emerald-500/20">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trust State Lifecycle</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['Draft', 'Experimental', 'Formulated', 'Validated', 'Canonical'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrust(t)}
                  className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition-all ${
                    trust === t
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
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
                onClick={onOpenCodeEditor}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-orbitron font-bold flex items-center space-x-1.5"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Edit Code</span>
              </button>

              <button
                type="submit"
                className="btn-cyber-emerald px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-1.5 shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Re-Validate Contract</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
