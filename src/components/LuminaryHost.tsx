import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ClipboardPaste, Code2, KeyRound, Mic, Minimize2, Paperclip, Send, Square, Volume2, X } from 'lucide-react';
import { composePrompt, EXPLANATION_LABELS, EXPLANATION_LEVELS, type ExplanationLevel } from '../luminary/blocks';
import {
  describeShortfall,
  describeSpend,
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
import { isLuminaryEngaged, setLuminaryEngaged, subscribeLuminaryEngaged } from '../luminary/presence';
import { PRESENCE_SCREEN_OFFSET, PRESENCE_WINDOW_RADIUS } from '../three/luminaryPresence';
import { recordExchange, textEvidence } from '../luminary/record';
import { describeForQuestion, momentLines, toMoment, type ConnectionMoment } from '../luminary/connectionMoments';
import { getConnectionEvents, subscribeConnectionEvents, type ConnectionEvent } from '../contracts/connectionEvents';
import { VOICE_RATES, canListen, canSpeak, listen, pickVoice, readVoiceSettings, saveVoiceSettings, speak, speakableText, stopSpeaking, voicesAvailable, type Recognition, type VoiceSettings } from '../luminary/voice';
import { SPEAK_IN_LABELS, SPEAK_IN_OPTIONS, bubbleText, clearBubble, readSpeakIn, saveSpeakIn, sayInBubble, type SpeakIn } from '../luminary/bubble';
import type { LuminaryExchange, LuminaryExchangeEvent } from '../engine/evidenceArchive';

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
  /** Set on the chip the Luminary's focus attaches by itself (N57): the focus key it stands for. */
  focusKey?: string;
}

type Entry =
  | { id: string; kind: 'architect'; text: string; chips: string[] }
  | { id: string; kind: 'reply'; reply: GovernedReply; lineage?: LineageEntry[]; level: ExplanationLevel; forTask?: boolean }
  | { id: string; kind: 'shortfall'; text: string }
  | { id: string; kind: 'task'; task: CodingTask; level: ExplanationLevel }
  | { id: string; kind: 'note'; text: string }
  | { id: string; kind: 'moments-offer'; eventIds: string[] }
  | { id: string; kind: 'moments'; moments: ConnectionMoment[] };

export interface LuminarySelection {
  /** Changes whenever the focus moves (src/luminary/focus.ts). */
  key: string;
  label: string;
  text: string;
}

/** Keeps one request well inside the gateway's 64 KiB body limit. */
const CONTEXT_LIMIT_BYTES = 24_000;
const bytes = (text: string) => new TextEncoder().encode(text).length;
let nextId = 0;
const newId = () => `l${++nextId}`;

/** Connection moments already shown to the Architect, kept for the page visit (P24). */
const seenMoments = new Set<string>();

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

