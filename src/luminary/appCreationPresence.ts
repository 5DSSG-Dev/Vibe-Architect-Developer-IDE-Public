let active = false;
const listeners = new Set<() => void>();
export const isAppCreationActive = () => active;
export function setAppCreationActive(value: boolean) {
  if (active === value) return;
  active = value;
  listeners.forEach(listener => listener());
}
export function subscribeAppCreationActive(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
