import { nextAppSuggestions } from '../engine/appSuggestions';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Send, Square, Sparkles } from 'lucide-react';
import { creationPrompt, parseCreationAnswer, type AppProposal, type CreationAnswer } from '../engine/appCreation';
import type { ApothecaryItem } from '../engine/relationEngine';
import { luminaryApi, readDemoKey, saveDemoKey } from '../luminary/client';
import { setAppCreationActive } from '../luminary/appCreationPresence';

type Turn = { role: string; text: string; proposal?: AppProposal | null; state?: 'pending' | 'sent' | 'failed' | 'stopped' };
const GREETING = 'Welcome, Architect. I’m Luminary, your building companion. Tell me about the app you’d like to create: what should it help people do, and who will use it?';
export function AppCreationConversation({ catalog, onAccept }: { catalog: ApothecaryItem[]; onAccept: (proposal: AppProposal) => Promise<void> }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState<CreationAnswer | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [key, setKey] = useState(readDemoKey);
  const [localReady, setLocalReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const accepting = useRef(false);
  const latest = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { setAppCreationActive(true); return () => setAppCreationActive(false); }, []);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    void luminaryApi.localSession(controller.signal).then(ready => { if (!controller.signal.aborted) setLocalReady(ready); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const reply = latest.current, container = reply?.parentElement;
    if (!reply || !container || !turns.length) return;
    container.scrollTop = Math.max(0, reply.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 20);
  }, [turns]);
  async function copyConversation(button: HTMLButtonElement) {
    const latestAssistant = turns.map(turn => turn.role).lastIndexOf('luminary');
    const content = [GREETING, ...turns.map((t, index) => { const proposal = t.proposal ?? (index === latestAssistant ? answer?.proposal : null); return `${t.role === 'architect' ? 'Architect' : 'Luminary'}\n${t.text}${proposal ? '\n\nStarting architecture\n' + JSON.stringify(proposal, null, 2) : ''}`; })].join('\n\n');
    try { await navigator.clipboard.writeText(content); button.textContent = 'Copied'; window.setTimeout(() => { button.textContent = 'Copy conversation'; }, 2000); }
    catch { window.prompt('Copy conversation text (Ctrl+C or Command+C)', content); }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    await sendText(draft.trim(), true);
  }
  async function sendText(text: string, clearDraft: boolean, selected?: string) {
    if (request.current || accepting.current || !text.trim()) return;
    const latestAssistantIndex = turns.map(turn => turn.role).lastIndexOf('luminary');
    const history = turns.map((turn, index) => index === latestAssistantIndex && !turn.proposal ? { ...turn, proposal: answer?.proposal } : turn);
    const sentTurn: Turn = { role: 'architect', text: text.trim(), state: 'pending' };
    const next = [...history, sentTurn];
    // Keep the full visible transcript, but send only the latest architecture plus recent conversation.
    const promptHistory = next.map((turn, index) => ({ ...turn, proposal: index === latestAssistantIndex ? (turn as Turn).proposal : undefined }));
    const promptTurns = promptHistory.length > 9 ? [promptHistory[0], ...promptHistory.slice(-8)] : promptHistory;
    if (JSON.stringify(promptTurns).length > 20_000) { setError('The current architecture is too large for one planning request. Start a smaller app scope.'); return; }
    const controller = new AbortController(); request.current = controller;
    setTurns(next);
    if (clearDraft) setDraft('');
    setBusy(true); setError(''); setSelectedSuggestion(selected ?? null);
    try {
      if (!localReady && !key.trim()) {
        if (!await luminaryApi.localSession(controller.signal)) throw Error('The local gateway is unavailable. Enter the IDE demo key under connection settings for a remote gateway.');
        setLocalReady(true);
      }
      if (key.trim()) saveDemoKey(key.trim());
      const status = await luminaryApi.status(key.trim());
      if (controller.signal.aborted) return;
      if (!status.ok) throw Error(status.shortfall.message);
      if (!['meta', 'baseten'].includes(status.value.replySourceKind ?? status.value.replySource)) throw Error('App planning needs a live Luminary connection. This gateway has no live model configured. Your description is still here.');
      const prompt = creationPrompt(promptTurns, catalog);
      if (new TextEncoder().encode(prompt).length > 48_000) throw Error('The catalog and conversation are too large for one planning request.');
      const result = await luminaryApi.ask(key.trim(), prompt, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) throw Error(result.shortfall.message);
      const response = parseCreationAnswer(result.value.reply.content, catalog);
      setTurns([...next.map(turn => turn === sentTurn ? { ...turn, state: 'sent' as const } : turn), { role: 'luminary', text: [response.message, ...response.questions, ...response.suggestions.map(s => `Suggestion: ${s}`)].join('\n\n'), proposal: response.proposal }]);
      setAnswer(response);
      setSuggestions(selected && !response.proposal ? suggestions : nextAppSuggestions(suggestions, response.suggestions, selected, usedSuggestions));
      if (selected && response.proposal) setUsedSuggestions(previous => [...previous, selected]);
    } catch (e) {
      if (!controller.signal.aborted) {
        setTurns(current => current.map(turn => turn === sentTurn ? { ...turn, state: 'failed' } : turn));
        setError(e instanceof Error ? e.message : 'The planning request could not be completed.');
      }
    } finally {
      if (controller.signal.aborted) setTurns(current => current.map(turn => turn === sentTurn ? { ...turn, state: 'stopped' } : turn));
      if (request.current === controller) { request.current = null; setBusy(false); setSelectedSuggestion(null); } }
  }
  async function accept() {
    if (!answer?.proposal || accepting.current || request.current) return;
    accepting.current = true; setApplying(true); setError('');
    try { await onAccept(answer.proposal); }
    catch (e) { setError(e instanceof Error ? e.message : 'The architecture could not be connected.'); }
    finally { accepting.current = false; setApplying(false); }
  }
  return <section aria-label="Create an app with Luminary" className="fixed z-40 top-24 bottom-24 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-2xl flex flex-col rounded-3xl border border-amber-300/40 bg-slate-950/95 backdrop-blur-xl shadow-[0_0_60px_rgba(252,211,77,0.12)] text-slate-100 overflow-hidden select-text">
    <header className="p-3 sm:p-5 border-b border-amber-300/20 shrink-0"><p className="text-xs uppercase tracking-[0.2em] text-amber-200">A new beginning</p><h2 className="mt-2 text-xl font-orbitron">Let’s build your app</h2><p className="mt-2 text-sm text-slate-300">Describe it. Shape it together. Review your starting architecture.</p></header>
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4" aria-live="polite" aria-busy={busy}>
      <p className="text-sm leading-relaxed rounded-2xl bg-amber-300/5 border border-amber-300/20 p-4">{GREETING}</p>
      {turns.map((turn, index) => <div key={index} ref={index === turns.length - 1 ? latest : undefined} className={`rounded-2xl p-4 text-sm whitespace-pre-wrap ${turn.role === 'architect' ? 'bg-cyan-900/25 border border-cyan-500/20' : 'bg-slate-900 border border-amber-400/20'}`}><p className="text-xs text-slate-400 mb-2">{turn.role === 'architect' ? 'Architect' : 'Luminary'}</p>{turn.text}{turn.state && turn.state !== 'sent' && <span className="block mt-2 text-xs text-slate-400">{turn.state === 'pending' ? 'Sending to Luminary…' : turn.state === 'failed' ? 'Request failed — your message is kept here.' : 'Stopped — your message is kept here.'}</span>}</div>)}
      {answer?.proposal && <div className="rounded-2xl border border-cyan-300/40 bg-cyan-950/20 p-4 space-y-3">
        <h3 className="text-lg text-cyan-200">{answer.proposal.name}</h3><p className="text-xs text-cyan-300">{answer.proposal.appType} · Starting architecture</p><p className="text-sm">{answer.proposal.purpose}</p>
        <ul className="space-y-3 text-sm">{answer.proposal.elements.map(e => <li key={e.id}><strong>{catalog.find(i => i.id === e.id)?.name}</strong><span className="block text-xs text-slate-400">{e.parentId ? `Inside ${catalog.find(i => i.id === e.parentId)?.name}` : 'Connected to CORE'}</span><span className="text-slate-300">{e.reason}</span></li>)}</ul>
        {answer.proposal.gaps.length > 0 && <section aria-label="Remaining work for this app" className="rounded-xl border border-amber-300/30 bg-amber-950/15 p-3 space-y-2 text-sm text-amber-100">
          <h4 className="font-semibold">What the app still needs</h4>
          <p className="text-xs text-slate-300">These are parts of the requested app that this starting architecture does not yet cover. They are not instructions for you to carry out. Accepting the architecture does not complete this work.</p>
          <ul className="list-disc pl-5 space-y-2">{answer.proposal.gaps.map(g => <li key={g}>{g}</li>)}</ul>
          <button type="button" disabled={busy || applying} onClick={() => void sendText(`Explain the remaining work in this proposal: ${answer.proposal!.gaps.join('; ')}. For each item, tell me whether it is essential to my original request or an optional enhancement, why it is missing, how it affects the app, and the supported next step. Move any unrequested optional features to suggestions. Do not add features or change my requested scope just to explain it.`, false)} className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-300/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Explain remaining work</button>
        </section>}
        {usedSuggestions.length > 0 && <section aria-label="Additions to the app proposal" className="rounded-xl border border-emerald-300/25 bg-emerald-950/20 p-3 space-y-2">
          <h4 className="text-sm font-semibold text-emerald-200">Added to this proposal</h4>
          <ul className="space-y-1 text-sm text-slate-200">{usedSuggestions.map((suggestion, index) => <li key={`${index}:${suggestion}`} className="flex gap-2"><span className="text-emerald-300" aria-hidden="true">✓</span><span>{suggestion}</span></li>)}</ul>
          <p className="text-xs text-slate-400">Review these additions with the app information above, then accept the revised architecture below.</p>
        </section>}
        <p className="text-xs text-slate-400">Accepting configures and connects these Elements. App code, execution and external services are separate build steps.</p>
        <button type="button" disabled={busy || applying} onClick={() => void accept()} className="btn-cyber px-4 py-2 rounded-xl text-sm disabled:opacity-50 flex gap-2 items-center"><Sparkles size={16} />{applying ? 'Connecting Elements…' : 'Accept starting architecture'}<ArrowRight size={16}/></button>
        <p className="text-xs text-slate-400">Want changes? Describe them below before accepting.</p>
      </div>}
      {busy && <p role="status" className="text-sm text-amber-200">Luminary is considering your app…</p>}
      {error && <p role="alert" className="text-sm text-rose-200 border border-rose-400/40 rounded-xl p-3">{error}</p>}

    </div>
    <form onSubmit={send} className="p-3 border-t border-amber-300/20 space-y-2 shrink-0 max-h-[45%] overflow-y-auto">
      {localReady ? <p className="text-xs text-emerald-300">Connected through your local gateway</p> : <details><summary className="text-xs text-slate-400 cursor-pointer">Luminary connection settings</summary><label className="block text-xs text-slate-300">IDE demo key<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" className="block w-full mt-1 bg-slate-900 rounded-lg border border-slate-700 p-2" /></label></details>}
      <label className="sr-only" htmlFor="app-idea">Describe your app or answer Luminary</label>
      <textarea id="app-idea" autoFocus value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} rows={2} placeholder="I’d like to build an app that…" disabled={applying} className="w-full bg-slate-900 border border-slate-700 focus:border-amber-300 focus:outline-none rounded-xl p-3 text-sm resize-none"/>
      <div className="flex items-center justify-between gap-3"><button type="button" onClick={e => void copyConversation(e.currentTarget)} className="rounded-lg border border-amber-300/30 px-3 py-1.5 text-xs text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Copy conversation</button>{busy ? <button type="button" onClick={() => { request.current?.abort(); }} className="text-sm text-amber-200 flex gap-1 items-center"><Square size={14}/>Stop</button> : <button disabled={!draft.trim() || applying} className="btn-cyber rounded-xl px-4 py-2 text-sm disabled:opacity-40 flex gap-2 items-center"><Send size={14}/>Send</button>}</div>
      <div>
        <label htmlFor="app-suggestions" className="sr-only">Choose a suggested addition to send to Luminary</label>
        <select id="app-suggestions" value="" disabled={busy || applying || suggestions.length === 0} onChange={event => {
          if (event.target.value === '') return;
          const suggestion = suggestions[Number(event.target.value)];
          if (suggestion) void sendText(`Please add this to the app and update the starting architecture: ${suggestion}`, false, suggestion);
        }} className="w-full h-9 rounded-lg border border-amber-300/25 bg-slate-900 px-3 text-xs text-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-50">
          <option value="">{selectedSuggestion ? 'Adding suggestion…' : suggestions.length ? `Suggested additions (${suggestions.length}) — choose to add` : 'Suggestions will appear after Luminary replies'}</option>
          {suggestions.map((suggestion, index) => <option key={suggestion} value={index} title={suggestion}>{suggestion.length > 70 ? `${suggestion.slice(0, 67).trimEnd()}…` : suggestion}</option>)}
        </select>
      </div>
    </form>
  </section>;
}