export const LuminaryHost: React.FC<{ mode: string; selection?: LuminarySelection; nameOf?: (elementId: string) => string | undefined }> = ({ mode, selection, nameOf }) => {
  // Shared with the Presence in the Aether workspace, so clicking either one engages the Luminary.
  const isEngaged = useSyncExternalStore(subscribeLuminaryEngaged, isLuminaryEngaged);
  const setIsEngaged = setLuminaryEngaged;
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
  // Where the Luminary speaks (P26): the panel, the bubble by the Presence, or both.
  const [speakIn, setSpeakInState] = useState<SpeakIn>(readSpeakIn);
  const [showConversation, setShowConversation] = useState(false);
  const speakInRef = useRef(speakIn);
  speakInRef.current = speakIn;
  const say = (text: string) => {
    if (speakInRef.current !== 'panel') sayInBubble(text);
  };
  const setSpeakIn = (next: SpeakIn) => {
    setSpeakInState(next);
    saveSpeakIn(next);
    if (next === 'panel') clearBubble();
  };
  const transcriptVisible = speakIn !== 'bubble' || showConversation;

  // Voice (P27): replies read aloud with the browser's speech, and hold-to-talk for questions.
  const [voice, setVoiceState] = useState<VoiceSettings>(readVoiceSettings);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(voicesAvailable);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const spokenBaseRef = useRef('');
  const updateVoice = (next: Partial<VoiceSettings>) => {
    const merged = { ...voiceRef.current, ...next };
    setVoiceState(merged);
    saveVoiceSettings(merged);
    if (!merged.on) stopSpeaking();
    else setVoices(voicesAvailable());
  };
  const speakReply = (content: string) => {
    if (voiceRef.current.on) speak(speakableText(content), voiceRef.current);
  };
  useEffect(() => {
    if (!canSpeak()) return;
    // The browser loads its voices a moment after the page, so read them again when they arrive.
    const refresh = () => setVoices(voicesAvailable());
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);
  // The microphone is on only while the talk button is held (D4.2).
  const startListening = () => {
    if (recognitionRef.current || busy) return;
    stopSpeaking();
    spokenBaseRef.current = message.trim();
    recognitionRef.current = listen(
      (words) => setMessage([spokenBaseRef.current, words].filter(Boolean).join(' ')),
      (reason) => { if (reason) push({ id: newId(), kind: 'note', text: reason }); },
      () => { recognitionRef.current = null; setListening(false); }
    );
    setListening(recognitionRef.current !== null);
  };
  const stopListening = () => recognitionRef.current?.stop();
  // At rest the Luminary neither speaks nor listens (D4.2).
  useEffect(() => {
    if (isEngaged) return;
    stopSpeaking();
    recognitionRef.current?.abort();
  }, [isEngaged]);

  useEffect(() => {
    if (isEngaged) {
      formRef.current?.focus();
    } else if (wasEngaged.current) {
      iconRef.current?.focus();
    }
    wasEngaged.current = isEngaged;
  }, [isEngaged]);

  // A new reply opens at its first line, so a long answer reads from the top. Anything else
  // (the Architect's own words, notes, moments) keeps the newest line in view.
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    const last = entries[entries.length - 1];
    const reply = last?.kind === 'reply' ? transcript.querySelector<HTMLElement>(`[data-entry-id="${last.id}"]`) : null;
    const top = reply ? reply.getBoundingClientRect().top - transcript.getBoundingClientRect().top + transcript.scrollTop - 8 : transcript.scrollHeight;
    transcript.scrollTo({ top });
  }, [entries]);

  // While an IDE page is open, its backdrop has a window over the 3D Presence (index.css). A press
  // there engages or pauses the Luminary, as it does in the scene, and the page stays open. Only a
  // press that reaches the backdrop counts, so the page's own content always wins.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.matches('[role="dialog"][aria-modal="true"] > .animate-backdrop-fade')) return;
      const dx = (event.clientX - (window.innerWidth - PRESENCE_SCREEN_OFFSET.right)) / PRESENCE_WINDOW_RADIUS.x;
      const dy = (event.clientY - (window.innerHeight - PRESENCE_SCREEN_OFFSET.bottom)) / PRESENCE_WINDOW_RADIUS.y;
      if (dx * dx + dy * dy <= 1) setLuminaryEngaged(!isLuminaryEngaged());
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const push = (entry: Entry) => setEntries((current) => [...current, entry]);

  // Every request, result, accept and decline goes into the IDE's evidence record (P19). If a write
  // fails, the conversation says so rather than implying a record exists.
  const keep = async (event: LuminaryExchangeEvent, detail: LuminaryExchange['detail']) => {
    const reason = await recordExchange(event, detail);
    if (reason) push({ id: newId(), kind: 'note', text: `This was not written to the evidence record: ${reason}` });
  };
  const keepReply = async (reply: GovernedReply, lineage: LineageEntry[] | undefined, extra: LuminaryExchange['detail'] = {}) => {
    const content = await textEvidence(reply.content);
    // The Knowledge Pack's hash (P23) records what the Luminary was told when it answered.
    const knowledge: LuminaryExchange['detail'] = status?.knowledge ? { knowledge: `${status.knowledge.version} ${status.knowledge.sha256}` } : {};
    await keep('replied', { modelId: reply.modelId, excerpt: content.excerpt, sha256: content.sha256, chars: content.chars, checked: lineage?.some((entry) => entry.stage === 'prism') ?? false, ...knowledge, ...extra });
  };
  const keepFailure = (result: Extract<CallResult<unknown>, { ok: false }>, extra: LuminaryExchange['detail'] = {}) =>
    keep('shortfall', { kind: result.kind, code: result.shortfall.code, ...extra });

  const handleFailure = useCallback((result: Extract<CallResult<unknown>, { ok: false }>) => {
    if (result.kind === 'key_required') setNeedsKey(true);
    setActivity(result.kind === 'shortfall' ? 'resting' : 'unavailable');
    push({ id: newId(), kind: 'shortfall', text: describeShortfall(result.shortfall) });
  }, []);

  const nameOfRef = useRef(nameOf);
  nameOfRef.current = nameOf;
  const momentOf = (event: ConnectionEvent) => toMoment(event, (id) => nameOfRef.current?.(id));

  // Connection moments (P24, N43). At rest the Luminary reads nothing and shows nothing (D4.2). When
  // the Architect opens it, it offers the moments it has not shown yet, and while it is open each new
  // moment appears as a plain line. The wording is made here, with no model call.
  useEffect(() => {
    if (!isEngaged) return;
    const unseen = getConnectionEvents().filter((event) => !seenMoments.has(event.eventId) && toMoment(event) !== null);
    setEntries((current) => {
      const kept = current.filter((entry) => entry.kind !== 'moments-offer');
      return unseen.length ? [...kept, { id: newId(), kind: 'moments-offer', eventIds: unseen.map((event) => event.eventId) }] : kept;
    });
    return subscribeConnectionEvents((event) => {
      const moment = momentOf(event);
      if (!moment) return;
      seenMoments.add(event.eventId);
      say(momentLines([moment])[0].text);
      setEntries((current) => {
        const last = current[current.length - 1];
        if (last?.kind === 'moments') return [...current.slice(0, -1), { ...last, moments: [...last.moments, moment] }];
        return [...current, { id: newId(), kind: 'moments', moments: [moment] }];
      });
    });
  }, [isEngaged]);

  const showMoments = (offer: Extract<Entry, { kind: 'moments-offer' }>) => {
    const ids = new Set(offer.eventIds);
    const shown = getConnectionEvents().filter((event) => ids.has(event.eventId)).map(momentOf).filter((moment): moment is ConnectionMoment => moment !== null);
    shown.forEach((moment) => seenMoments.add(moment.eventId));
    setEntries((current) => current.map((entry) => (entry.id === offer.id ? { id: entry.id, kind: 'moments', moments: shown } : entry)));
  };

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

  // The Luminary's focus (N57): what the Architect has open is attached by itself as a chip, so a
  // question about the open Element is answered about that Element. The chip stays across sends
  // while the focus holds, moves when the focus moves, and goes when nothing is open. Removing it
  // with x keeps it off for that focus; the Architect still decides what is sent.
  const dismissedFocusRef = useRef<string | null>(null);
  const focusKey = selection?.key;
  const focusLabel = selection?.label;
  const focusText = selection?.text;
  useEffect(() => {
    if (dismissedFocusRef.current !== focusKey) dismissedFocusRef.current = null;
    setChips((current) => {
      const others = current.filter((chip) => !chip.focusKey);
      if (!focusKey || focusLabel === undefined || focusText === undefined || dismissedFocusRef.current === focusKey) return others;
      // Same focus with new words (the Element was edited and saved): the chip keeps its place and
      // takes the new words, so the Luminary never answers about the old version.
      const held = current.find((chip) => chip.focusKey === focusKey);
      if (held) return current.map((chip) => (chip === held ? { ...chip, label: focusLabel, text: focusText } : chip));
      return [{ id: newId(), label: focusLabel, text: focusText, focusKey }, ...others];
    });
  }, [focusKey, focusLabel, focusText]);

  const removeChip = (chip: ContextChip) => {
    if (chip.focusKey) dismissedFocusRef.current = chip.focusKey;
    setChips((current) => current.filter((c) => c.id !== chip.id));
  };

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
    setChips((current) => current.filter((chip) => chip.focusKey));
    setMessage('');
    setActivity('thinking');
    const files = asTask ? allowedFiles.split(',').map((file) => file.trim()).filter(Boolean) : [];
    const asked = await textEvidence(trimmed);
    await keep(asTask ? 'task_assigned' : 'asked', {
      excerpt: asked.excerpt, sha256: asked.sha256, chars: asked.chars, mode, level: askLevel,
      context: sentChips.map((chip) => `${chip.label} · ${bytes(chip.text)} B`),
      ...(asTask ? { allowedFiles: files } : {}),
    });
    try {
      if (asTask) {
        const result = await luminaryApi.assign(demoKey, { goal: trimmed, allowedFiles: files, level: askLevel, mode, context: sentChips.map(({ label, text: body }) => ({ label, text: body })) }, controller.signal);
        setActivity('answering');
        if (result.ok) {
          const { task } = result.value;
          push({ id: newId(), kind: 'reply', reply: result.value.reply, lineage: result.value.lineage, level: askLevel, forTask: true });
          say(bubbleText(result.value.reply.content));
          speakReply(result.value.reply.content);
          push({ id: newId(), kind: 'task', task, level: askLevel });
          setActivity('resting');
          await keepReply(result.value.reply, result.value.lineage, { taskId: task.id });
          await keep('task_proposed', { taskId: task.id, branch: task.branch, commit: task.commit, files: task.files, checksPassed: task.checks.every((check) => check.ok), diffComplete: task.diffComplete });
        } else {
          if (result.reply) push({ id: newId(), kind: 'reply', reply: result.reply, lineage: result.lineage, level: askLevel });
          handleFailure(result);
          if (result.reply) await keepReply(result.reply, result.lineage);
          await keep(result.reply ? 'task_refused' : 'shortfall', { kind: result.kind, code: result.shortfall.code });
        }
        return;
      }
      const prompt = composePrompt({ mode, level: askLevel, context: sentChips.map(({ label, text: body }) => ({ label, text: body })), message: trimmed });
      const result = await luminaryApi.ask(demoKey, prompt, controller.signal);
      setActivity('answering');
      if (result.ok) {
        push({ id: newId(), kind: 'reply', reply: result.value.reply, lineage: result.value.lineage, level: askLevel });
        say(bubbleText(result.value.reply.content));
        speakReply(result.value.reply.content);
        setActivity('resting');
        await keepReply(result.value.reply, result.value.lineage);
      } else {
        handleFailure(result);
        await keepFailure(result);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setActivity('stopped');
        push({ id: newId(), kind: 'note', text: 'Stopped. Nothing from this request is shown.' });
        await keep('stopped', {});
      } else {
        setActivity('unavailable');
        push({ id: newId(), kind: 'shortfall', text: 'The request failed before any reply arrived.' });
        await keep('shortfall', { kind: 'unreachable', code: 'request_failed' });
      }
    } finally {
      abortRef.current = null;
      // Keep the running total current after every request.
      void luminaryApi.status(demoKey).then((next) => { if (next.ok) setStatus(next.value); });
    }
  };

  const decideTask = async (id: string, decision: 'accept' | 'decline'): Promise<string | null> => {
    const result = decision === 'accept' ? await luminaryApi.accept(demoKey, id) : await luminaryApi.decline(demoKey, id);
    if (!result.ok) {
      await keep('task_decision_failed', { taskId: id, decision, code: result.shortfall.code });
      return describeShortfall(result.shortfall);
    }
    setEntries((current) => current.map((entry) => (entry.kind === 'task' && entry.task.id === id ? { ...entry, task: result.value.task } : entry)));
    await keep(decision === 'accept' ? 'task_accepted' : 'task_declined', { taskId: id, branch: result.value.task.branch, commit: result.value.task.commit });
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
    // The Paused Icon sits at the right edge, just above the scene controls in the lower right
    // corner, and breathes like the Presence. The Full Form opens beside the Presence in
    // the lower right of the workspace (src/three/luminaryPresence.ts), as the Architect drew it,
    // and falls back toward the left edge on a narrow screen; while an IDE page is open it moves to
    // the top right corner (.luminary-form in index.css). Both stay above every IDE overlay (z-[70]; the
    // highest overlay is z-[60]), so the Luminary is there on an Element's pages too.
    <div className="fixed right-4 bottom-[272px] z-[70] font-mono">
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
          className="luminary-form fixed bottom-32 right-[max(0.75rem,min(310px,calc(100vw-25.5rem)))] w-[min(24rem,calc(100vw-1.5rem))] max-h-[min(36rem,calc(100vh-13rem))] flex flex-col panel-glass legible-glass rounded-2xl border border-amber-400/40 shadow-[0_0_40px_rgba(252,211,77,0.15)] p-3 gap-2 outline-none motion-safe:animate-modal-zoom"
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
                  {status?.spend && (() => {
                    const spend = describeSpend(status.spend);
                    return <span className={spend.warn ? 'text-amber-300' : undefined} aria-label="Spending so far"> · {spend.text}</span>;
                  })()}
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

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[9px]">
            <span role="status" aria-live="polite" className={`shrink-0 whitespace-nowrap ${activity === 'unavailable' ? 'text-rose-300' : 'text-slate-300'}`}>{ACTIVITY_LABEL[activity]} · {mode}</span>
            <div className="flex flex-wrap items-center justify-end gap-1">
            {level !== 'plain' && (
              <button type="button" onClick={() => { saveLevel(null); setLevelState('plain'); }} title="Clear the saved level" className="text-slate-500 hover:text-slate-300">reset</button>
            )}
            <div role="radiogroup" aria-label="Where the Luminary speaks" title="Where the Luminary speaks" className="flex rounded-md border border-slate-700 overflow-hidden">
              {SPEAK_IN_OPTIONS.map((option) => (
                <button
                  key={option}
                  role="radio"
                  aria-checked={speakIn === option}
                  onClick={() => setSpeakIn(option)}
                  className={`px-1.5 py-0.5 ${speakIn === option ? 'bg-amber-500/25 text-amber-100' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {SPEAK_IN_LABELS[option]}
                </button>
              ))}
            </div>
            {canSpeak() && (
              <button
                type="button"
                aria-pressed={voice.on}
                onClick={() => updateVoice({ on: !voice.on })}
                title={voice.on ? 'Voice is on: replies are read aloud' : 'Voice: have replies read aloud and talk to the Luminary'}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border ${voice.on ? 'border-amber-400/60 bg-amber-500/25 text-amber-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
              >
                <Volume2 className="w-2.5 h-2.5" />Voice
              </button>
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

          {speakIn === 'bubble' && (
            <button type="button" onClick={() => setShowConversation((value) => !value)} className="self-start text-[9px] text-amber-300 hover:text-amber-100">
              {showConversation ? 'Hide the conversation' : 'Show the conversation'}
            </button>
          )}
          <div ref={transcriptRef} hidden={!transcriptVisible} className="flex-1 min-h-[6rem] overflow-y-auto space-y-2 pr-1" aria-label="Conversation">
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
                    <div key={entry.id} data-entry-id={entry.id} className="space-y-1">
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
                case 'moments-offer': {
                  const count = entry.eventIds.length;
                  return (
                    <p key={entry.id} className="rounded-lg border border-cyan-700/40 bg-slate-900/50 p-2 text-[10px] text-cyan-100">
                      {count} connection moment{count === 1 ? '' : 's'} since you last opened me.{' '}
                      <button type="button" onClick={() => showMoments(entry)} className="text-amber-300 hover:text-amber-100 underline-offset-2 hover:underline">Show them</button>
                    </p>
                  );
                }
                case 'moments':
                  return (
                    <ul key={entry.id} aria-label="Connection moments" className="rounded-lg border border-cyan-700/40 bg-slate-900/50 p-2 space-y-1">
                      {momentLines(entry.moments).map((line) => (
                        <li key={line.id} className="text-[10px] text-cyan-100 leading-relaxed">
                          {line.text}
                          {!taskMode && (
                            <button
                              type="button"
                              onClick={() => {
                                addChip(`Connection: ${line.orbName}`, describeForQuestion(line));
                                if (!message.trim()) setMessage('Why did this happen, and what can I do next?');
                              }}
                              className="ml-1 text-[9px] text-amber-300 hover:text-amber-100"
                            >
                              Ask why
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  );
              }
            })}
          </div>

          {voice.on && (
            <div className="space-y-1 text-[9px] text-slate-400">
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="flex items-center gap-1">
                  Voice
                  <select
                    value={voice.voiceName}
                    onChange={(e) => updateVoice({ voiceName: e.target.value })}
                    aria-label="The Luminary's voice"
                    className="max-w-[9rem] bg-slate-900/90 border border-slate-700 rounded px-1 py-0.5 text-[9px] text-slate-200"
                  >
                    <option value="">A voice on this PC</option>
                    {voices.map((entry) => (
                      <option key={entry.name} value={entry.name}>{entry.localService ? entry.name : `${entry.name} (online)`}</option>
                    ))}
                  </select>
                </label>
                <div role="radiogroup" aria-label="Speaking speed" className="flex rounded-md border border-slate-700 overflow-hidden">
                  {VOICE_RATES.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={voice.rate === option.rate}
                      onClick={() => updateVoice({ rate: option.rate })}
                      className={`px-1.5 py-0.5 ${voice.rate === option.rate ? 'bg-amber-500/25 text-amber-100' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => stopSpeaking()} className="hover:text-amber-200">Stop speaking</button>
              </div>
              {(pickVoice(voices, voice.voiceName) ?? voices.find((entry) => entry.default))?.localService === false && (
                <p className="text-amber-200/80">This voice is online: the reply text is sent to the browser's speech service to be spoken.</p>
              )}
              {canListen() && (
                <p>Hold the microphone to talk; your words appear in the box to check before you send. Your browser sends the sound to its speech service to turn it into text.</p>
              )}
            </div>
          )}

          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Context to send">
              {chips.map((chip) => (
                <li key={chip.id} className="flex items-center gap-1 rounded-full border border-slate-600 px-2 py-0.5 text-[9px] text-slate-200">
                  {chip.label} · {bytes(chip.text)} B
                  <button type="button" aria-label={`Remove ${chip.label}`} onClick={() => removeChip(chip)}><X className="w-2.5 h-2.5" /></button>
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
            {voice.on && canListen() && !busy && (
              <button
                type="button"
                aria-label={listening ? 'Listening: release to stop' : 'Hold to talk'}
                aria-pressed={listening}
                title={listening ? 'Listening: release to stop' : 'Hold to talk'}
                onPointerDown={(e) => { e.preventDefault(); startListening(); }}
                onPointerUp={stopListening}
                onPointerLeave={stopListening}
                onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startListening(); } }}
                onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') stopListening(); }}
                className={`p-2 rounded-lg border ${listening ? 'border-rose-400/70 bg-rose-900/40 text-rose-100 motion-safe:animate-pulse' : 'border-amber-400/50 text-amber-100 hover:bg-amber-900/30'}`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
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
            {selection && !taskMode && !chips.some((chip) => chip.focusKey) && (
              <button type="button" onClick={() => {
                dismissedFocusRef.current = null;
                setChips((current) => [{ id: newId(), label: selection.label, text: selection.text, focusKey: selection.key }, ...current]);
              }} className="flex items-center gap-1 hover:text-amber-200"><Paperclip className="w-3 h-3" />Add selection</button>
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
          className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-950/80 border border-amber-400/40 hover:border-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-safe:animate-luminary-breathe"
        >
          {core('w-7 h-7')}
        </button>
      )}
    </div>
  );
};
