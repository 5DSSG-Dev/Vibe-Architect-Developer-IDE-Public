import React, { useEffect, useRef, useState } from 'react';
import { reopenBuildItem, verifyBuildItem, type AppBuildPlan } from '../engine/appBuildPlan';

interface Props {
  coreId: string;
  plan: AppBuildPlan;
  onChange: (plan: AppBuildPlan) => void;
  onSelect: (id: string) => void;
  onApothecary: () => void;
  isApothecaryOpen: boolean;
}
/** App-local construction guide. Opening an editor is never completion evidence. */
export function AppBuildJourney({ coreId, plan, onChange, onSelect, onApothecary, isApothecaryOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [evidence, setEvidence] = useState('');
  const [error, setError] = useState('');
  const listTrigger = useRef<HTMLButtonElement>(null);
  const reviewField = useRef<HTMLTextAreaElement>(null);
  const previousReviewTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 1000);
    return () => window.clearTimeout(timer);
  }, [coreId]);
  useEffect(() => { if (reviewing) reviewField.current?.focus(); }, [reviewing]);
  useEffect(() => { if (isApothecaryOpen && plan.invitation === 'entered') setGuideOpen(true); }, [isApothecaryOpen, plan.invitation]);
  const pending = plan.items.filter(item => !item.verification);
  const focused = pending.find(item => item.id === focusedId) ?? pending[0];
  const shortTask = focused?.text.split(/(?:\.\s|;\s|\n)/, 1)[0].slice(0, 110);
  const item = plan.items.find(item => item.id === reviewing);
  const focus = (id: string) => { setFocusedId(id); setGuideOpen(true); setOpen(false); onSelect(id); };
  const finishReview = () => {
    setReviewing(null); setEvidence(''); setError('');
    previousReviewTrigger.current?.focus();
  };
  const enter = () => {
    onChange({ ...plan, invitation: 'entered' });
    setOpen(false);
    if (focused) { setFocusedId(focused.id); onSelect(focused.id); }
    setGuideOpen(true);
    onApothecary();
  };
  return <>
    <aside aria-label="App build ToDo list" className="fixed z-30 left-4 top-20 w-[min(21rem,calc(100vw-2rem))] min-w-0 text-slate-100 pointer-events-none [&>*]:pointer-events-auto">
      <button ref={listTrigger} type="button" aria-expanded={open} aria-controls="app-build-todos"
        onClick={() => setOpen(!open)}
        className="rounded-xl border border-amber-300/40 bg-slate-950/95 px-4 py-2 text-sm shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
        ToDo ? {pending.length} remaining {open ? '?' : '+'}
      </button>
      {open && <section id="app-build-todos" className="mt-2 max-h-[calc(100dvh-7rem)] w-full min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain break-words [overflow-wrap:anywhere] rounded-2xl border border-amber-300/30 bg-slate-950/95 p-4 space-y-3 shadow-xl">
        <h2 className="font-semibold text-amber-200">{plan.proposal.name} ? build journey</h2>
        <p className="text-xs text-slate-300">Architecture accepted. Select an open item to flag Luminary with your agreed design. Checked items record your verification, not automated app certification.</p>
        <details className="rounded-xl border border-slate-700 p-3 text-xs">
          <summary className="cursor-pointer text-cyan-200">Review agreed design and interview</summary>
          <p className="mt-2 text-slate-200">{plan.proposal.purpose}</p>
          <ul className="mt-2 space-y-1">{plan.proposal.elements.map(element => <li key={element.id}>{element.id}: {element.reason}</li>)}</ul>
          <pre className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans select-text text-slate-300">{plan.decisions || 'No additional interview notes were recorded.'}</pre>
        </details>
        <ul className="space-y-3">{plan.items.map(todo => <li key={todo.id} className="rounded-xl border border-slate-700 p-3">
          <div className="flex items-start gap-3">
            <input type="checkbox" checked={Boolean(todo.verification)}
              aria-label={todo.verification ? 'Reopen: ' + todo.text : 'Review completion: ' + todo.text}
              onChange={event => {
                if (todo.verification) onChange(reopenBuildItem(plan, todo.id));
                else { previousReviewTrigger.current = event.currentTarget; setReviewing(todo.id); setEvidence(''); setError(''); }
              }}
              className="mt-1 h-5 w-5 shrink-0 accent-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200" />
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => focus(todo.id)}
                className="block w-full min-w-0 break-words [overflow-wrap:anywhere] text-left text-sm leading-relaxed hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
                <span className={todo.verification ? 'text-emerald-200' : ''}>{todo.text.slice(0, 110)}{todo.text.length > 110 ? '…' : ''}</span>
                <span className="block mt-1 text-xs text-cyan-200">{todo.verification ? 'Architect verified · ' + new Date(todo.verification.at).toLocaleDateString() : 'Select for guidance →'}</span>
              </button>
              {todo.text.length > 110 && <details className="mt-2 text-xs text-slate-300"><summary className="cursor-pointer">Read full task</summary><p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{todo.text}</p></details>}
            </div>
          </div>
          {todo.verification && <p className="mt-2 text-xs text-slate-300 whitespace-pre-wrap">{todo.verification.evidence}</p>}
        </li>)}</ul>
        {item && <form onSubmit={event => {
          event.preventDefault();
          try { onChange(verifyBuildItem(plan, item.id, evidence)); finishReview(); }
          catch (e) { setError(e instanceof Error ? e.message : 'Verification could not be recorded.'); }
        }} className="rounded-xl border border-emerald-300/30 p-3 space-y-2">
          <h3 className="text-sm text-emerald-200">Verify completion</h3>
          <p className="text-xs">{item.text}</p>
          <label htmlFor="todo-verification" className="block text-xs text-slate-300">What did you check, and what result confirmed it works?</label>
          <textarea id="todo-verification" ref={reviewField} rows={3} maxLength={2000} value={evidence} onChange={e => setEvidence(e.target.value)} className="w-full rounded-lg bg-slate-900 p-2 text-sm border border-slate-600 focus:border-amber-200" />
          {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
          <div className="flex flex-wrap gap-2"><button disabled={!evidence.trim()} className="rounded-lg border border-emerald-300/40 px-3 py-2 text-xs disabled:opacity-40">I verified this item</button><button type="button" onClick={finishReview} className="rounded-lg border border-slate-600 px-3 py-2 text-xs">Keep open</button></div>
        </form>}
        <button type="button" onClick={enter} className="w-full rounded-xl border border-cyan-300/50 px-3 py-2 text-sm text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">Continue to Apothecary</button>
      </section>}
    </aside>
    {guideOpen && focused && !isApothecaryOpen && <section role="status" aria-label="Luminary build guide" className="fixed z-40 top-36 right-2 sm:right-4 w-[min(22rem,calc(100vw-1rem))] max-h-[calc(100dvh-16rem)] overflow-y-auto break-words [overflow-wrap:anywhere] rounded-2xl border border-amber-300/50 bg-slate-950/95 p-4 text-slate-100 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-amber-200">Luminary · next build step</p><button type="button" aria-label="Dismiss build guide" onClick={() => setGuideOpen(false)} className="rounded px-2 text-slate-300 hover:text-white">×</button></div>
      <p className="mt-2 text-sm">Okay, let's build the Elements on your ToDo list to get your app running. We can begin with:</p>
      <p className="mt-2 text-sm font-semibold text-cyan-100">{shortTask}{focused.text.length > 110 ? '…' : ''}</p>
      <p className="mt-2 text-xs text-slate-300">I have this item ready as context. Open the Luminary conversation to ask how to create it, or read the full task in ToDo.</p>
      <button type="button" onClick={() => { setOpen(true); setGuideOpen(false); listTrigger.current?.focus(); }} className="mt-3 rounded-lg border border-cyan-300/50 px-3 py-2 text-xs">Show ToDo and full task</button>
    </section>}
    {revealed && plan.invitation === 'pending' && pending.length > 0 && <section role="region" aria-labelledby="apothecary-invitation" aria-live="polite"
      className="fixed z-40 top-28 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-amber-300/40 bg-slate-950/95 p-5 text-slate-100 shadow-2xl">
      <p className="text-xs text-amber-200">Luminary ? your next step</p>
      <h2 id="apothecary-invitation" className="mt-2 text-lg font-semibold">Your starting architecture is in place.</h2>
      <p className="mt-3 text-sm leading-relaxed">Take a look at your CORE and its connected Elements. Your app still has work to complete and verify before it is ready. I have added that work to my ToDo list, including any Elements to build or edit.</p>
      <p className="mt-3 text-sm">Ready to enter the Apothecary?</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={enter} className="rounded-xl border border-amber-300/60 bg-amber-300/10 px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Yes, take me there</button>
        <button type="button" onClick={() => { onChange({ ...plan, invitation: 'exploring' }); listTrigger.current?.focus(); }} className="rounded-xl border border-slate-500 px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Not yet, I want to look around first</button>
      </div>
    </section>}
  </>;
}
