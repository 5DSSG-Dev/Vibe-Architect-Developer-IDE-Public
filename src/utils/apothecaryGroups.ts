import { ApothecaryItem, CategoryType } from '../engine/relationEngine';

/**
 * Display order for Apothecary sections: the docking path first (Orb, then
 * what composes into it), then boundary and infrastructure Elements.
 */
export const CATEGORY_ORDER: CategoryType[] = [
  'Orbs',
  'Satellites',
  'Actuators',
  'Constellations',
  'Formulas',
  'Ingredients',
  'Portals',
  'Cores',
  'Umbilicals'
];

export interface CatalogGroup {
  category: CategoryType;
  items: ApothecaryItem[];
}

/** Groups items by category in CATEGORY_ORDER, keeping each group's input order and dropping empty groups. */
export function groupCatalogByCategory(items: ApothecaryItem[]): CatalogGroup[] {
  const groups = new Map<CategoryType, ApothecaryItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  const rank = (category: CategoryType) => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([category, list]) => ({ category, items: list }));
}
