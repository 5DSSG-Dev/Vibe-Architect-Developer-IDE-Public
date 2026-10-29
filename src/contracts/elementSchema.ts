/** Canonical vocabulary shared by the Apothecary, runtime and projections. */
export const ELEMENT_CATEGORIES = [
  'Ingredients', 'Formulas', 'Satellites', 'Actuators', 'Constellations',
  'Portals', 'Orbs', 'Cores', 'Umbilicals'
] as const;

export type ElementCategory = (typeof ELEMENT_CATEGORIES)[number];

export const ELEMENT_CONNECTION_KINDS = ['Umbilical', 'Tether', 'Mesh', 'Portal', 'Composed'] as const;
export type ElementConnectionKind = (typeof ELEMENT_CONNECTION_KINDS)[number];

export const SCENE_ENTITY_KINDS = ['core', 'orb', 'satellite', 'umbilical', 'portal'] as const;
export type SceneEntityKind = (typeof SCENE_ENTITY_KINDS)[number];

export const ADMIN_COMPONENT_KINDS = ['pod', 'orb', 'satellite', 'umbilical', 'portal'] as const;
export type AdminComponentKind = (typeof ADMIN_COMPONENT_KINDS)[number];
