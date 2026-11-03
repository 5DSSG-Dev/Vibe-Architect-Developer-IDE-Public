import { isBuildPlan } from '../engine/appBuildPlan';
import type { CoreManifest, ApothecaryItem } from '../engine/relationEngine';
import type { NavigationPosition } from './navigationSnapshot';
export const WORKSPACE_KEY = 'aegis-vibe-architect.workspace.v1';
const APPS_KEY = 'vibe.apps.v1';
const ACTIVE_KEY = 'vibe.apps.active';
const CLOSED_KEY = 'vibe.apps.closed';
export interface AppSnapshot { version: 2; coreManifest: CoreManifest; apothecaryCatalog: ApothecaryItem[]; navigation: NavigationPosition }
export interface SavedApp { id: string; snapshot: AppSnapshot }
/** Parse data only: imported code is never executed when an app is opened. */
export function readAppFile(raw: string): AppSnapshot {
  let value: any;
  try { value = JSON.parse(raw); } catch { throw new Error('This file is not valid app JSON.'); }
  const c = value?.coreManifest;
  const item = (v: any) => v && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.category === 'string' && typeof v.description === 'string';
  if (value?.version !== 2 || !c || typeof c.coreId !== 'string' || typeof c.name !== 'string' || !c.hardwareBudget || !c.activeDaemons || !Array.isArray(c.sockets) || !Array.isArray(c.portals) || !Array.isArray(c.contracts)
    || !c.sockets.every((s: any) => s && typeof s.id === 'string' && Number.isFinite(s.angleDeg) && Number.isFinite(s.radius) && (!s.connectedItem || item(s.connectedItem)) && (!s.attachedSatellites || (Array.isArray(s.attachedSatellites) && s.attachedSatellites.every(item))))
    || !Array.isArray(value.apothecaryCatalog) || !value.apothecaryCatalog.every(item)
    || !['memoryMB', 'threads'].every(k => Number.isFinite(c.hardwareBudget[k]) && c.hardwareBudget[k] >= 0)
    || !Array.isArray(value.navigation?.environmentIds) || !value.navigation.environmentIds.every((id: unknown) => typeof id === 'string')) throw new Error('Choose a complete .vibe-app.json file exported from this IDE.');
  if (c.appBuildPlan !== undefined && !isBuildPlan(c.appBuildPlan)) throw new Error('The imported app has an invalid ToDo build plan. Your current app is unchanged.');
  return value;
}
export function readApps(storage: Storage): SavedApp[] {
  const raw = storage.getItem(APPS_KEY); if (!raw) return [];
  const apps = JSON.parse(raw); if (!Array.isArray(apps)) throw new Error('The saved-app list could not be read.');
  return apps.map(a => ({ id: String(a.id), snapshot: readAppFile(JSON.stringify(a.snapshot)) }));
}
export function saveCurrentApp(storage: Storage): void {
  if (storage.getItem(CLOSED_KEY) === 'true') return;
  const raw = storage.getItem(WORKSPACE_KEY); if (!raw) return;
  const snapshot = readAppFile(raw);
  const id = storage.getItem(ACTIVE_KEY) || crypto.randomUUID();
  const apps = readApps(storage).filter(a => a.id !== id);
  storage.setItem(APPS_KEY, JSON.stringify([{ id, snapshot }, ...apps]));
  storage.setItem(ACTIVE_KEY, id);
}
export function activateApp(storage: Storage, snapshot: AppSnapshot, id: string = crypto.randomUUID()): void {
  readAppFile(JSON.stringify(snapshot));
  // Write the snapshot before changing active identity, so quota errors preserve the old app.
  storage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
  storage.setItem(ACTIVE_KEY, id); storage.removeItem(CLOSED_KEY);
}
export function closeApp(storage: Storage): void { saveCurrentApp(storage); storage.setItem(CLOSED_KEY, 'true'); }
export function deleteApp(storage: Storage): void {
  const id = storage.getItem(ACTIVE_KEY);
  storage.setItem(APPS_KEY, JSON.stringify(readApps(storage).filter(a => a.id !== id)));
  storage.setItem(CLOSED_KEY, 'true'); storage.removeItem(WORKSPACE_KEY); storage.removeItem(ACTIVE_KEY);
}
