/**
 * Canonical vocabulary shared by the catalog, scene, admin projection, and
 * Totem-facing Element records. This is a type/schema source only; it does not
 * define connection negotiation or runtime behavior.
 */
export const ELEMENT_SCHEMA = {
  pod: { catalogCategory: null, sceneKind: null, componentKind: 'pod' },
  core: { catalogCategory: 'Cores', sceneKind: 'core', componentKind: null },
  orb: { catalogCategory: 'Orbs', sceneKind: 'orb', componentKind: 'orb' },
  satellite: { catalogCategory: 'Satellites', sceneKind: 'satellite', componentKind: 'satellite' },
  actuator: { catalogCategory: 'Actuators', sceneKind: null, componentKind: null },
  umbilical: { catalogCategory: 'Umbilicals', sceneKind: 'umbilical', componentKind: 'umbilical' },
  portal: { catalogCategory: 'Portals', sceneKind: 'portal', componentKind: 'portal' },
  constellation: { catalogCategory: 'Constellations', sceneKind: null, componentKind: null },
} as const;

/** Catalog groupings that are not Elements still live beside the canonical schema. */
export const CATALOG_ONLY_CATEGORIES = ['Ingredients', 'Formulas'] as const;

export const ELEMENT_CONNECTION_KINDS = [
  'Umbilical',
  'Tether',
  'Mesh',
  'Portal',
  'Composed',
] as const;

type ElementSchemaEntry = (typeof ELEMENT_SCHEMA)[keyof typeof ELEMENT_SCHEMA];

export type ElementKind = keyof typeof ELEMENT_SCHEMA;
export type ElementConnectionKind = (typeof ELEMENT_CONNECTION_KINDS)[number];
export type ElementCatalogCategory =
  | NonNullable<ElementSchemaEntry['catalogCategory']>
  | (typeof CATALOG_ONLY_CATEGORIES)[number];
export type SceneElementKind = NonNullable<ElementSchemaEntry['sceneKind']>;
export type AdminComponentKind = NonNullable<ElementSchemaEntry['componentKind']>;

/** Totem records use the same canonical Element names as the rest of the IDE. */
export type TotemKind = ElementKind;

export const ELEMENT_CATALOG_CATEGORIES: readonly ElementCatalogCategory[] = Object.freeze(
  [...new Set([
    ...CATALOG_ONLY_CATEGORIES,
    ...Object.values(ELEMENT_SCHEMA).flatMap(({ catalogCategory }) =>
      catalogCategory ? [catalogCategory] : []),
  ])],
);

export const SCENE_ELEMENT_KINDS: readonly SceneElementKind[] = Object.freeze(
  [...new Set(Object.values(ELEMENT_SCHEMA).flatMap(({ sceneKind }) =>
    sceneKind ? [sceneKind] : []))],
);

export const ADMIN_COMPONENT_KINDS: readonly AdminComponentKind[] = Object.freeze(
  [...new Set(Object.values(ELEMENT_SCHEMA).flatMap(({ componentKind }) =>
    componentKind ? [componentKind] : []))],
);
