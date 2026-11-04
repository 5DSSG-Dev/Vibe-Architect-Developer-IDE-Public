import { isBuildPlan } from '../engine/appBuildPlan';
import { acceptedCoreContext, validateCoreApplication, type CoreApplication } from '../engine/coreApplication';
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
  // Authored Elements carry declarative tier contracts. Legacy catalog entries
  // without authoringContract remain accepted for backward compatibility.
  const index = new Map<string, any>(value.apothecaryCatalog.map((entry: any) => [entry.id, entry]));
  for (const element of value.apothecaryCatalog) {
    const contract = element.authoringContract;
    if (contract === undefined) continue;
    const kind = element.category === 'Orbs' ? 'OrbUmbilical'
      : element.category === 'Satellites' ? 'SatelliteTether'
        : element.category === 'Actuators' ? 'ActuatorOperation' : null;
    const parent = contract.parentId === null ? null : index.get(contract.parentId);
    const parentCategory = element.category === 'Satellites' ? 'Orbs' : 'Satellites';
    const children = element.category === 'Satellites' ? parent?.satellites : parent?.actuators;
    if (!kind || contract.version !== 1 || contract.kind !== kind ||
        !Array.isArray(contract.capabilities) || !contract.capabilities.every((entry: unknown) => typeof entry === 'string') ||
        !Array.isArray(contract.requirements) || !contract.requirements.every((entry: unknown) => typeof entry === 'string') ||
        (kind === 'OrbUmbilical' ? contract.parentId !== null :
          typeof contract.parentId !== 'string' || element.parentElementId !== contract.parentId ||
          !parent || parent.category !== parentCategory || !Array.isArray(children) || !children.includes(element.id)))
      throw new Error('Imported authored Element has an invalid tier contract or parent relationship.');
  }
  if (c.appBuildPlan !== undefined && !isBuildPlan(c.appBuildPlan)) throw new Error('The imported app has an invalid ToDo build plan. Your current app is unchanged.');
  if (c.application !== undefined) validateCoreApplication(c.application);
  return value;
}
export function readApps(storage: Storage): SavedApp[] {
  const raw = storage.getItem(APPS_KEY); if (!raw) return [];
  const apps = JSON.parse(raw); if (!Array.isArray(apps)) throw new Error('The saved-app list could not be read.');
  return apps.map(a => ({ id: String(a.id), snapshot: readAppFile(JSON.stringify(a.snapshot)) }));
}
/** Persist before changing React state, so failed writes preserve the old program. */
export function saveCoreProgram(storage: Storage, application: CoreApplication): void {
  validateCoreApplication(application);
  const snapshot = readAppFile(storage.getItem(WORKSPACE_KEY) ?? '');
  if (JSON.stringify(acceptedCoreContext(snapshot.coreManifest, snapshot.apothecaryCatalog)) !== JSON.stringify(application.context)) throw Error('Save the current Workspace successfully before saving its CORE program.');
  snapshot.coreManifest.application = application;
  storage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
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
/** Reopen an imported app with its existing Recent ID when the CORE identity already exists.
 * Refuse divergent state under the same identity; cloning must be explicit.
 */
export function reopenImportedApp(storage: Storage, snapshot: AppSnapshot): void {
  readAppFile(JSON.stringify(snapshot));
  // Persist the current app first, then search Recent by CORE identity.
  // Otherwise opening the current app from disk could create a second Recent ID.
  saveCurrentApp(storage);
  const existing = readApps(storage).find(app => app.snapshot.coreManifest.coreId === snapshot.coreManifest.coreId);
  if (existing && JSON.stringify(existing.snapshot) !== JSON.stringify(snapshot))
    throw new Error('This CORE identity already exists with different data. Open the saved Recent app or explicitly clone a draft.');
  activateApp(storage, snapshot, existing?.id);
}
/** Clone only a disconnected draft: accepted CORE contracts/evidence cannot be safely relabeled. */
export function cloneImportedDraft(storage: Storage, snapshot: AppSnapshot): void {
  readAppFile(JSON.stringify(snapshot));
  if (snapshot.coreManifest.appCreation !== 'draft' || snapshot.coreManifest.contracts.length ||
      snapshot.coreManifest.sockets.some(socket => socket.connectedItem) || snapshot.coreManifest.application)
    throw new Error('Clone supports unconnected draft apps only. Accepted CORE contracts cannot be reassigned.');
  const duplicate = structuredClone(snapshot);
  duplicate.coreManifest.coreId = 'app-' + crypto.randomUUID();
  duplicate.coreManifest.name = snapshot.coreManifest.name + ' (copy)';
  delete duplicate.coreManifest.applicationProduction;
  delete duplicate.coreManifest.appBuildPlan;
  delete duplicate.coreManifest.appConfiguration;
  duplicate.navigation = { environmentIds: [] };
  saveCurrentApp(storage);
  activateApp(storage, duplicate);
}
export function closeApp(storage: Storage): void { saveCurrentApp(storage); storage.setItem(CLOSED_KEY, 'true'); }
export function deleteApp(storage: Storage): void {
  const id = storage.getItem(ACTIVE_KEY);
  storage.setItem(APPS_KEY, JSON.stringify(readApps(storage).filter(a => a.id !== id)));
  storage.setItem(CLOSED_KEY, 'true'); storage.removeItem(WORKSPACE_KEY); storage.removeItem(ACTIVE_KEY);
}
