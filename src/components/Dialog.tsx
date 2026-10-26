import React, { useEffect, useRef } from 'react';

interface DialogProps {
  /** Accessible name announced for the dialog. */
  label: string;
  onClose: () => void;
  /** Classes for the full-screen container (position, z-index, padding). */
  className: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal shell for every IDE overlay: dialog role, aria-modal, Escape to
 * close, Tab kept inside the dialog, and focus restored to whatever opened it.
 */
export const Dialog: React.FC<DialogProps> = ({ label, onClose, className, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const root = rootRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (root && !root.contains(document.activeElement)) {
      const first = root.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? root).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, []);

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`${className} outline-none`}>
      {children}
    </div>
  );
};
