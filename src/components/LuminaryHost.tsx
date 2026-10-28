import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardPaste, Code2, KeyRound, Minimize2, Paperclip, Send, Square, X } from 'lucide-react';
import { composePrompt, EXPLANATION_LABELS, EXPLANATION_LEVELS, type ExplanationLevel } from '../luminary/blocks';
import {
  describeShortfall,
  luminaryApi,
  readDemoKey,
  readLevel,
  saveDemoKey,
  saveLevel,
  type CallResult,
  type CodingTask,
  type GovernedReply,
  type LineageEntry,
  type LuminaryStatus,
} from '../luminary/client';
import { ReplyView, TaskCard } from './LuminaryCards';

/**
 * App-level presence host for the Vibe Luminary, mounted outside the mode views so it is present
 * in every mode and every drill-down Environment.
 *
 * Two scales of one identity (Behavior Contract v0.1, section 1): the Paused Icon (golden
 * Locus-core in the corner) and the Full Form. The Architect controls presence: it starts paused,
 * never raises itself, and observes and sends nothing while paused (D4.2).
 *
 * The Full Form is the conversation of STP-0002 P19 (P3-P6): a header naming the answering model,
 * a status line, the transcript with each reply's gauge mark, Stop, context chips the Architect adds
 * (nothing is attached automatically), Shortfall cards, Offering cards, coding-task cards, and the
 * Architect's explanation level. The Luminary suggests, explains and writes; only the Architect's
 * Accept changes anything, and a card left alone is a no.
 */

type Activity = 'resting' | 'thinking' | 'answering' | 'stopped' | 'unavailable';

interface ContextChip {
  id: string;
  label: string;
  text: string;
}

type Entry =
  | { id: string; kind: 'architect'; text: string; chips: string[] }
  | { id: string; kind: 'reply'; reply: GovernedReply; lineage?: LineageEntry[]; level: ExplanationLevel; forTask?: boolean }
  | { id: string; kind: 'shortfall'; text: string }
  | { id: string; kind: 'task'; task: CodingTask; level: ExplanationLevel }
  | { id: string; kind: 'note'; text: string };

export interface LuminarySelection {
  label: string;
  text: string;
}

/** Keeps one request well inside the gateway's 64 KiB body limit. */
const CONTEXT_LIMIT_BYTES = 24_000;
const bytes = (text: string) => new TextEncoder().encode(text).length;
let nextId = 0;
const newId = () => `l${++nextId}`;

const ACTIVITY_LABEL: Record<Activity, string> = {
  resting: 'Resting',
  thinking: 'Thinking…',
  answering: 'Answering…',
  stopped: 'Stopped',
  unavailable: 'Unavailable',
};

function modelLabel(status: LuminaryStatus | null): string {
  if (!status) return 'Not connected';
  if (status.replySource === 'rehearsal') return 'Rehearsal stand-in';
  if (status.replySource === 'not_configured') return 'No model connected';
  return status.replySource;
}

