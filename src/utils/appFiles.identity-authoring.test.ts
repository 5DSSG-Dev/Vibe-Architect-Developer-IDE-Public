import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCoreManifest, createDefaultElementCodeFrame, type ApothecaryItem } from '../engine/relationEngine';
import { activateApp, cloneImportedDraft, readApps, readAppFile, reopenImportedApp, WORKSPACE_KEY, type AppSnapshot } from './appFiles';

function memory(): Storage {
 const map = new Map<string,string>();
 return { getItem:k=>map.get(k)??null, setItem:(k,v)=>{map.set(k,v);}, removeItem:k=>{map.delete(k);} } as Storage;
}
function snapshot(name:string):AppSnapshot {
 const core = createInitialCoreManifest();
 core.name = name; core.appCreation='draft';core.contracts=[];core.sockets=core.sockets.map(s=>({...s,state:'Vacant',connectedItem:undefined,attachedSatellites:undefined}));
 return {version:2,coreManifest:core,apothecaryCatalog:[],navigation:{environmentIds:[]}};
}
test('D14 imported Open App reopens matching CORE identity without duplicate Recent IDs',()=>{
 const storage=memory(), app=snapshot('Source');
 activateApp(storage,app,'one');
 reopenImportedApp(storage,readAppFile(JSON.stringify(app)));
 reopenImportedApp(storage,readAppFile(JSON.stringify(app)));
 assert.equal(readApps(storage).length,1);
 assert.equal(readApps(storage)[0].id,'one');
 assert.equal(readApps(storage)[0].snapshot.coreManifest.coreId,app.coreManifest.coreId);
});
test('D14 Clone is explicit, creates a different CORE identity and separate Recent record',()=>{
 const storage=memory(), app=snapshot('Source');
 activateApp(storage,app,'one');
 cloneImportedDraft(storage,app);
 const cloned=readAppFile(storage.getItem(WORKSPACE_KEY)!);
 assert.notEqual(cloned.coreManifest.coreId,app.coreManifest.coreId);
 assert.equal(cloned.coreManifest.name,'Source (copy)');
 assert.equal(readApps(storage).length,1); // recent original archived, clone active
});
test('D14 divergent imported identity requires explicit action; accepted CORE cannot be cloned',()=>{
 const storage=memory(), app=snapshot('Source');
 activateApp(storage,app,'one');
 assert.throws(()=>reopenImportedApp(storage,{...app,coreManifest:{...app.coreManifest,name:'Divergent'}}),/already exists/);
 assert.throws(()=>cloneImportedDraft(storage,{...app,coreManifest:{...app.coreManifest,appCreation:'ready'}}),/unconnected draft/);
});
test('D03 chosen authoring language has a real template and does not silently substitute',()=>{
 const item:ApothecaryItem={id:'new-element',name:'Custom Element',category:'Satellites',description:'Test payload',trust:'Draft',version:'0.1.0',memoryReq:64,threadsReq:1,capabilities:['inspect'],requirements:[]};
 const rust=createDefaultElementCodeFrame(item,'Rust');
 const python=createDefaultElementCodeFrame(item,'Python');
 const ts=createDefaultElementCodeFrame(item,'TypeScript');
 assert.equal(rust.language,'Rust');assert.match(rust.fileName,/\.rs$/);assert.match(rust.source,/pub fn execute/);
 assert.equal(python.language,'Python');assert.match(python.fileName,/\.py$/);assert.match(python.source,/def execute/);
 assert.equal(ts.language,'TypeScript');assert.match(ts.fileName,/\.ts$/);assert.match(ts.source,/export async function execute/);
});


test('D02 tier authoring contracts survive import and reject corrupt parent relationships',()=>{
 const storage=memory();
 const app=snapshot('Authored');
 const orb:ApothecaryItem={id:'custom-orb',name:'Host',category:'Orbs',description:'host',trust:'Draft',version:'1.0.0',memoryReq:64,threadsReq:1,capabilities:[],requirements:[],
   satellites:['custom-sat'],
   authoringContract:{version:1,kind:'OrbUmbilical',parentId:null,capabilities:[],requirements:[]}};
 const sat:ApothecaryItem={...orb,id:'custom-sat',name:'Child',category:'Satellites',parentElementId:'custom-orb',satellites:undefined,actuators:['custom-act'],
   authoringContract:{version:1,kind:'SatelliteTether',parentId:'custom-orb',capabilities:[],requirements:[]}};
 const act:ApothecaryItem={...orb,id:'custom-act',name:'Actuator',category:'Actuators',parentElementId:'custom-sat',satellites:undefined,actuators:undefined,
   authoringContract:{version:1,kind:'ActuatorOperation',parentId:'custom-sat',capabilities:[],requirements:[]}};
 app.apothecaryCatalog=[orb,sat,act];
 const roundTrip=readAppFile(JSON.stringify(app));
 activateApp(storage,roundTrip,'authored');
 assert.deepEqual(readAppFile(storage.getItem(WORKSPACE_KEY)!).apothecaryCatalog,JSON.parse(JSON.stringify([orb,sat,act])));
 const orphan=structuredClone(app);
 orphan.apothecaryCatalog[1].parentElementId='missing-orb';
 assert.throws(()=>readAppFile(JSON.stringify(orphan)),/invalid tier contract/);
 const disconnected=structuredClone(app);
 disconnected.apothecaryCatalog[0].satellites=[];
 assert.throws(()=>readAppFile(JSON.stringify(disconnected)),/invalid tier contract/);
});
test('D03 rejects unsupported runtime language instead of silently generating TypeScript',()=>{
 const item:ApothecaryItem={id:'s',name:'S',category:'Satellites',description:'s',trust:'Draft',version:'1',memoryReq:64,threadsReq:1,capabilities:[],requirements:[]};
 assert.throws(()=>createDefaultElementCodeFrame(item,'Stellar'),/Unsupported code template/);
 assert.throws(()=>createDefaultElementCodeFrame(item,'PyTorch' as any),/Unsupported code template/);
});
