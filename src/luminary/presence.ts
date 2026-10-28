// One shared fact for the Luminary's two surfaces (STP-0002 P19, N28): whether the Architect has
// engaged it. The corner panel and the 3D Presence in the Aether workspace read and set the same
// value, so the Luminary is one identity in two places. Only the Architect's action changes it.

type Listener = (engaged: boolean) => void;

let engaged = false;
const listeners = new Set<Listener>();

export function isLuminaryEngaged(): boolean {
  return engaged;
}

export function setLuminaryEngaged(next: boolean): void {
  if (next === engaged) return;
  engaged = next;
  for (const listener of listeners) listener(engaged);
}

export function subscribeLuminaryEngaged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
