import React, { useRef, useState } from 'react';
import { X, Code, Save, CheckCircle2, AlertTriangle, FileCode2, Send, Square } from 'lucide-react';
import { ApothecaryItem, SocketBinding, ensureElementCodeFrame } from '../engine/relationEngine';
import { Dialog } from './Dialog';
import { describeShortfall, luminaryApi, readDemoKey, readLevel } from '../luminary/client';
import { composeElementCodePrompt, lineDiff, readElementCodeProposal } from '../luminary/elementCode';
import { recordExchange, textEvidence } from '../luminary/record';

interface CodeEditorOverlayModalProps {
  item?: ApothecaryItem;
  socket?: SocketBinding;
  onClose: () => void;
  onSaveCodeFrame: (updatedItem: ApothecaryItem) => void;
  /** The Apothecary, so the Luminary can be told about this Element's Satellites or Actuators (P25). */
  catalog?: readonly ApothecaryItem[];
  mode?: string;
}

type Proposal = { code: string; explanation: string; modelId: string; sha256: string };

export const CodeEditorOverlayModal: React.FC<CodeEditorOverlayModalProps> = ({
  item,
  socket,
  onClose,
  onSaveCodeFrame,
  catalog = [],
  mode = 'DESIGN'
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

  // Ask the Luminary (STP-0002 P25): the reply is a proposal shown beside the current code. Only
  // Accept puts it in the editor, and only the editor's Save changes the Element.
  const [request, setRequest] = useState('');
  const [asking, setAsking] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [luminaryNote, setLuminaryNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const keep = async (event: Parameters<typeof recordExchange>[0], detail: Parameters<typeof recordExchange>[1]) => {
    const reason = await recordExchange(event, { ...detail, elementId: targetItem.id, codeFrame: targetItem.codeFrame.fileName });
    if (reason) setLuminaryNote(`This was not written to the evidence record: ${reason}`);
  };

  const askLuminary = async () => {
    const trimmed = request.trim();
    if (!trimmed || asking) return;
    const demoKey = readDemoKey();
    if (!demoKey) {
      setLuminaryNote('Open the Luminary and enter the demo key first.');
      return;
    }
    const level = readLevel();
    const controller = new AbortController();
    abortRef.current = controller;
    setAsking(true);
    setProposal(null);
    setLuminaryNote(null);
    const prompt = composeElementCodePrompt({ item: targetItem, catalog, frame: targetItem.codeFrame, source: sourceText, request: trimmed, level, mode });
    const asked = await textEvidence(trimmed);
    await keep('asked', { excerpt: asked.excerpt, sha256: asked.sha256, chars: asked.chars, mode, level, context: ['This Element', 'Element code frame'] });
    try {
      const result = await luminaryApi.ask(demoKey, prompt, controller.signal);
      if (!result.ok) {
        setLuminaryNote(describeShortfall(result.shortfall));
        await keep('shortfall', { kind: result.kind, code: result.shortfall.code });
        return;
      }
      const { reply, lineage } = result.value;
      const content = await textEvidence(reply.content);
      await keep('replied', { modelId: reply.modelId, excerpt: content.excerpt, sha256: content.sha256, chars: content.chars, checked: lineage?.some((entry) => entry.stage === 'prism') ?? false });
      const read = readElementCodeProposal(reply.content);
      if (!read.ok) {
        setLuminaryNote(read.reason);
        return;
      }
      const code = await textEvidence(read.code);
      setProposal({ code: read.code, explanation: read.explanation, modelId: reply.modelId, sha256: code.sha256 });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setLuminaryNote('Stopped. Nothing from this request is shown.');
        await keep('stopped', {});
      } else {
        setLuminaryNote('The request failed before any reply arrived.');
        await keep('shortfall', { kind: 'unreachable', code: 'request_failed' });
      }
    } finally {
      abortRef.current = null;
      setAsking(false);
    }
  };

  const decide = async (accept: boolean) => {
    if (!proposal) return;
    if (accept) setSourceText(proposal.code);
    setProposal(null);
    setLuminaryNote(accept ? 'Accepted into the editor. Press Save Code Frame to keep it.' : 'Declined. The code is unchanged.');
    await keep(accept ? 'offering_accepted' : 'offering_declined', { modelId: proposal.modelId, sha256: proposal.sha256 });
  };

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

        {/* Ask the Luminary (P25) */}
        <div className="border-t border-amber-400/30 bg-slate-950/90 p-3 space-y-2">
          {proposal && (
            <div className="rounded-xl border border-amber-400/40 bg-slate-900/70 p-2 space-y-2" aria-label="The Luminary's proposal">
              {proposal.explanation && <p className="text-[11px] text-amber-100 whitespace-pre-wrap leading-relaxed">{proposal.explanation}</p>}
              <pre className="max-h-48 overflow-auto rounded-lg bg-[#090d13] p-2 text-[11px] leading-5 font-mono" aria-label="Changes to the code">
                {lineDiff(sourceText, proposal.code).map((line, index) => (
                  <div
                    key={index}
                    className={line.kind === 'added' ? 'bg-emerald-900/40 text-emerald-200' : line.kind === 'removed' ? 'bg-rose-900/40 text-rose-200 line-through decoration-rose-400/60' : 'text-slate-400'}
                  >
                    {line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '- ' : '  '}{line.text}
                  </div>
                ))}
              </pre>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 mr-auto">Written by {proposal.modelId}. Nothing changes until you accept.</span>
                <button type="button" onClick={() => void decide(false)} className="px-3 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300">Decline</button>
                <button type="button" onClick={() => void decide(true)} className="px-3 py-1 rounded-lg text-[11px] border border-amber-400/60 text-amber-100 hover:bg-amber-900/30">Accept</button>
              </div>
            </div>
          )}
          {luminaryNote && <p role="status" className="text-[10px] text-amber-200/90">{luminaryNote}</p>}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void askLuminary();
            }}
          >
            <img src="/assets/luminary/luminary-codeglass-96.webp" alt="" aria-hidden="true" className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(252,211,77,0.45)]" />
            <textarea
              rows={2}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Ask the Luminary: what should this Element do?"
              aria-label="Ask the Luminary to write this Element's code"
              className="flex-1 min-w-0 bg-slate-900/90 border border-slate-700 rounded-lg p-1.5 text-[11px] text-slate-200 resize-none focus:outline-none focus:border-amber-400/60"
            />
            {asking ? (
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop" title="Stop" className="p-2 rounded-lg border border-rose-400/50 text-rose-200 hover:bg-rose-900/40">
                <Square className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button type="submit" disabled={!request.trim()} aria-label="Ask the Luminary" title="Ask the Luminary" className="p-2 rounded-lg border border-amber-400/50 text-amber-100 hover:bg-amber-900/30 disabled:opacity-40">
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
          {asking && <p className="text-[10px] text-slate-400">The Luminary is writing…</p>}
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
