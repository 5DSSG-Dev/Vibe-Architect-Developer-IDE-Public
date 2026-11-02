import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createInitialCoreManifest } from '../engine/relationEngine';
import { WORKSPACE_KEY, readApps, saveCurrentApp, activateApp, closeApp, deleteApp, readAppFile, type SavedApp } from '../utils/appFiles';

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(false);
  const [apps, setApps] = useState<SavedApp[]>([]);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const closed = localStorage.getItem('vibe.apps.closed') === 'true';
  useEffect(() => {
    if (!open) return;
    const pointer = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key); };
  }, [open]);
  const run = (action: () => void) => { try { action(); setError(''); setOpen(false); } catch (e) { setError((e as Error).message); } };
  const reload = () => window.location.reload();
  const itemClass = 'block w-full text-left px-4 py-2.5 text-xs text-slate-100 hover:bg-cyan-500/15 focus-visible:bg-cyan-500/15 disabled:opacity-40 disabled:cursor-not-allowed';
  return <div ref={root} className="relative font-mono">
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="app-menu" onClick={() => { setRecent(false); setOpen(!open); }} className="btn-cyber px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">App <ChevronDown className="w-3 h-3" /></button>
    <input ref={file} type="file" accept=".json,application/json" className="hidden" aria-label="Open App file" onChange={async e => {
      const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return;
      try { if (selected.size > 10_000_000) throw new Error('Choose an app file smaller than 10 MB.'); const snapshot = readAppFile(await selected.text()); saveCurrentApp(localStorage); activateApp(localStorage, snapshot); reload(); }
      catch (e) { setError((e as Error).message); }
    }} />
    {open && <div id="app-menu" className="absolute right-0 top-full mt-2 w-64 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border border-cyan-500/30 bg-slate-950 shadow-2xl py-1 z-50" aria-label="App actions">
      <button className={itemClass} onClick={() => run(() => {
        const name = window.prompt('Name your new app', 'Untitled App'); if (name === null) return;
        if (!name.trim() || name.trim().length > 80) throw new Error('Use an app name of 1–80 characters.');
        saveCurrentApp(localStorage);
        const coreManifest = createInitialCoreManifest(); coreManifest.name = name.trim();
        activateApp(localStorage, { version: 2, coreManifest, apothecaryCatalog: [], navigation: { environmentIds: [] } }); reload();
      })}>New App</button>
      <button className={itemClass} onClick={() => { file.current?.click(); setOpen(false); }}>Open App…</button>
      <button className={itemClass} aria-expanded={recent} onClick={() => { try { setApps(readApps(localStorage)); setRecent(!recent); } catch (e) { setError((e as Error).message); } }}>Open Recent <span className="float-right">{recent ? '−' : '+'}</span></button>
      {recent && <div className="bg-slate-900/70 border-y border-slate-800 py-1">
        {apps.length === 0 && <p className="px-4 py-2 text-xs text-slate-400">No saved apps yet.</p>}
        {apps.map(app => <button key={app.id} className={itemClass} onClick={() => run(() => { saveCurrentApp(localStorage); activateApp(localStorage, app.snapshot, app.id); reload(); })}>{app.snapshot.coreManifest.name}</button>)}
      </div>}
      <button disabled={closed} className={itemClass} onClick={() => run(() => { closeApp(localStorage); reload(); })}>Close App</button>
      <button disabled={closed} className={itemClass} onClick={() => run(() => {
        saveCurrentApp(localStorage); const raw = localStorage.getItem(WORKSPACE_KEY); if (!raw) throw new Error('There is no app to export.');
        const snapshot = readAppFile(raw); const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = `${snapshot.coreManifest.name.replace(/[^a-z0-9_-]/gi, '-') || 'app'}.vibe-app.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      })}>Export App</button>
      <button disabled={closed} className={itemClass + ' !text-rose-300'} onClick={() => run(() => { if (window.confirm('Delete this app from this browser? Exported files will remain.')) { deleteApp(localStorage); reload(); } })}>Delete App</button>
      <div className="border-t border-slate-800 my-1" />
      <button className={itemClass} onClick={() => run(() => { closeApp(localStorage); window.close(); setTimeout(() => { window.alert('Your app is saved. You can now close this browser tab.'); reload(); }, 100); })}>Close IDE</button>
    </div>}
    {error && <div role="alert" className="absolute right-0 top-full mt-2 w-72 bg-slate-950 border border-rose-400 rounded-lg p-3 text-xs text-rose-200 z-[60]">{error}<button className="block mt-2 underline" onClick={() => setError('')}>Dismiss</button></div>}
  </div>;
}
