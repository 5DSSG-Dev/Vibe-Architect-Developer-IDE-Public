import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankApp, connectAppProposal } from './appCreation';
import { DEFAULT_APOTHECARY_CATALOG as catalog } from './relationEngine';
import { generateApplication } from './applicationGenerator';
import { productionContext, type ProductionAnswer } from './applicationProduction';
import { applicationHash, acceptedCoreContext, verifyCoreApplication, saveCoreApplication, validateCoreApplication } from './coreApplication';
import { activateApp, closeApp, readApps, readAppFile, saveCoreProgram, WORKSPACE_KEY } from '../utils/appFiles';

async function fixture() {
  const orb = catalog.find(i => i.category === 'Orbs')!;
  const { manifest: core } = connectAppProposal({name:'Notes',appType:'Web App',purpose:'Add plain notes',crystalModel:'AEGIS_POD_CRYSTAL.glb',elements:[{id:orb.id,parentId:null,reason:'App function'}],gaps:[]},createBlankApp(),catalog);
  const answer: ProductionAnswer = { definition: {version:1,name:'Notes',objects:[
    {id:'home',kind:'Page',path:'/',title:'Notes',children:['intro','entry','notes']},
    {id:'intro',kind:'Component',text:'Write a note'},
    {id:'entry',kind:'Form',modelId:'notes',fields:[{name:'text',label:'Note',required:true}]},
    {id:'notes',kind:'Data',initialRecords:[]},
    {id:'about',kind:'Page',path:'/about',title:'About',children:['intro']},
    {id:'navigation',kind:'Navigation',pageIds:['home','about']}
  ]},bindings:{home:core.coreId,intro:core.coreId,entry:orb.id,notes:orb.id,about:core.coreId,navigation:core.coreId},gaps:[] };
  const { files } = generateApplication(answer.definition);
  const receipt = {id:crypto.randomUUID(),digest:await applicationHash(Object.keys(files).sort().map(p=>[p,files[p]])),contextHash:await applicationHash(productionContext(core,catalog)),answer};
  return {core,receipt};
}
test('accepted architecture traverses handshake, saves a complete program and reopens without gateway state',async()=>{
  const {core,receipt}=await fixture();
  assert.equal(core.contracts[0].handshakeStatus,'SUCCESS');
  const application=await saveCoreApplication(core,catalog,receipt);
  assert.equal(core.application,undefined,'saving does not mutate its input');
  const map=new Map<string,string>();
  const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}} as Storage;
  activateApp(storage,{version:2,coreManifest:core,apothecaryCatalog:catalog,navigation:{environmentIds:[]}},'notes');
  const before=storage.getItem(WORKSPACE_KEY),write=storage.setItem;
  storage.setItem=()=>{throw Error('quota');};
  assert.throws(()=>saveCoreProgram(storage,application),/quota/);assert.equal(storage.getItem(WORKSPACE_KEY),before);
  storage.setItem=write;saveCoreProgram(storage,application);
  closeApp(storage);
  const saved=readApps(storage)[0];
  activateApp(storage,saved.snapshot,saved.id);
  const reopened=readAppFile(storage.getItem(WORKSPACE_KEY)!);
  assert.deepEqual(reopened.coreManifest.application,application);
  assert.deepEqual(await verifyCoreApplication(reopened.coreManifest.application,acceptedCoreContext(reopened.coreManifest,reopened.apothecaryCatalog)),application);
});
test('drafts, lost Orb contracts and changed architecture cannot save or run',async()=>{
  const {core,receipt}=await fixture();
  await assert.rejects(saveCoreApplication({...core,appCreation:'draft'},catalog,receipt),/accept/);
  await assert.rejects(saveCoreApplication({...core,contracts:[]},catalog,receipt),/contract/);
  await assert.rejects(saveCoreApplication({...core,contracts:core.contracts.map(c=>({...c,targetSocketId:'another-port'}))},catalog,receipt),/contract/);
  await assert.rejects(saveCoreApplication({...core,name:'Changed'},catalog,receipt),/changed/);
  const app=await saveCoreApplication(core,catalog,receipt);
  await assert.rejects(verifyCoreApplication(app,acceptedCoreContext({...core,appBuildPlan:{...core.appBuildPlan!,decisions:'Changed decision'}},catalog)),/changed/);
  assert.throws(()=>acceptedCoreContext({...core,appCreation:'draft'},catalog),/accept/);
});
test('altered source, context evidence and missing bindings are rejected',async()=>{
  const {core,receipt}=await fixture();
  await assert.rejects(saveCoreApplication(core,catalog,{...receipt,digest:'0'.repeat(64)}),/evidence/);
  const app=await saveCoreApplication(core,catalog,receipt);
  const changed=structuredClone(app);changed.answer.definition.name='Different';
  assert.throws(()=>validateCoreApplication(changed),/name/);
  const changedSource=structuredClone(app);const intro=changedSource.answer.definition.objects.find(o=>o.kind==='Component')!;
  if(intro.kind==='Component')intro.text='Changed source';
  await assert.rejects(verifyCoreApplication(changedSource,productionContext(core,catalog)),/evidence/);
  await assert.rejects(verifyCoreApplication({...app,contextHash:'0'.repeat(64)},productionContext(core,catalog)),/evidence/);
  assert.throws(()=>validateCoreApplication({...app,answer:{...app.answer,bindings:{}}}),/binding/);
  assert.throws(()=>readAppFile(JSON.stringify({version:2,coreManifest:{...core,application:{}},apothecaryCatalog:catalog,navigation:{environmentIds:[]}})),/CORE application/);
});
test('essential unsupported work cannot be saved as a completed program',async()=>{
  const {core,receipt}=await fixture();
  const app=await saveCoreApplication(core,catalog,receipt);
  assert.throws(()=>validateCoreApplication({...app,answer:{...app.answer,gaps:['Needs persistent storage']}}),/persistent storage/);
});
