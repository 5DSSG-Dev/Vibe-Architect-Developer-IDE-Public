import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Aether } from '../engine/Aether';
import { createBlankApp } from '../engine/appCreation';
import { WORKSPACE_KEY, readApps, saveCurrentApp, activateApp, reopenImportedApp, readAppFile } from '../utils/appFiles';

/** Set before a reload that should land in the workspace, not back on this screen. */
export const WELCOME_SKIP_KEY = 'vibe.welcome.skip';

/** Matches the Atlas welcome page: the same Aether field, lifted so it reads as a backdrop. */
const WELCOME_AETHER_BRIGHTNESS = 7;

interface WelcomeScreenProps {
  /** True when the Architect closed their app: Resume then reopens the most recent saved app. */
  closed: boolean;
  /** Continue into the workspace already loaded for this session (launch Resume). */
  onContinue: () => void;
}

/** Full-bleed Aether background. Falls back to a still gradient when WebGL is unavailable. */
function useAetherBackground(canvas: React.RefObject<HTMLCanvasElement>, onFallback: () => void) {
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: element, antialias: false, alpha: false });
    } catch {
      onFallback();
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const aether = new Aether(scene, { backgroundBrightness: WELCOME_AETHER_BRIGHTNESS });
    aether.setSize(window.innerWidth, window.innerHeight);
    const clock = new THREE.Clock();
    let frame = 0;

    const draw = () => { aether.update(clock.getElapsedTime()); renderer.render(scene, camera); };
    const loop = () => { frame = requestAnimationFrame(loop); draw(); };
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      aether.setSize(window.innerWidth, window.innerHeight);
      if (reduceMotion) draw();
    };
    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) cancelAnimationFrame(frame); else loop();
    };
    const onContextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); onFallback(); };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    element.addEventListener('webglcontextlost', onContextLost);
    if (reduceMotion) draw(); else loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      element.removeEventListener('webglcontextlost', onContextLost);
      renderer.dispose();
    };
  }, [canvas, onFallback]);
}

/**
 * Launch and close-app welcome. Offers New App, Resume last app and Open existing app.
 * There is deliberately no Quit: the Architect leaves the browser tab itself.
 */
export function WelcomeScreen({ closed, onContinue }: WelcomeScreenProps) {
  const [error, setError] = useState('');
  const [stillBackground, setStillBackground] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const goStill = useRef(() => setStillBackground(true)).current;
  useAetherBackground(canvas, goStill);
  const hasSavedWork = (() => { try { return Boolean(localStorage.getItem(WORKSPACE_KEY)); } catch { return false; } })();

  // Reload into the workspace, skipping this screen once. Errors stay on screen.
  const reloadInto = (action: () => void) => {
    try {
      action();
      sessionStorage.setItem(WELCOME_SKIP_KEY, 'true');
      window.location.reload();
    } catch (e) { setError((e as Error).message); }
  };

  const newApp = () => reloadInto(() => {
    saveCurrentApp(localStorage);
    activateApp(localStorage, { version: 2, coreManifest: createBlankApp(), apothecaryCatalog: [], navigation: { environmentIds: [] } });
  });

  const resume = () => {
    if (!closed) { onContinue(); return; }
    reloadInto(() => {
      const [latest] = readApps(localStorage);
      if (!latest) throw new Error('There is no saved app to resume. Open an app file or start a new one.');
      activateApp(localStorage, latest.snapshot, latest.id);
    });
  };

  const onFile = async (selected: File) => {
    try {
      if (selected.size > 10_000_000) throw new Error('Choose an app file smaller than 10 MB.');
      const snapshot = readAppFile(await selected.text());
      reloadInto(() => reopenImportedApp(localStorage, snapshot));
    } catch (e) { setError((e as Error).message); }
  };

  // Atlas welcome styling: gold heading, dark panel with a gold rule, gradient primary action.
  const option = 'block w-full rounded-full border border-[#f7d98b]/60 bg-[linear-gradient(#2a3a8a,#1b2560)] px-6 py-3 text-left text-[#fff6dc] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#08010f] focus-visible:ring-[#9be8ff] disabled:opacity-40 disabled:cursor-not-allowed';
  const secondary = 'block w-full rounded-full border border-[#e8be5a]/45 bg-[#0c0e1e]/80 px-6 py-3 text-left text-[#f4ecd8] hover:bg-[#1b2560]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#08010f] focus-visible:ring-[#9be8ff] disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <main aria-label="Welcome" className="relative w-screen h-screen overflow-hidden text-[#f4ecd8] font-serif flex items-center justify-center p-6" style={{ background: '#08010f' }}>
      <canvas ref={canvas} aria-hidden="true" className={`fixed inset-0 w-screen h-screen pointer-events-none ${stillBackground ? 'hidden' : ''}`} />
      {stillBackground && <div aria-hidden="true" className="fixed inset-0" style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(90,60,180,.35), transparent 60%), radial-gradient(ellipse at 75% 60%, rgba(40,120,200,.25), transparent 55%), #08010f' }} />}

      <section aria-labelledby="welcome-title" className="relative z-10 w-full max-w-lg rounded-2xl border border-[#e8be5a]/45 bg-[#0c0e1e]/85 p-8 shadow-[0_0_60px_rgba(232,190,90,0.08)] space-y-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9be8ff]">Vibe Architect</p>
          <h1 id="welcome-title" className="text-3xl text-[#f7d98b] tracking-wide">{closed ? 'Your app is closed' : 'Welcome, Architect.'}</h1>
          <p className="text-base leading-relaxed">Start something new, pick up where you left off, or open an app you saved.</p>
        </header>

        <div className="space-y-3">
          <button type="button" className={option} onClick={newApp}>
            <span className="block text-base font-semibold">New App</span>
            <span className="block text-sm text-[#f4ecd8]/80">Describe your idea to Luminary and shape the starting architecture.</span>
          </button>
          <button type="button" className={secondary} onClick={resume} disabled={!closed && !hasSavedWork}>
            <span className="block text-base font-semibold">Resume last app</span>
            <span className="block text-sm text-[#f4ecd8]/80">{closed ? 'Reopen the app you closed most recently.' : 'Continue in the app you were working on.'}</span>
          </button>
          <button type="button" className={secondary} onClick={() => file.current?.click()}>
            <span className="block text-base font-semibold">Open existing app</span>
            <span className="block text-sm text-[#f4ecd8]/80">Choose a .vibe-app.json file you exported earlier.</span>
          </button>
          <input ref={file} type="file" accept=".json,application/json" className="hidden" aria-label="Open existing app file"
            onChange={e => { const selected = e.target.files?.[0]; e.target.value = ''; if (selected) void onFile(selected); }} />
        </div>

        {error && <p role="alert" className="text-sm text-rose-200 border border-rose-400/40 rounded-xl p-3">{error}</p>}
      </section>
    </main>
  );
}
