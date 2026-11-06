import React, { useEffect, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { clearBubble, currentBubble, subscribeBubble } from '../luminary/bubble';
import { isLuminaryEngaged, subscribeLuminaryEngaged } from '../luminary/presence';
import { isAppCreationActive, subscribeAppCreationActive } from '../luminary/appCreationPresence';

/**
 * The Luminary's dialogue bubble (STP-0002 P26), above the 3D Presence in the lower right of the
 * workspace (src/three/luminaryPresence.ts, PRESENCE_SCREEN_OFFSET), clear of the Full Form, which
 * opens to its left. Words remain until dismissed, replaced, or the Luminary is paused.
 */
export const LuminaryBubble: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const engaged = useSyncExternalStore(subscribeLuminaryEngaged, isLuminaryEngaged);
  const appCreationActive = useSyncExternalStore(subscribeAppCreationActive, isAppCreationActive);
  const line = useSyncExternalStore(subscribeBubble, currentBubble);

  useEffect(() => {
    if (!engaged) clearBubble();
  }, [engaged]);

  if (!engaged || !line || appCreationActive) return null;
  return (
    <aside
      key={line.id}
      aria-label="Luminary speech bubble"
      className={`${embedded ? 'relative md:hidden shrink-0 w-full' : 'hidden md:block fixed z-[70] right-[100px] bottom-[min(690px,calc(100dvh-12rem))] w-80'} text-left rounded-2xl bg-slate-950/95 border border-amber-300/70 shadow-[0_8px_40px_rgba(252,211,77,0.22)] px-4 py-3 text-sm leading-relaxed text-amber-50 motion-safe:animate-modal-zoom`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="font-orbitron text-xs tracking-wide text-amber-200">Luminary</span>
        <button type="button" onClick={() => clearBubble()} aria-label="Dismiss Luminary speech bubble" className="rounded-md p-1 text-slate-300 hover:text-amber-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className={`${embedded ? 'max-h-20' : 'max-h-[min(12rem,calc(100dvh-16rem))]'} overflow-y-auto break-words`}>{line.text}</p>
      <span aria-hidden="true" className={embedded ? 'absolute -left-1.5 top-5 w-3 h-3 rotate-45 bg-slate-950 border-l border-b border-amber-300/70' : 'absolute -bottom-2 right-24 w-4 h-4 rotate-45 bg-slate-950 border-r border-b border-amber-300/70'} />
    </aside>
  );
};
