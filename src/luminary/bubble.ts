// The Luminary's dialogue bubble (STP-0002 P26). While the Architect has the Luminary open, its
// newest words appear in a bubble beside the 3D Presence. Only words already shown in the panel go
// here: a reply that passed the gauge, or a connection moment (P24). At rest there is no bubble
// (D4.2). The Architect chooses where the Luminary speaks: the panel, the bubble, or both.

export type SpeakIn = 'panel' | 'bubble' | 'both';

export const SPEAK_IN_OPTIONS: readonly SpeakIn[] = ['panel', 'bubble', 'both'];
export const SPEAK_IN_LABELS: Record<SpeakIn, string> = { panel: 'Panel', bubble: 'Bubble', both: 'Both' };

const SPEAK_IN_STORAGE = 'vibe-luminary-speak-in';
const BUBBLE_CHARS = 220;

export function readSpeakIn(): SpeakIn {
  try {
    const stored = localStorage.getItem(SPEAK_IN_STORAGE);
    return stored === 'panel' || stored === 'bubble' ? stored : 'both';
  } catch {
    return 'both';
  }
}

export function saveSpeakIn(value: SpeakIn): void {
  try {
    localStorage.setItem(SPEAK_IN_STORAGE, value);
  } catch {
    // Without storage the choice still applies for this visit.
  }
}

/**
 * The words for the bubble: code blocks left out, then the first sentences up to a short length.
 * Anything left out is pointed to the panel, so the bubble never stands in for the full reply.
 */
export function bubbleText(content: string): string {
  const withoutCode = content.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
  const hadCode = withoutCode.length < content.replace(/\s+/g, ' ').trim().length;
  const sentences = withoutCode.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [];
  let text = '';
  for (const sentence of sentences) {
    const next = `${text}${sentence}`.trim();
    if (next.length > BUBBLE_CHARS) break;
    text = `${next} `;
  }
  text = text.trim();
  if (!text && withoutCode) text = `${withoutCode.slice(0, BUBBLE_CHARS - 1).trimEnd()}…`;
  const shortened = text.length < withoutCode.length || hadCode;
  if (!text) return hadCode ? 'I wrote some code. It is in the panel.' : '';
  return shortened ? `${text} (More in the panel.)` : text;
}

export interface BubbleLine {
  id: number;
  text: string;
}

type Listener = (line: BubbleLine | null) => void;

let current: BubbleLine | null = null;
let nextId = 0;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener(current));

/** Show words in the bubble. Empty text clears it. */
export function sayInBubble(text: string): void {
  current = text.trim() ? { id: ++nextId, text: text.trim() } : null;
  notify();
}

export function clearBubble(): void {
  if (current === null) return;
  current = null;
  notify();
}

export function currentBubble(): BubbleLine | null {
  return current;
}

export function subscribeBubble(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
