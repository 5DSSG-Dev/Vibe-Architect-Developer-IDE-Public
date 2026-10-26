import React, { useEffect, useRef, useState } from 'react';
import { Minimize2 } from 'lucide-react';

/**
 * App-level presence host for the Vibe Luminary, mounted outside the mode
 * views so it is present in every mode and every drill-down Environment.
 *
 * Two scales of one identity (Luminary Behavior Contract v0.1, section 1):
 * the Paused Icon (golden Locus-core in the corner) and the Full Form. The
 * Architect controls presence: it starts paused and never raises itself.
 *
 * This host fixes where the Luminary lives. What it does is section 6 (AI
 * Integration and Luminary Presence); until then the Full Form states
 * truthfully that no reasoning provider is connected and nothing is observed.
 */
export const LuminaryHost: React.FC = () => {
  const [isEngaged, setIsEngaged] = useState(false);
  const iconRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const wasEngaged = useRef(false);

  useEffect(() => {
    if (isEngaged) {
      formRef.current?.focus();
    } else if (wasEngaged.current) {
      iconRef.current?.focus();
    }
    wasEngaged.current = isEngaged;
  }, [isEngaged]);

  const core = (size: string) => (
    <span
      aria-hidden="true"
      className={`${size} rounded-full bg-[radial-gradient(circle_at_40%_35%,#fff7d6_0%,#fcd34d_35%,#b45309_75%,transparent_100%)] shadow-[0_0_18px_rgba(252,211,77,0.55)]`}
    />
  );

  return (
    // The Paused Icon sits in the status bar's left corner; the Full Form opens
    // above it.
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
          className="absolute left-0 bottom-10 w-72 panel-glass legible-glass rounded-2xl border border-amber-400/40 shadow-[0_0_40px_rgba(252,211,77,0.15)] p-3 space-y-2 outline-none motion-safe:animate-modal-zoom"
        >
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {core('w-6 h-6')}
              <h2 className="font-orbitron text-xs font-bold tracking-wider text-amber-200 uppercase">Vibe Luminary</h2>
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
          <p className="text-[11px] text-slate-200 leading-relaxed">
            Present in every mode. No reasoning provider is connected yet, so the Luminary cannot answer or act.
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Nothing is observed or sent while paused or engaged. Capabilities arrive with review section 6, AI
            Integration and Luminary Presence.
          </p>
        </section>
      ) : (
        <button
          ref={iconRef}
          onClick={() => setIsEngaged(true)}
          aria-label="Engage the Vibe Luminary"
          aria-expanded={false}
          title="Vibe Luminary (paused)"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-950/80 border border-amber-400/40 hover:border-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {core('w-4 h-4')}
        </button>
      )}
    </div>
  );
};