export const LuminaryHost: React.FC<{ mode: string; selection?: LuminarySelection }> = ({ mode, selection }) => {
  const [isEngaged, setIsEngaged] = useState(false);
  const iconRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const wasEngaged = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [demoKey, setDemoKey] = useState(readDemoKey);
  const [keyDraft, setKeyDraft] = useState('');
  const [needsKey, setNeedsKey] = useState(false);
  const [status, setStatus] = useState<LuminaryStatus | null>(null);
  const [activity, setActivity] = useState<Activity>('resting');
  const [level, setLevelState] = useState<ExplanationLevel>(readLevel);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [chips, setChips] = useState<ContextChip[]>([]);
  const [message, setMessage] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pasteDraft, setPasteDraft] = useState('');
  const [taskMode, setTaskMode] = useState(false);
  const [allowedFiles, setAllowedFiles] = useState('');

  useEffect(() => {
    if (isEngaged) {
      formRef.current?.focus();
    } else if (wasEngaged.current) {
      iconRef.current?.focus();
    }
    wasEngaged.current = isEngaged;
  }, [isEngaged]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [entries]);

  const push = (entry: Entry) => setEntries((current) => [...current, entry]);

  const handleFailure = useCallback((result: Extract<CallResult<unknown>, { ok: false }>) => {
    if (result.kind === 'key_required') setNeedsKey(true);
    setActivity(result.kind === 'shortfall' ? 'resting' : 'unavailable');
    push({ id: newId(), kind: 'shortfall', text: describeShortfall(result.shortfall) });
  }, []);

  // The status read happens only when the Architect engages the Luminary, never while paused.
  useEffect(() => {
    if (!isEngaged) return;
    if (!demoKey) {
      setNeedsKey(true);
      setActivity('unavailable');
      return;
    }
    let cancelled = false;
    luminaryApi.status(demoKey).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setStatus(result.value);
        setNeedsKey(false);
        setActivity('resting');
      } else {
        setStatus(null);
        setNeedsKey(result.kind === 'key_required');
        setActivity('unavailable');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isEngaged, demoKey]);

  const setLevel = (next: ExplanationLevel) => {
    setLevelState(next);
    saveLevel(next);
  };

  const contextBytes = chips.reduce((sum, chip) => sum + bytes(chip.text), 0);
  const overLimit = contextBytes > CONTEXT_LIMIT_BYTES;
  const busy = activity === 'thinking' || activity === 'answering';

  const addChip = (label: string, text: string) => {
    if (!text.trim()) return;
    setChips((current) => [...current, { id: newId(), label, text }]);
  };

  const send = async (text: string, askLevel: ExplanationLevel = level, asTask = taskMode) => {
    const trimmed = text.trim();
    if (!trimmed || busy || overLimit) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const sentChips = chips;
    push({ id: newId(), kind: 'architect', text: trimmed, chips: sentChips.map((chip) => `${chip.label} · ${bytes(chip.text)} B`) });
    if (!asTask) setChips([]);
    setMessage('');
    setActivity('thinking');
    try {
      if (asTask) {
        const files = allowedFiles.split(',').map((file) => file.trim()).filter(Boolean);
        const result = await luminaryApi.assign(demoKey, { goal: trimmed, allowedFiles: files, level: askLevel, mode }, controller.signal);
        setActivity('answering');
        if (result.ok) {
          push({ id: newId(), kind: 'reply', reply: result.value.reply, lineage: result.value.lineage, level: askLevel, forTask: true });
          push({ id: newId(), kind: 'task', task: result.value.task, level: askLevel });
          setActivity('resting');
        } else {
          if (result.reply) push({ id: newId(), kind: 'reply', reply: result.reply, lineage: result.lineage, level: askLevel });
          handleFailure(result);
        }
        return;
      }
      const prompt = composePrompt({ mode, level: askLevel, context: sentChips.map(({ label, text: body }) => ({ label, text: body })), message: trimmed });
      const result = await luminaryApi.ask(demoKey, prompt, controller.signal);
      setActivity('answering');
      if (result.ok) {
        push({ id: newId(), kind: 'reply', reply: result.value.reply, lineage: result.value.lineage, level: askLevel });
        setActivity('resting');
      } else {
        handleFailure(result);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setActivity('stopped');
        push({ id: newId(), kind: 'note', text: 'Stopped. Nothing from this request is shown.' });
      } else {
        setActivity('unavailable');
        push({ id: newId(), kind: 'shortfall', text: 'The request failed before any reply arrived.' });
      }
    } finally {
      abortRef.current = null;
    }
  };

  const decideTask = async (id: string, decision: 'accept' | 'decline'): Promise<string | null> => {
    const result = decision === 'accept' ? await luminaryApi.accept(demoKey, id) : await luminaryApi.decline(demoKey, id);
    if (!result.ok) return describeShortfall(result.shortfall);
    setEntries((current) => current.map((entry) => (entry.kind === 'task' && entry.task.id === id ? { ...entry, task: result.value.task } : entry)));
    return null;
  };

  const explainMore = (entry: Extract<Entry, { kind: 'reply' }>) => {
    // A deeper look at one reply, without changing the Architect's setting.
    const deeper = EXPLANATION_LEVELS[Math.min(EXPLANATION_LEVELS.indexOf(entry.level) + 1, EXPLANATION_LEVELS.length - 1)];
    void send(`Explain more about your last reply:\n${entry.reply.content.slice(0, 2_000)}`, deeper, false);
  };

  // The Architect's Codeglass emblem: the Paused Icon is the emblem small, the Full Form shows it whole.
  const core = (size: string, src = '/assets/luminary/luminary-codeglass-96.webp') => (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${size} object-contain drop-shadow-[0_0_10px_rgba(252,211,77,0.45)]`}
    />
  );

  const codingTasksOn = status?.codingTasks === 'on';

  return (
    // The Paused Icon sits in the status bar's left corner; the Full Form opens above it.
    <div className="fixed left-3 bottom-1 z-30 font-mono">
      {isEngaged ? (
        <section
          ref={formRef}
          tabIndex={-1}
          aria-label="Vibe Luminary"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setIsEngaged(false);
            }
          }}
          className="absolute left-0 bottom-10 w-[min(24rem,calc(100vw-1.5rem))] max-h-[min(36rem,calc(100vh-5rem))] flex flex-col panel-glass legible-glass rounded-2xl border border-amber-400/40 shadow-[0_0_40px_rgba(252,211,77,0.15)] p-3 gap-2 outline-none motion-safe:animate-modal-zoom"
        >
          <header className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {core('w-10 h-10', '/assets/luminary/luminary-codeglass-384.webp')}
              <div className="min-w-0">
                <h2 className="font-orbitron text-xs font-bold tracking-wider text-amber-200 uppercase">Vibe Luminary</h2>
                <p className="text-[9px] text-slate-400 truncate">
                  {modelLabel(status)}
                  {status?.replySource === 'rehearsal' && <span className="ml-1 px-1 rounded bg-amber-500/20 text-amber-200">Rehearsal</span>}
                  {status && <span> · gauge {status.gauge === 'configured' ? 'on' : 'off'}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEngaged(false)}
              aria-label="Pause the Luminary"
              title="Pause"
              className="p-1 rounded-lg text-slate-300 hover:text-amber-200 hover:bg-slate-800/60"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </header>

          <div className="flex items-center justify-between gap-2 text-[9px]">
            <span role="status" aria-live="polite" className={activity === 'unavailable' ? 'text-rose-300' : 'text-slate-300'}>{ACTIVITY_LABEL[activity]} · {mode}</span>
            <div className="flex items-center gap-1">
            {level !== 'plain' && (
              <button type="button" onClick={() => { saveLevel(null); setLevelState('plain'); }} title="Clear the saved level" className="text-slate-500 hover:text-slate-300">reset</button>
            )}
            <div role="radiogroup" aria-label="Explanation level" className="flex rounded-md border border-slate-700 overflow-hidden">
              {EXPLANATION_LEVELS.map((option) => (
                <button
                  key={option}
                  role="radio"
                  aria-checked={level === option}
                  onClick={() => setLevel(option)}
                  className={`px-1.5 py-0.5 ${level === option ? 'bg-amber-500/25 text-amber-100' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {EXPLANATION_LABELS[option]}
                </button>
              ))}
            </div>
            </div>
          </div>

          {needsKey && (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                saveDemoKey(keyDraft.trim());
                setDemoKey(keyDraft.trim());
                setKeyDraft('');
              }}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="Demo key"
                aria-label="Luminary demo key"
                className="flex-1 min-w-0 bg-slate-900/90 border border-slate-700 rounded-md px-2 py-1 text-[10px] text-slate-200"
              />
              <button type="submit" className="px-2 py-1 rounded-md text-[10px] border border-amber-400/40 text-amber-100">Use key</button>
            </form>
          )}

          <div ref={transcriptRef} className="flex-1 min-h-[6rem] overflow-y-auto space-y-2 pr-1" aria-label="Conversation">
            {entries.length === 0 && (
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Ask me to explain anything on screen, write code, or draft a note. I suggest and write; nothing joins the project unless you accept it.
              </p>
            )}
            {entries.map((entry) => {
              switch (entry.kind) {
                case 'architect':
                  return (
                    <div key={entry.id} className="ml-6 rounded-lg bg-slate-800/70 p-2 text-[11px] text-slate-100 whitespace-pre-wrap">
                      {entry.text}
                      {entry.chips.length > 0 && <p className="mt-1 text-[9px] text-slate-400">With: {entry.chips.join(', ')}</p>}
                    </div>
                  );
                case 'reply':
                  return (
                    <div key={entry.id} className="space-y-1">
                      <ReplyView content={entry.reply.content} modelId={entry.reply.modelId} lineage={entry.lineage} level={entry.level} forTask={entry.forTask} />
                      <button type="button" disabled={busy} onClick={() => explainMore(entry)} className="text-[9px] text-amber-300 hover:text-amber-100 disabled:opacity-50">Explain more</button>
                    </div>
                  );
                case 'task':
                  return <TaskCard key={entry.id} task={entry.task} level={entry.level} onDecide={decideTask} />;
                case 'shortfall':
                  return <p key={entry.id} role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-2 text-[10px] text-rose-200">{entry.text}</p>;
                case 'note':
                  return <p key={entry.id} className="text-[10px] text-slate-400">{entry.text}</p>;
              }
            })}
          </div>

          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Context to send">
              {chips.map((chip) => (
                <li key={chip.id} className="flex items-center gap-1 rounded-full border border-slate-600 px-2 py-0.5 text-[9px] text-slate-200">
                  {chip.label} · {bytes(chip.text)} B
                  <button type="button" aria-label={`Remove ${chip.label}`} onClick={() => setChips((current) => current.filter((c) => c.id !== chip.id))}><X className="w-2.5 h-2.5" /></button>
                </li>
              ))}
              <li className={`text-[9px] ${overLimit ? 'text-rose-300' : 'text-slate-500'}`}>{contextBytes} / {CONTEXT_LIMIT_BYTES} B</li>
            </ul>
          )}

          {pasting && (
            <div className="space-y-1">
              <textarea rows={3} value={pasteDraft} onChange={(e) => setPasteDraft(e.target.value)} aria-label="Snippet to add as context" className="w-full bg-slate-900/90 border border-slate-700 rounded-md p-1.5 text-[10px] text-slate-200 resize-none" />
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { addChip('Snippet', pasteDraft); setPasteDraft(''); setPasting(false); }} className="px-2 py-0.5 rounded-md text-[10px] border border-slate-600 text-slate-200">Add snippet</button>
                <button type="button" onClick={() => { setPasteDraft(''); setPasting(false); }} className="px-2 py-0.5 rounded-md text-[10px] text-slate-400">Cancel</button>
              </div>
            </div>
          )}

          {taskMode && (
            <input
              value={allowedFiles}
              onChange={(e) => setAllowedFiles(e.target.value)}
              placeholder="Allowed files, comma separated (e.g. docs/orb-notes.md)"
              aria-label="Files the Luminary may change"
              className="w-full bg-slate-900/90 border border-cyan-700/60 rounded-md px-2 py-1 text-[10px] text-slate-200"
            />
          )}

          <form
            className="flex items-end gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void send(message);
            }}
          >
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(message);
                }
              }}
              placeholder={taskMode ? 'Describe the code change you want' : 'Ask the Luminary'}
              aria-label={taskMode ? 'Coding task goal' : 'Message to the Luminary'}
              className="flex-1 min-w-0 bg-slate-900/90 border border-slate-700 rounded-lg p-1.5 text-[11px] text-slate-200 resize-none focus:outline-none focus:border-amber-400/60"
            />
            {busy ? (
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop" title="Stop" className="p-2 rounded-lg border border-rose-400/50 text-rose-200 hover:bg-rose-900/40">
                <Square className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button type="submit" disabled={!message.trim() || overLimit || (taskMode && !allowedFiles.trim())} aria-label="Send" title="Send" className="p-2 rounded-lg border border-amber-400/50 text-amber-100 hover:bg-amber-900/30 disabled:opacity-40">
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            {selection && !taskMode && (
              <button type="button" onClick={() => addChip(selection.label, selection.text)} className="flex items-center gap-1 hover:text-amber-200"><Paperclip className="w-3 h-3" />Add selection</button>
            )}
            {!taskMode && (
              <button type="button" onClick={() => setPasting(true)} className="flex items-center gap-1 hover:text-amber-200"><ClipboardPaste className="w-3 h-3" />Paste snippet</button>
            )}
            <button
              type="button"
              onClick={() => setTaskMode((value) => !value)}
              disabled={!codingTasksOn}
              title={codingTasksOn ? 'Assign a coding task' : status?.codingTasks === 'local_only' ? 'Coding tasks run only on the Architect\'s own computer' : 'Coding tasks are off on this gateway'}
              aria-pressed={taskMode}
              className={`ml-auto flex items-center gap-1 ${taskMode ? 'text-cyan-200' : 'hover:text-cyan-200'} disabled:opacity-40`}
            >
              <Code2 className="w-3 h-3" />{taskMode ? 'Coding task: on' : 'Coding task'}
            </button>
          </div>
        </section>
      ) : (
        <button
          ref={iconRef}
          onClick={() => setIsEngaged(true)}
          aria-label="Engage the Vibe Luminary"
          aria-expanded={false}
          title="Vibe Luminary (paused)"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-950/80 border border-amber-400/40 hover:border-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {core('w-7 h-7')}
        </button>
      )}
    </div>
  );
};
