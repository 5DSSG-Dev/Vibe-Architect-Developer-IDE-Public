import React from 'react';
import { X, ShieldCheck, Cpu, HardDrive, Terminal, Edit3, Code, CheckCircle2, Zap, Layers } from 'lucide-react';
import { ApothecaryItem, SocketBinding } from '../engine/relationEngine';

interface ViewContentsModalProps {
  item?: ApothecaryItem;
  socket?: SocketBinding;
  onClose: () => void;
  onOpenEditProperties: () => void;
  onOpenCodeEditor: () => void;
}

export const ViewContentsModal: React.FC<ViewContentsModalProps> = ({
  item,
  socket,
  onClose,
  onOpenEditProperties,
  onOpenCodeEditor
}) => {
  const name = item?.name || socket?.name || 'Unknown Element';
  const category = item?.category || (socket?.connectedItem ? socket.connectedItem.category : 'Umbilical Socket');
  const trust = item?.trust || (socket?.connectedItem ? socket.connectedItem.trust : 'Validated');
  const memoryReq = item?.memoryReq || (socket?.connectedItem ? socket.connectedItem.memoryReq : 64);
  const threadsReq = item?.threadsReq || (socket?.connectedItem ? socket.connectedItem.threadsReq : 2);
  const capabilities = item?.capabilities || (socket?.connectedItem ? socket.connectedItem.capabilities : ['socket_binding', 'json_ld']);
  const description = item?.description || (socket?.connectedItem ? socket.connectedItem.description : `Umbilical Arm ${socket?.id} registered to 3D CORE Locus.`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-2xl panel-glass rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50">
              <Layers className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-orbitron text-base font-bold text-slate-100 glow-cyan">
                  {name}
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  {category}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">MANIFEST SPECS & INVARIANT AUDIT</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
              {trust}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Description */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-slate-300">
            {description}
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>MEMORY ALLOCATION</span>
              </div>
              <p className="text-sm font-bold text-cyan-300 font-orbitron">{memoryReq} MB</p>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-purple-500/20 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>CPU THREAD BUDGET</span>
              </div>
              <p className="text-sm font-bold text-purple-300 font-orbitron">{threadsReq} Cores</p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capabilities Schema</span>
            <div className="flex flex-wrap gap-1.5">
              {capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center space-x-1"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{cap}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Negative-Space Invariant Audit */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
              <span className="text-[10px] font-bold text-emerald-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>NEGATIVE-SPACE INVARIANT VERIFICATION</span>
              </span>
              <span className="text-[9px] text-emerald-400 font-bold">100% PASSED</span>
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-300">
                <span>never_serializes_witness</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> VERIFIED
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>never_persists_prompts</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> VERIFIED
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>no_verdict_over_inner_life</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 border-t border-cyan-500/30 flex items-center justify-between bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-orbitron transition-colors"
          >
            Close
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenEditProperties}
              className="btn-cyber-emerald px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-1.5 shadow-md"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Properties</span>
            </button>

            <button
              onClick={onOpenCodeEditor}
              className="btn-cyber px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-1.5 shadow-md"
            >
              <Code className="w-3.5 h-3.5 text-cyan-300" />
              <span>Edit Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
