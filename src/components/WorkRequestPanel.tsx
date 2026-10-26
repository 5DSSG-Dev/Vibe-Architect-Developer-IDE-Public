import React, { useState } from 'react';
import { CheckCircle2, Download, FileCheck2, Loader2, ShieldCheck } from 'lucide-react';
import {
  createWorkRequest,
  executeWorkRequest,
  verifyWorkLedger,
  type WorkExecutionResult
} from '../engine/workRequestRuntime';
import { appendWorkRequestEvidence, exportVerifiedEvidenceArchive } from '../engine/evidenceArchive';

export const WorkRequestPanel: React.FC = () => {
  const [intent, setIntent] = useState('Create a bounded implementation record for this Lab session.');
  const [result, setResult] = useState<WorkExecutionResult | null>(null);
  const [ledgerVerified, setLedgerVerified] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceHash, setEvidenceHash] = useState<string | null>(null);

  const handleEmploy = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setLedgerVerified(false);
    setEvidenceHash(null);
    try {
      const request = createWorkRequest({
        intent,
        requestedCapability: 'document.markdown.compose',
        scope: ['workspace:artifact:markdown'],
        impact: 'reversible_local_change',
        authority: {
          requestedBy: 'local-architect',
          approvedBy: 'local-architect',
          approvalRef: 'interactive:employ-docs-builder'
        },
        payload: {
          title: 'AEGIS Work Request Record',
          purpose: intent,
          sections: [
            {
              heading: 'Execution Chain',
              body: 'Conductor → Dispatcher Orb → Constructor Satellite → Docs Builder Actuator; verified evidence returns through Satellite → Orb → Conductor.'
            },
            {
              heading: 'Bounded Outcome',
              body: 'A Markdown artifact was created in memory, hashed, and independently verified. Download remains an explicit local user action.'
            }
          ]
        }
      });
      const execution = await executeWorkRequest(request);
      setResult(execution);
      const ledgerIsValid = await verifyWorkLedger(execution.ledger);
      setLedgerVerified(ledgerIsValid);
      if (!ledgerIsValid) throw new Error('Work Request ledger failed verification and was not persisted.');
      const persisted = await appendWorkRequestEvidence(execution);
      setEvidenceHash(persisted.record.recordHash);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Work Request failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportEvidence = async () => {
    try {
      const content = await exportVerifiedEvidenceArchive();
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'aegis-vibe-architect-evidence-v1.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Evidence export failed.');
    }
  };

  const handleDownload = () => {
    if (!result?.artifact) return;
    const url = URL.createObjectURL(new Blob([result.artifact.content], { type: result.artifact.mediaType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.artifact.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-slate-950/80 border border-violet-500/35 rounded-xl p-3 space-y-2.5 shadow-md">
      <div className="flex items-center justify-between border-b border-violet-500/20 pb-1.5">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-300" />
          <span className="text-[10px] font-mono font-bold text-slate-100 uppercase tracking-wider">Work Request</span>
        </div>
        <span className="text-[9px] font-mono text-violet-300">Bounded vertical slice</span>
      </div>

      <textarea
        rows={2}
        value={intent}
        onChange={(event) => setIntent(event.target.value)}
        aria-label="Work Request intent"
        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-2 text-[10px] text-slate-200 focus:outline-none focus:border-violet-400/60 font-mono resize-none"
      />

      <button
        type="button"
        onClick={handleEmploy}
        disabled={isRunning || !intent.trim()}
        className="w-full py-1.5 rounded-lg text-[10px] font-orbitron font-semibold flex items-center justify-center space-x-2 bg-violet-950/70 border border-violet-500/50 text-violet-200 hover:bg-violet-900/70 disabled:opacity-50"
      >
        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
        <span>{isRunning ? 'Executing Work Request…' : 'Employ Docs Builder Actuator'}</span>
      </button>

      {error && <p className="text-[9px] text-rose-300" role="alert">{error}</p>}

      {result && (
        <div className="space-y-2 text-[9px] font-mono">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{result.state}</span>
            <span>{ledgerVerified ? 'ledger verified' : 'ledger invalid'}</span>
          </div>
          {evidenceHash && (
            <div className="rounded border border-cyan-500/30 bg-cyan-950/30 p-1.5 text-cyan-200 break-all">
              local evidence persisted · {evidenceHash}
            </div>
          )}
          <ol className="space-y-1 text-slate-400" aria-label="Work Request evidence chain">
            {result.ledger.map((entry) => (
              <li key={entry.eventId} className="flex gap-1.5">
                <span className="text-violet-300">{entry.sequence}.</span>
                <span>{entry.stage.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ol>
          {result.artifact && (
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-1.5 hover:bg-emerald-950/40"
              >
                <Download className="w-3 h-3" />
                Download verified artifact
              </button>
              {evidenceHash && (
                <button
                  type="button"
                  onClick={handleExportEvidence}
                  className="w-full py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-1.5 hover:bg-cyan-950/40"
                >
                  <Download className="w-3 h-3" />
                  Export verified evidence archive
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
