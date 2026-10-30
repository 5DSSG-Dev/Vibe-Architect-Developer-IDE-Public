import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { clearBubble, currentBubble, subscribeBubble } from '../luminary/bubble';
import { isLuminaryEngaged, subscribeLuminaryEngaged } from '../luminary/presence';

/** How long the words stay before the bubble fades. */
const BUBBLE_MS = 14_000;

/**
 * The Luminary's dialogue bubble (STP-0002 P26), above the 3D Presence in the lower right of the
 * workspace (src/three/luminaryPresence.ts, PRESENCE_SCREEN_OFFSET), clear of the Full Form, which
 * opens to its left. Shown only while the Luminary is engaged; pressing it dismisses it.
 */
export const LuminaryBubble: React.FC = () => {
  const engaged = useSyncExternalStore(subscribeLuminaryEngaged, isLuminaryEngaged);
  const line = useSyncExternalStore(subscribeBubble, currentBubble);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setFading(false);
    if (!line) return;
    const fade = window.setTimeout(() => setFading(true), BUBBLE_MS);
    const gone = window.setTimeout(() => clearBubble(), BUBBLE_MS + 1_200);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
    };
  }, [line]);

  useEffect(() => {
    if (!engaged) clearBubble();
  }, [engaged]);

  if (!engaged || !line) return null;
  return (
    <button
      type="button"
      key={line.id}
      onClick={() => clearBubble()}
      title="The full words are in the Luminary panel. Press to dismiss."
      aria-live="polite"
      className={`hidden md:block fixed z-20 right-[60px] bottom-[560px] w-56 text-left font-mono rounded-2xl panel-glass legible-glass border border-amber-400/50 shadow-[0_0_30px_rgba(252,211,77,0.2)] px-3 py-2 text-[11px] leading-relaxed text-amber-50 motion-safe:animate-modal-zoom motion-safe:transition-opacity motion-safe:duration-1000 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* At most four lines (about 90px), so on a short screen the bubble stays below the top bar. */}
      <span className="line-clamp-4">{line.text}</span>
      <span aria-hidden="true" className="absolute -bottom-2 right-24 w-4 h-4 rotate-45 bg-slate-900/90 border-r border-b border-amber-400/50" />
    </button>
  );
};
