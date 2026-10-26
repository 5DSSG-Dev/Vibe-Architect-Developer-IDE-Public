import { ApothecaryItem, SocketBinding } from '../engine/relationEngine';

/**
 * Where the Architect was in the IDE, saved with the workspace so a reload can
 * offer to return there. Mode is saved separately (workspace version 1 already
 * kept it); the current task is derived from this position, not stored.
 */
export interface NavigationPosition {
  /** Drill-down path from the CORE, as Element ids: Orb, Satellite, Actuator. */
  environmentIds: string[];
  selectedSocketId?: string;
}

export const EMPTY_NAVIGATION: NavigationPosition = { environmentIds: [] };

/** Accepts any stored value and returns a well-formed position. */
export function readNavigationPosition(value: unknown): NavigationPosition {
  if (!value || typeof value !== 'object') return EMPTY_NAVIGATION;
  const raw = value as Partial<NavigationPosition>;
  const environmentIds = Array.isArray(raw.environmentIds)
    ? raw.environmentIds.filter((id): id is string => typeof id === 'string')
    : [];
  const selectedSocketId = typeof raw.selectedSocketId === 'string' ? raw.selectedSocketId : undefined;
  return { environmentIds, selectedSocketId };
}

/**
 * Resolves saved Element ids back to Elements, looking in the catalog and in
 * what is docked to the CORE. Stops at the first id that no longer resolves,
 * so a deleted Element returns the user to its parent rather than nowhere.
 */
export function resolveEnvironmentStack(
  ids: string[],
  catalog: ApothecaryItem[],
  sockets: SocketBinding[]
): ApothecaryItem[] {
  const known = new Map<string, ApothecaryItem>();
  for (const item of catalog) known.set(item.id, item);
  for (const socket of sockets) {
    if (socket.connectedItem) known.set(socket.connectedItem.id, socket.connectedItem);
    for (const satellite of socket.attachedSatellites ?? []) known.set(satellite.id, satellite);
  }

  const stack: ApothecaryItem[] = [];
  for (const id of ids) {
    const item = known.get(id);
    if (!item) break;
    stack.push(item);
  }
  return stack;
}
