import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankApp } from './appCreation';
import { DEFAULT_APOTHECARY_CATALOG, type ApothecaryItem } from './relationEngine';
import { assertCompatibleElementEdit } from './connectedElementEdit';
import { activateApp, readAppFile, WORKSPACE_KEY } from '../utils/appFiles';
const clone = <T>(value:T):T => structuredClone(value);
const memory = (): Storage => {
 const map=new Map<string,string>();
 return {getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}} as Storage;
};
function connected() {
 const orb=clone(DEFAULT_APOTHECARY_CATALOG.find(x=>x.id==='orb-http-gateway')!);
 const satellite=clone(DEFAULT_APOTHECARY_CATALOG.find(x=>x.id==='sat-request-validator')!);
 const actuator=clone(DEFAULT_APOTHECARY_CATALOG.find(x=>x.id==='act-payload-serializer')!);
 orb.satellites=[satellite.id];satellite.actuators=[actuator.id];
 const manifest=createBlankApp();
 manifest.sockets[0]={...manifest.sockets[0],state:'Active',connectedItem:orb,
 attachedSatellites:[satellite],contractId:'contract-stable',resolvedProfileId:'profile-stable',resolvedProfileVersion:'1.0'};
 const catalog=[orb,satellite,actuator];
 return {orb,satellite,actuator,manifest,catalog};
}
test('V12 connected Satellite property/code edits preserve version, contract and parent relationships after reopen',()=>{
 const {orb,satellite,actuator,manifest,catalog}=connected();
 const edited:ApothecaryItem={...satellite,name:'Edited Validator',description:'Updated parameter text',memoryReq:satellite.memoryReq+16};
 assert.doesNotThrow(()=>assertCompatibleElementEdit(satellite,edited,manifest,catalog));
 const updatedCatalog=catalog.map(e=>e.id===edited.id?edited:e);
 const updatedManifest={...manifest,sockets:manifest.sockets.map(socket=>({
  ...socket,attachedSatellites:socket.attachedSatellites?.map(e=>e.id===edited.id?edited:e)
 }))};
 const snapshot={version:2 as const,coreManifest:updatedManifest,apothecaryCatalog:updatedCatalog,navigation:{environmentIds:[orb.id,satellite.id]}};
 const store=memory();activateApp(store,snapshot,'qa-v12');
 const reopened=readAppFile(store.getItem(WORKSPACE_KEY)!);
 const child=reopened.apothecaryCatalog.find(e=>e.id===edited.id)!;
 assert.equal(child.description,'Updated parameter text');
 assert.equal(child.version,satellite.version);
 assert.equal(reopened.apothecaryCatalog.find(e=>e.id===orb.id)?.satellites?.[0],satellite.id);
 assert.equal(reopened.apothecaryCatalog.find(e=>e.id===satellite.id)?.actuators?.[0],actuator.id);
 assert.deepEqual(reopened.coreManifest.sockets[0].attachedSatellites?.[0],child);
 assert.equal(reopened.coreManifest.sockets[0].resolvedProfileVersion,'1.0');
 assert.equal(reopened.coreManifest.sockets[0].contractId,'contract-stable');
});
test('V12 connected Element editor refuses implicit version/topology and authoring-contract migrations',()=>{
 const {satellite,manifest,catalog}=connected();
 for (const edit of [
  {...satellite,version:'2.0.0'},
  {...satellite,id:'new-id'},
  {...satellite,category:'Actuators' as const},
  {...satellite,actuators:[]},
  {...satellite,parentElementId:'wrong-parent'},
  {...satellite,authoringContract:{version:1 as const,kind:'SatelliteTether' as const,parentId:'wrong',capabilities:[],requirements:[]}}
 ]) assert.throws(()=>assertCompatibleElementEdit(satellite,edit,manifest,catalog),/migration/);
});
