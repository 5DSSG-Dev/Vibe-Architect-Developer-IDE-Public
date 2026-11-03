import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Send, Square, Sparkles } from 'lucide-react';
import { creationPrompt, parseCreationAnswer, type AppProposal, type CreationAnswer } from '../engine/appCreation';
import type { ApothecaryItem } from '../engine/relationEngine';
import { luminaryApi, readDemoKey, saveDemoKey } from '../luminary/client';
import { setAppCreationActive } from '../luminary/appCreationPresence';

type Turn = { role: string; text: string };
const GREETING = 'Welcome, Architect. I’m Luminary, your building companion. Tell me about the app you’d like to create: what should it help people do, and who will use it?';
export function AppCreationConversation({ catalog, onAccept }: { catalog: ApothecaryItem[]; onAccept: (proposal: AppProposal) => Promise<void> }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState<CreationAnswer | null>(null);
  const [draft, setDraft] = useState('');
  const [key, setKey] = useState(readDemoKey);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const accepting = useRef(false);
  const latest = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { setAppCreationActive(true); return () => setAppCreationActive(false); }, []);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { latest.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [turns, answer, error]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (request.current || accepting.current || !draft.trim()) return;
    if (!key.trim()) { setError('Enter the IDE demo key to connect to Luminary.'); return; }
    const next = [...turns, { role: 'architect', text: draft.trim() }];
    if (JSON.stringify(next).length > 12_000) { setError('This conversation is getting long. Shorten your description before continuing.'); return; }
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setAnswer(null);
    try {
      saveDemoKey(key.trim());
      const status = await luminaryApi.status(key.trim());
      if (controller.signal.aborted) return;
      if (!status.ok) throw Error(status.shortfall.message);
      if (!['meta', 'baseten'].includes(status.value.replySource)) throw Error('App planning needs a live Luminary connection. This gateway has no live model configured. Your description is still here.');
      const prompt = creationPrompt(next, catalog);
      if (new TextEncoder().encode(prompt).length > 48_000) throw Error('The catalog and conversation are too large for one planning request.');
      const result = await luminaryApi.ask(key.trim(), prompt, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) throw Error(result.shortfall.message);
      const response = parseCreationAnswer(result.value.reply.content, catalog);
      setTurns([...next, { role: 'luminary', text: [response.message, ...response.questions, ...response.suggestions.map(s => `Suggestion: ${s}`)].join('\n\n') }]);
      setAnswer(response); setDraft('');
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'The planning request could not be completed.');
    } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  async function accept() {
    if (!answer?.proposal || accepting.current || request.current) return;
    accepting.current = true; setApplying(true); setError('');
    try { await onAccept(answer.proposal); }
    catch (e) { setError(e instanceof Error ? e.message : 'The architecture could not be connected.'); }
    finally { accepting.current = false; setApplying(false); }
  }
  return <section aria-label="Create an app with Luminary" className="fixed z-40 top-24 bottom-24 left-4 right-4 md:left-auto md:right-[420px] md:w-[min(42rem,calc(100vw-450px))] flex flex-col rounded-3xl border border-amber-300/40 bg-slate-950/95 backdrop-blur-xl shadow-[0_0_60px_rgba(252,211,77,0.12)] text-slate-100 overflow-hidden">
    <header className="p-5 border-b border-amber-300/20"><p className="text-xs uppercase tracking-[0.2em] text-amber-200">A new beginning</p><h2 className="mt-2 text-xl font-orbitron">Let’s build your app</h2><p className="mt-2 text-sm text-slate-300">Describe it. Shape it together. Review your starting architecture.</p></header>
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4" aria-live="polite" aria-busy={busy}>
      <p className="text-sm leading-relaxed rounded-2xl bg-amber-300/5 border border-amber-300/20 p-4">{GREETING}</p>
      {turns.map((turn, index) => <div key={index} className={`rounded-2xl p-4 text-sm whitespace-pre-wrap ${turn.role === 'architect' ? 'bg-cyan-900/25 border border-cyan-500/20' : 'bg-slate-900 border border-amber-400/20'}`}><p className="text-xs text-slate-400 mb-2">{turn.role === 'architect' ? 'Architect' : 'Luminary'}</p>{turn.text}</div>)}
      {answer?.proposal && <div className="rounded-2xl border border-cyan-300/40 bg-cyan-950/20 p-4 space-y-3">
        <h3 className="text-lg text-cyan-200">{answer.proposal.name}</h3><p className="text-xs text-cyan-300">{answer.proposal.appType} · Starting architecture</p><p className="text-sm">{answer.proposal.purpose}</p>
        <ul className="space-y-3 text-sm">{answer.proposal.elements.map(e => <li key={e.id}><strong>{catalog.find(i => i.id === e.id)?.name}</strong><span className="block text-xs text-slate-400">{e.parentId ? `Inside ${catalog.find(i => i.id === e.parentId)?.name}` : 'Connected to CORE'}</span><span className="text-slate-300">{e.reason}</span></li>)}</ul>
        {answer.proposal.gaps.length > 0 && <div className="text-sm text-amber-200"><strong>Still to build or provide</strong><ul className="list-disc pl-5">{answer.proposal.gaps.map(g => <li key={g}>{g}</li>)}</ul></div>}
        <p className="text-xs text-slate-400">Accepting configures and connects these Elements. App code, execution and external services are separate build steps.</p>
        <button type="button" disabled={busy || applying} onClick={() => void accept()} className="btn-cyber px-4 py-2 rounded-xl text-sm disabled:opacity-50 flex gap-2 items-center"><Sparkles size={16} />{applying ? 'Connecting Elements…' : 'Accept starting architecture'}<ArrowRight size={16}/></button>
        <p className="text-xs text-slate-400">Want changes? Describe them below before accepting.</p>
      </div>}
      {busy && <p role="status" className="text-sm text-amber-200">Luminary is considering your app…</p>}
      {error && <p role="alert" className="text-sm text-rose-200 border border-rose-400/40 rounded-xl p-3">{error}</p>}
      <div ref={latest}/>
    </div>
    <form onSubmit={send} className="p-4 border-t border-amber-300/20 space-y-3">
      <details><summary className="text-xs text-slate-400 cursor-pointer">Luminary connection settings</summary><label className="block text-xs text-slate-300">IDE demo key<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" className="block w-full mt-1 bg-slate-900 rounded-lg border border-slate-700 p-2" /></label></details>
      <label className="sr-only" htmlFor="app-idea">Describe your app or answer Luminary</label>
      <textarea id="app-idea" autoFocus value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} rows={3} placeholder="I’d like to build an app that…" disabled={applying} className="w-full bg-slate-900 border border-slate-700 focus:border-amber-300 focus:outline-none rounded-xl p-3 text-sm resize-none"/>
      <div className="flex items-center justify-between gap-3"><p className="text-[11px] text-slate-400">Sent to your configured Luminary when you press Send.</p>{busy ? <button type="button" onClick={() => { request.current?.abort(); }} className="text-sm text-amber-200 flex gap-1 items-center"><Square size={14}/>Stop</button> : <button disabled={!draft.trim() || applying} className="btn-cyber rounded-xl px-4 py-2 text-sm disabled:opacity-40 flex gap-2 items-center"><Send size={14}/>Send</button>}</div>
    </form>
  </section>;
}
