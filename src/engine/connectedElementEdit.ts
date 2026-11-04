import type { ApothecaryItem, CoreManifest } from './relationEngine';

/** A connected Element's structural and negotiated identifiers are immutable under
 * ordinary property/code edits. A version or topology migration is a distinct
 * reviewed operation, never an accidental side effect of the inspector. */
export function assertCompatibleElementEdit(
  original: ApothecaryItem,
  edited: ApothecaryItem,
  manifest: CoreManifest,
  catalog: ApothecaryItem[]
): void {
  if (original.id !== edited.id || original.category !== edited.category ||
      original.version !== edited.version ||
      original.parentElementId !== edited.parentElementId ||
      JSON.stringify(original.satellites ?? []) !== JSON.stringify(edited.satellites ?? []) ||
      JSON.stringify(original.actuators ?? []) !== JSON.stringify(edited.actuators ?? []) ||
      JSON.stringify(original.authoringContract ?? null) !== JSON.stringify(edited.authoringContract ?? null) ||
      JSON.stringify(original.umbilicalContractRef ?? null) !== JSON.stringify(edited.umbilicalContractRef ?? null) ||
      original.umbilicalProfileId !== edited.umbilicalProfileId) {
    throw new Error('Connected Element identity, version and structural contracts require a separate reviewed migration.');
  }
  const connected = manifest.sockets.some(socket =>
    socket.connectedItem?.id === original.id ||
    socket.attachedSatellites?.some(satellite => satellite.id === original.id));
  if (!connected) return;
  const persisted = catalog.find(item => item.id === original.id);
  if (persisted && (persisted.version !== original.version ||
      persisted.category !== original.category)) {
    throw new Error('Connected Element catalog and runtime versions have drifted.');
  }
  const host = manifest.sockets.find(socket =>
    socket.connectedItem?.id === original.id ||
    socket.attachedSatellites?.some(satellite => satellite.id === original.id));
  const activeItem = host?.connectedItem?.id === original.id
    ? host.connectedItem
    : host?.attachedSatellites?.find(item => item.id === original.id);
  if (activeItem && (activeItem.version !== original.version ||
      activeItem.category !== original.category ||
      activeItem.parentElementId !== original.parentElementId ||
      JSON.stringify(activeItem.authoringContract ?? null) !== JSON.stringify(original.authoringContract ?? null))) {
    throw new Error('Connected Element catalog and runtime versions or structural contracts have drifted.');
  }
  if (host?.connectedItem?.id === original.id && original.category !== 'Orbs') {
    throw new Error('A connected CORE socket requires an Orb.');
  }
}
