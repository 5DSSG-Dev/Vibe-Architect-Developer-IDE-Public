import { useEffect, type RefObject } from 'react';

/**
 * The side drawers start tucked away, open when the Architect picks one, and tuck back once
 * they are done with it: a press anywhere outside the open drawer (the workspace, the other
 * drawer, a window it opened) or Escape closes it again, so the Aether workspace stays clear.
 */
export function useRetractWhenDone(ref: RefObject<HTMLElement>, isOpen: boolean, close: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.contains(document.activeElement)) close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, isOpen, close]);
}
