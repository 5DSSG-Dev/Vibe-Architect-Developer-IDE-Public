import React from 'react';

/**
 * The founding purpose, shown first on the first-launch IDE screen (the draft interview is the
 * IDE's welcome surface in this checkout). It introduces who the IDE is for and three ways to
 * begin. It does not block the interview: it sits beside it and nothing here is required.
 */
export function IdeWelcomePurpose({ onOpenAtlas, onFocusLuminary }: {
  onOpenAtlas: (target: 'welcome' | 'purpose') => void;
  onFocusLuminary: () => void;
}) {
  return (
    <section
      aria-labelledby="ide-purpose-title"
      className="fixed left-5 top-24 z-40 w-[min(22rem,calc(100vw-2.5rem))] max-h-[calc(100vh-7.5rem)] overflow-y-auto rounded-2xl border border-amber-400/40 bg-slate-950/90 p-5 text-slate-100 shadow-[0_0_32px_rgba(251,191,36,0.12)] backdrop-blur-sm"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Vibe Architect</p>
      <h2 id="ide-purpose-title" className="mt-1 font-serif text-2xl leading-snug text-amber-200">
        You may already think like an Architect.
      </h2>
      <blockquote className="mt-3 border-l-2 border-amber-400/50 pl-3 text-sm leading-relaxed text-slate-100">
        I created Vibe Architect to open a door into software development for people who think in systems but find code intimidating.
        My particular focus is on neurodivergent thinkers, including autistic and ADHD individuals like me.
      </blockquote>
      <p className="mt-2 text-xs text-amber-200/80">— Tracey Prutch, Creator of Vibe Architect</p>
      <button
        type="button"
        onClick={() => onOpenAtlas('purpose')}
        className="mt-3 rounded-lg border border-amber-400/50 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:border-amber-300/80 focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        Why I built Vibe Architect
      </button>

      <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">How to begin</h3>
      <ol className="mt-2 space-y-3 text-sm">
        <li className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3">
          <span className="block font-semibold text-cyan-100">Start with your idea</span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-300">
            Talk with the Luminary, your AI guide, about what you’d like to build.
          </span>
          <button
            type="button"
            onClick={onFocusLuminary}
            className="mt-2 rounded-md border border-cyan-500/40 px-2.5 py-1 text-xs text-cyan-100 hover:border-cyan-400/70 focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Talk with Luminary
          </button>
        </li>
        <li className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3">
          <span className="block font-semibold text-cyan-100">See it take shape</span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-300">
            Your architecture is a 3D scene. Arrange its parts and connect them to watch your system form.
          </span>
        </li>
        <li className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3">
          <span className="block font-semibold text-cyan-100">Explore the Vibe Atlas</span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-300">
            The Vibe Atlas is the library of guides, principles, and background behind the IDE: how to navigate it, AEGIS (the framework of principles and governance used to guide AI interactions), and Building the Vibe.
          </span>
          <button
            type="button"
            onClick={() => onOpenAtlas('welcome')}
            className="mt-2 rounded-md border border-cyan-500/40 px-2.5 py-1 text-xs text-cyan-100 hover:border-cyan-400/70 focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Open the Vibe Atlas
          </button>
        </li>
      </ol>
    </section>
  );
}
