import React, { useState } from 'react';
import { Check, CheckCircle2, Copy, Download, FileCheck2, GitBranch, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { parseReply, type ExplanationLevel, type OfferingBlock } from '../luminary/blocks';
import type { CodingTask, LineageEntry } from '../luminary/client';
import { createWorkRequest, executeWorkRequest, verifyWorkLedger, type WorkExecutionResult } from '../engine/workRequestRuntime';
import { appendWorkRequestEvidence } from '../engine/evidenceArchive';
import { recordExchange } from '../luminary/record';

/**
 * The parts of the Luminary's Full Form that show what it said and offered (STP-0002 P19):
 * replies at the Architect's explanation level, Offering cards and coding-task cards. Every
 * card waits for the Architect; a card left alone is a no.
 */

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
      }}
      className="flex items-center gap-1 text-[9px] text-slate-300 hover:text-amber-200"
      aria-label="Copy code"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const CodeBlock: React.FC<{ code: string; language: string; level: ExplanationLevel }> = ({ code, language, level }) => {
  // At Plain, code is there when asked for and folded otherwise.
  const [open, setOpen] = useState(level !== 'plain');
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-950/90">
      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[9px] text-slate-400">
        <button type="button" onClick={() => setOpen((value) => !value)} className="hover:text-amber-200" aria-expanded={open}>
          {open ? 'Hide code' : 'Show code'}{language ? ` · ${language}` : ''}
        </button>
        <CopyButton text={code} />
      </div>
      {open && <pre className="p-2 text-[10px] leading-snug text-slate-200 overflow-x-auto"><code>{code}</code></pre>}
    </div>
  );
};

