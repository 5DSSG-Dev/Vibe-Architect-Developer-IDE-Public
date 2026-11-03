/** Keep a three-choice shelf stable while replacing an accepted suggestion. */
export function nextAppSuggestions(current: readonly string[], incoming: readonly string[], selected: string | undefined, used: readonly string[]): string[] {
  const key = (s: string) => s.trim().toLocaleLowerCase();
  const excluded = new Set([...used, ...(selected ? [selected] : [])].map(key));
  const seen = new Set(excluded);
  const distinct = (values: readonly string[]) => values.flatMap(value => {
    const text = value.trim(), id = key(text);
    if (!text || seen.has(id)) return [];
    seen.add(id); return [text];
  });
  if (!selected) return distinct(incoming).slice(0, 3);
  // Preserve existing unchosen slots and fill the chosen slot first.
  const kept = current.map(value => excluded.has(key(value)) ? null : value);
  for (const value of kept) if (value) seen.add(key(value));
  const fresh = distinct(incoming);
  const result: string[] = [];
  for (const value of kept.slice(0, 3)) {
    const next = value ?? fresh.shift();
    if (next) result.push(next);
  }
  return [...result, ...fresh].slice(0, 3);
}
