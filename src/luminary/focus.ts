// The Luminary's focus (STP-0002 N57): what the Architect has open is what the Luminary is asked
// about. An open Element page (its information, Edit, or Code Frame) comes first, then the
// Environment the Architect is inside, then an Element being attached. A page that has closed no
// longer counts, even though the IDE still remembers which Element it showed.

import type { ApothecaryItem } from '../engine/relationEngine';
import { describeElement } from './knowledge';

export interface FocusInput {
  /** The Element whose page is open, or null when no Element page is open. */
  openPageItem: ApothecaryItem | null;
  currentEnvironment: ApothecaryItem | null;
  attachingItem: ApothecaryItem | null;
}

export interface LuminaryFocus {
  /** Changes whenever the focus moves, so a chip the Architect removed stays removed only for it. */
  key: string;
  label: string;
  text: string;
}

export function luminaryFocus(input: FocusInput, catalog: readonly ApothecaryItem[]): LuminaryFocus | undefined {
  const [item, where] = input.openPageItem
    ? [input.openPageItem, 'page']
    : input.currentEnvironment
      ? [input.currentEnvironment, 'environment']
      : input.attachingItem
        ? [input.attachingItem, 'attaching']
        : [null, ''];
  if (!item) return undefined;
  return {
    key: `${where}:${item.id}`,
    label: where === 'environment' ? `Inside: ${item.name}` : `Looking at: ${item.name}`,
    // The same wording as the Knowledge Pack (P23), with its Satellites or Actuators named.
    text: describeElement(item, catalog),
  };
}