const OfferingCard: React.FC<{ offering: OfferingBlock }> = ({ offering }) => {
  const [state, setState] = useState<'open' | 'running' | 'done' | 'declined' | 'failed'>('open');
  const [result, setResult] = useState<WorkExecutionResult | null>(null);
  const [receipt, setReceipt] = useState<{ ledgerVerified: boolean; evidenceHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setState('running');
    setError(null);
    try {
      // The Luminary's Offering becomes a Work Request only on the Architect's accept; the
      // existing Conductor -> Dispatcher Orb -> Constructor Satellite -> Docs Builder chain makes it.
      const request = createWorkRequest({
        intent: offering.purpose,
        requestedCapability: 'document.markdown.compose',
        scope: ['workspace:artifact:markdown'],
        impact: 'reversible_local_change',
        authority: { requestedBy: 'vibe-luminary', approvedBy: 'local-architect', approvalRef: 'interactive:luminary-offering-accept' },
        payload: { title: offering.title, purpose: offering.purpose, sections: offering.sections },
      });
      const execution = await executeWorkRequest(request);
      setResult(execution);
      const ledgerVerified = await verifyWorkLedger(execution.ledger);
      if (!ledgerVerified) throw new Error('The Work Request ledger did not verify, so nothing was kept.');
      const persisted = await appendWorkRequestEvidence(execution);
      setReceipt({ ledgerVerified, evidenceHash: persisted.record.recordHash });
      setState('done');
      const unrecorded = await recordExchange('offering_accepted', { title: offering.title, workRequestId: execution.workRequest.workRequestId, receiptHash: persisted.record.recordHash });
      if (unrecorded) setError(`The receipt is kept, but the accept was not written to the evidence record: ${unrecorded}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The Work Request did not complete.');
      setState('failed');
    }
  };

  const download = () => {
    if (!result?.artifact) return;
    const url = URL.createObjectURL(new Blob([result.artifact.content], { type: result.artifact.mediaType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.artifact.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-violet-500/40 bg-violet-950/30 p-2 space-y-1.5" role="group" aria-label={`Offering: ${offering.title}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-200"><FileCheck2 className="w-3 h-3" />Offering · {offering.title}</div>
      <p className="text-[10px] text-slate-300">{offering.purpose}</p>
      <ul className="text-[9px] text-slate-400 list-disc pl-4">
        {offering.sections.map((section) => <li key={section.heading}>{section.heading}</li>)}
      </ul>
      {state === 'open' && (
        <div className="flex gap-1.5">
          <button type="button" onClick={accept} className="px-2 py-1 rounded-md text-[10px] bg-violet-900/70 border border-violet-400/50 text-violet-100 hover:bg-violet-800/70">Accept</button>
          <button type="button" onClick={async () => { setState('declined'); const unrecorded = await recordExchange('offering_declined', { title: offering.title }); if (unrecorded) setError(`The decline was not written to the evidence record: ${unrecorded}`); }} className="px-2 py-1 rounded-md text-[10px] border border-slate-600 text-slate-300 hover:text-slate-100">Decline</button>
        </div>
      )}
      {state === 'running' && <p className="flex items-center gap-1 text-[10px] text-violet-200"><Loader2 className="w-3 h-3 animate-spin" />Running the Work Request…</p>}
      {state === 'declined' && <p className="text-[10px] text-slate-400">Declined. Nothing was made.</p>}
      {state === 'failed' && <p className="text-[10px] text-rose-300" role="alert">{error}</p>}
      {state === 'done' && result && receipt && (
        <div className="space-y-1 text-[9px] text-slate-300">
          <p className="flex items-center gap-1 text-emerald-300"><CheckCircle2 className="w-3 h-3" />Made by the Docs Builder · {result.state} · ledger verified</p>
          <p className="break-all text-cyan-200">Receipt {receipt.evidenceHash}</p>
          {result.artifact && (
            <button type="button" onClick={download} className="flex items-center gap-1 text-[10px] text-violet-200 hover:text-violet-100"><Download className="w-3 h-3" />Download {result.artifact.fileName}</button>
          )}
        </div>
      )}
    </div>
  );
};

export const TaskCard: React.FC<{
  task: CodingTask;
  level: ExplanationLevel;
  onDecide: (id: string, decision: 'accept' | 'decline') => Promise<string | null>;
}> = ({ task, level, onDecide }) => {
  const [showDiff, setShowDiff] = useState(level === 'technical');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allPassed = task.checks.every((check) => check.ok);
  // Accept is offered only once the whole change has been shown, and never for one too large to show whole.
  const [seenWhole, setSeenWhole] = useState(level === 'technical');
  const canAccept = task.diffComplete && seenWhole;

  const decide = async (decision: 'accept' | 'decline') => {
    setBusy(true);
    setError(await onDecide(task.id, decision));
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-2 space-y-1.5" role="group" aria-label="Proposed code change">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-200"><GitBranch className="w-3 h-3" />Proposed change · on its own branch</div>
      <p className="text-[10px] text-slate-200">{task.summary}</p>
      <p className="text-[9px] text-slate-400">Files: {task.files.join(', ')}</p>
      <ul className="space-y-0.5" aria-label="Checks">
        {task.checks.map((check) => (
          <li key={check.name} className={`flex items-center gap-1 text-[9px] ${check.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
            {check.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{check.name}: {check.ok ? 'passed' : 'did not pass'}
          </li>
        ))}
      </ul>
      {!allPassed && level === 'plain' && <p className="text-[9px] text-rose-200">A check did not pass. The change can still be declined, or reviewed in Technical.</p>}
      <button type="button" onClick={() => { setShowDiff((value) => !value); setSeenWhole(true); }} className="text-[9px] text-cyan-300 hover:text-cyan-100" aria-expanded={showDiff}>
        {showDiff ? 'Hide the full changes' : 'Show the full changes'}
      </button>
      {!task.diffComplete && <p className="text-[9px] text-rose-200" role="alert">This change is too large to show whole, so it cannot be accepted. Decline it and ask for it in smaller parts.</p>}
      {showDiff && (
        <pre className="max-h-80 overflow-auto rounded border border-slate-800 bg-slate-950 p-1.5 text-[9px] leading-snug text-slate-300" aria-label="The full changes">{task.diff}{task.diffComplete ? '' : '\n\n[The rest of this change is not shown.]'}{level === 'technical' ? task.checks.filter((check) => !check.ok).map((check) => `\n\n${check.name}\n${check.output}`).join('') : ''}</pre>
      )}
      {task.status === 'proposed' && task.diffComplete && !seenWhole && <p className="text-[9px] text-slate-400">Open the full changes to review them before accepting.</p>}
      {task.status === 'proposed' ? (
        <div className="flex gap-1.5">
          <button type="button" disabled={busy || !canAccept} onClick={() => decide('accept')} className="px-2 py-1 rounded-md text-[10px] bg-cyan-900/70 border border-cyan-400/50 text-cyan-100 hover:bg-cyan-800/70 disabled:opacity-50">Accept into the project</button>
          <button type="button" disabled={busy} onClick={() => decide('decline')} className="px-2 py-1 rounded-md text-[10px] border border-slate-600 text-slate-300 hover:text-slate-100 disabled:opacity-50">Decline</button>
        </div>
      ) : (
        <p className={`text-[10px] ${task.status === 'accepted' ? 'text-emerald-300' : 'text-slate-400'}`}>
          {task.status === 'accepted' ? 'Accepted. The change joined the project and is in the ledger.' : 'Declined. Nothing joined the project; the branch is kept for the record.'}
        </p>
      )}
      {error && <p className="text-[10px] text-rose-300" role="alert">{error}</p>}
    </div>
  );
};

/** One governed Luminary reply, drawn at the Architect's explanation level. */
export const ReplyView: React.FC<{ content: string; modelId: string; lineage?: LineageEntry[]; level: ExplanationLevel; forTask?: boolean }> = ({ content, modelId, lineage, level, forTask }) => {
  const checked = lineage?.some((entry) => entry.stage === 'prism') ?? false;
  const revised = lineage?.some((entry) => entry.stage === 'ids') ?? false;
  return (
    <div className="space-y-1.5">
      {parseReply(content).map((part, index) => {
        switch (part.kind) {
          case 'text': return <p key={index} className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">{part.text}</p>;
          case 'code': return <CodeBlock key={index} code={part.code} language={part.language} level={level} />;
          case 'offering': return <OfferingCard key={index} offering={part.offering} />;
          case 'change': return forTask ? null : <p key={index} className="text-[10px] text-cyan-200">This reply proposes a code change ({part.change.files.length} file{part.change.files.length === 1 ? '' : 's'}). Changes are made through a coding task, so they land on the Luminary's own branch first.</p>;
          case 'malformed': return <p key={index} className="text-[10px] text-rose-300">An {part.block} in this reply could not be read, so it is not shown: {part.reason}</p>;
        }
      })}
      <p className="flex items-center gap-1 text-[9px] text-slate-500">
        {checked && <ShieldCheck className="w-3 h-3 text-emerald-400" aria-label="Checked by the gauge" />}
        {checked ? 'checked' : 'unchecked'} · {modelId}{revised ? ' · revised once after an IDS pass' : ''}
      </p>
    </div>
  );
};
