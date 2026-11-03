import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCoreManifest } from '../engine/relationEngine';
import { WORKSPACE_KEY, activateApp, saveCurrentApp, closeApp, deleteApp, readApps, readAppFile, type AppSnapshot } from './appFiles';
function memory() { const map = new Map<string,string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string,v: string) => { map.set(k,v); }, removeItem: (k: string) => { map.delete(k); } } as Storage; }
function app(name: string): AppSnapshot { const coreManifest = createInitialCoreManifest(); coreManifest.name = name; return { version: 2, coreManifest, apothecaryCatalog: [], navigation: { environmentIds: [] } }; }
test('switch and reopen preserve the complete prior snapshot and stable identity', () => {
 const storage = memory(); const first = app('First'); (first.coreManifest as any).webApp = { source: '<html>saved code</html>' };
 activateApp(storage, first, 'first'); saveCurrentApp(storage); activateApp(storage, app('Second'), 'second'); saveCurrentApp(storage);
 const recent = readApps(storage); assert.equal(recent.length, 2); assert.deepEqual(recent[1].snapshot, first);
 activateApp(storage, recent[1].snapshot, recent[1].id); saveCurrentApp(storage); assert.equal(readApps(storage).length, 2); assert.equal(readApps(storage)[0].id, 'first');
});
test('close saves and blocks subsequent autosave; reopening preserves content', () => {
 const storage = memory(); activateApp(storage, app('Saved'), 'saved'); closeApp(storage); const before = readApps(storage);
 storage.setItem(WORKSPACE_KEY, JSON.stringify(app('Should not overwrite'))); saveCurrentApp(storage); assert.deepEqual(readApps(storage), before);
 activateApp(storage, before[0].snapshot, before[0].id); assert.equal(JSON.parse(storage.getItem(WORKSPACE_KEY)!).coreManifest.name, 'Saved');
});
test('delete removes only the active app and prevents autosave resurrection', () => {
 const storage = memory(); activateApp(storage, app('Keep'), 'keep'); saveCurrentApp(storage); activateApp(storage, app('Delete'), 'delete'); saveCurrentApp(storage); deleteApp(storage); saveCurrentApp(storage);
 assert.deepEqual(readApps(storage).map(a => a.id), ['keep']); assert.equal(storage.getItem(WORKSPACE_KEY), null);
});
test('invalid imports fail before altering saved apps', () => {
 const storage = memory(); activateApp(storage, app('Keep'), 'keep'); saveCurrentApp(storage); const before = storage.getItem(WORKSPACE_KEY);
 for (const raw of ['not json', '{}', JSON.stringify({ ...app('Bad'), coreManifest: { sockets: [] } }), JSON.stringify({ ...app('Bad'), apothecaryCatalog: [null] })]) assert.throws(() => readAppFile(raw));
 assert.equal(storage.getItem(WORKSPACE_KEY), before);
});
test('failed archive write leaves the active workspace intact', () => {
 const storage = memory(); activateApp(storage, app('Keep'), 'keep'); const before = storage.getItem(WORKSPACE_KEY); const set = storage.setItem;
 storage.setItem = (k,v) => { if (k === 'vibe.apps.v1') throw new Error('quota'); set(k,v); };
 assert.throws(() => closeApp(storage)); assert.equal(storage.getItem('vibe.apps.closed'), null); assert.equal(storage.getItem(WORKSPACE_KEY), before);
});

test('malformed build plans are rejected before imported activation changes the active app',()=>{
 const storage=memory();activateApp(storage,app('Keep'),'keep');const before=storage.getItem(WORKSPACE_KEY);
 const bad=app('Bad');(bad.coreManifest as any).appBuildPlan={};
 assert.throws(()=>activateApp(storage,bad),/ToDo/);
 assert.equal(storage.getItem(WORKSPACE_KEY),before);
});

test('saving and reopening retains a generated project receipt without executing it',()=>{
 const storage=memory(),snapshot=app('Generated');
 snapshot.coreManifest.applicationProduction={id:'12345678-1234-4234-8234-123456789000',digest:'a'.repeat(64),contextHash:'b'.repeat(64)};
 activateApp(storage,snapshot,'generated');saveCurrentApp(storage);closeApp(storage);
 const saved=readApps(storage)[0];
 assert.deepEqual(saved.snapshot.coreManifest.applicationProduction,snapshot.coreManifest.applicationProduction);
 activateApp(storage,saved.snapshot,saved.id);
 assert.deepEqual(readAppFile(storage.getItem(WORKSPACE_KEY)!).coreManifest.applicationProduction,snapshot.coreManifest.applicationProduction);
});
