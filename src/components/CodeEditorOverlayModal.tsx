import React, { useState } from 'react';
import { X, Code, Save, CheckCircle2, AlertTriangle, FileCode2 } from 'lucide-react';
import { ApothecaryItem, SocketBinding, ensureElementCodeFrame } from '../engine/relationEngine';
import { Dialog } from './Dialog';

interface CodeEditorOverlayModalProps {
  item?: ApothecaryItem;
  socket?: SocketBinding;
  onClose: () => void;
  onSaveCodeFrame: (updatedItem: ApothecaryItem) => void;
}

export const CodeEditorOverlayModal: React.FC<CodeEditorOverlayModalProps> = ({
  item,
  socket,
  onClose,
  onSaveCodeFrame
}) => {
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
    description: `Umbilical Arm registered to 3D CORE Locus.`
  });

  const [sourceText, setSourceText] = useState<string>(targetItem.codeFrame.source);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveCode = async () => {
    try {
      if (!sourceText.trim()) {
        throw new Error('Code frame cannot be empty.');
      }
      if (targetItem.codeFrame.language === 'JSON') {
        JSON.parse(sourceText);
      }

      setValidationError(null);

      let updatedItem: ApothecaryItem = {
        ...targetItem,
        codeFrame: {
          ...targetItem.codeFrame,
          source: sourceText,
          updatedAt: new Date().toISOString()
        }
      };

      onSaveCodeFrame(updatedItem);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      setValidationError(err.message || 'Code frame validation failed.');
    }
  };

  const lineCount = sourceText.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <Dialog label="Element Code Editor" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="absolute inset-0 bg-black/85 animate-backdrop-fade" onClick={onClose} />
      <div className="relative w-full max-w-4xl panel-glass rounded-3xl border border-cyan-500/50 shadow-[0_0_60px_rgba(0,243,255,0.25)] overflow-hidden flex flex-col h-[85vh] animate-modal-zoom">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50">
              <Code className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-orbitron text-base font-bold text-slate-100 glow-cyan">
                  ELEMENT CODE FRAME
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  {targetItem.codeFrame.fileName}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {targetItem.name} • container locked • source frame editable
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {targetItem.codeFrame.language} • {targetItem.codeFrame.entrypoint}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Alert Banners */}
        {validationError && (
          <div className="px-4 py-2 bg-rose-950/90 border-b border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-bold flex-1">{validationError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="px-4 py-2 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-bold flex-1">
              CODE FRAME SAVED. Element container remained unchanged.
            </span>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden bg-[#0d1117]">
          {/* Line Numbers Gutter */}
          <div className="w-12 bg-[#090d13] border-r border-slate-800/80 py-3 text-slate-600 text-[11px] text-right pr-3 font-mono select-none">
            {lineNumbers.map((num) => (
              <div key={num} className="leading-5">
                {num}
              </div>
            ))}
          </div>

          {/* Raw Textarea Code Editor */}
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-[#0d1117] p-3 text-xs text-cyan-300/90 font-mono leading-5 resize-none focus:outline-none selection:bg-cyan-900/60"
          />
        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-cyan-500/30 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Editing functional source only; manifest properties are read-only here.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-orbitron transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleSaveCode}
              className="btn-cyber px-5 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-2 shadow-md"
            >
              <Save className="w-4 h-4 text-cyan-300" />
              <span>Save Code Frame</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
