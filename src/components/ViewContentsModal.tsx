import React, { useState } from 'react';
import { X, Cpu, HardDrive, Edit3, Code, Zap, Layers, Trash2 } from 'lucide-react';
import { ApothecaryItem, SocketBinding, ensureElementCodeFrame } from '../engine/relationEngine';
import { Dialog } from './Dialog';

interface ViewContentsModalProps {
  item?: ApothecaryItem;
  socket?: SocketBinding;
  onClose: () => void;
  onOpenEditProperties: () => void;
  onOpenCodeEditor: () => void;
  /** Present only when the Element is placed on the workspace and can be taken off it. */
  removal?: { hostName?: string; tethered: string[]; onRemove: () => void };
}

export const ViewContentsModal: React.FC<ViewContentsModalProps> = ({
  item,
  socket,
  onClose,
  onOpenEditProperties,
  onOpenCodeEditor,
  removal
}) => {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const targetItem = ensureElementCodeFrame(item || socket?.connectedItem || {
    id: socket?.id || 'socket-alpha',
    name: socket?.name || 'Umbilical Socket',
    category: 'Formulas',
    trust: 'Validated',
    version: '1.0.0',
    memoryReq: 64,
    threadsReq: 2,
    capabilities: ['socket_binding', 'json_ld'],
    requirements: ['invariant_guard'],
    description: `Umbilical Arm ${socket?.id} registered to 3D CORE Locus.`
  });
  const name = targetItem.name;
  const category = targetItem.category;
  const trust = targetItem.trust;
  const memoryReq = targetItem.memoryReq;
  const threadsReq = targetItem.threadsReq;
  const capabilities = targetItem.capabilities;
  const description = targetItem.description;
  const codeFrame = targetItem.codeFrame;

  return (
    <Dialog label="Element information" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="absolute inset-0 bg-black/80 animate-backdrop-fade" />
      <div className="relative w-full max-w-2xl panel-glass rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] overflow-hidden flex flex-col max-h-[85vh] animate-modal-zoom">
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
              <p className="text-[10px] text-slate-400">Element information</p>
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
                <span>MEMORY NEEDED</span>
              </div>
              <p className="text-sm font-bold text-cyan-300 font-orbitron">{memoryReq} MB</p>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-purple-500/20 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>PROCESSING THREADS</span>
              </div>
              <p className="text-sm font-bold text-purple-300 font-orbitron">{threadsReq} Cores</p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">What this Element can do</span>
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

          <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code details</span>
            <p className="text-[11px] text-slate-200">{codeFrame.fileName}</p>
            <p className="text-[10px] text-slate-400">{codeFrame.language} · Entry point: {codeFrame.entrypoint}</p>
          </div>
        </div>

        {/* Remove asks first, in plain words, and names everything that comes off with it */}
        {removal && confirmingRemove && (
          <div className="px-5 py-4 border-t border-rose-500/40 bg-rose-950/30 text-xs space-y-3" role="alert">
            <p className="text-rose-100 leading-relaxed">
              {removal.hostName
                ? `Remove ${name} from ${removal.hostName}?`
                : `Remove ${name} from the CORE? Its connection is closed properly, and its memory and threads go back to the CORE.`}
              {removal.tethered.length > 0 && ` ${removal.tethered.join(', ')} ${removal.tethered.length === 1 ? 'is' : 'are'} tethered to it and will come off too.`}
            </p>
            <p className="text-[10px] text-slate-400">It stays in the Apothecary, so you can attach it again later. Other connection history stays in the record.</p>
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setConfirmingRemove(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-orbitron transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={removal.onRemove}
                className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-400/60 text-rose-100 text-xs font-orbitron font-bold transition-colors"
              >
                Yes, remove
              </button>
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="p-4 border-t border-cyan-500/30 flex items-center justify-between bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-orbitron transition-colors"
          >
            Close
          </button>

          {removal && !confirmingRemove && (
            <button
              onClick={() => setConfirmingRemove(true)}
              className="ml-2 mr-auto px-4 py-2 rounded-xl bg-slate-900 border border-rose-500/40 hover:bg-rose-950/50 text-rose-300 text-xs font-orbitron flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenEditProperties}
              className="btn-cyber-emerald px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-1.5 shadow-md"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={onOpenCodeEditor}
              className="btn-cyber px-4 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-1.5 shadow-md"
            >
              <Code className="w-3.5 h-3.5 text-cyan-300" />
              <span>View Code</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
