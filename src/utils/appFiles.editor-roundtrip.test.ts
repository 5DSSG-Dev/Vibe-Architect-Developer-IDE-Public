import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlankApp } from '../engine/appCreation';
import { DEFAULT_APOTHECARY_CATALOG, ensureElementCodeFrame } from '../engine/relationEngine';
import { activateApp, readAppFile, WORKSPACE_KEY } from './appFiles';

test('V11 authored Orb, Satellite and Actuator preserve all fields through export/import/reload', () => {
  const inventory = DEFAULT_APOTHECARY_CATALOG;
  const orb = ensureElementCodeFrame({ ...structuredClone(inventory.find(e => e.category === 'Orbs')!), id:'qa-authored-orb', name:'QA Authored Orb', version:'0.1.0', description:'Authored test Orb' });
  const sat = ensureElementCodeFrame({ ...structuredClone(inventory.find(e => e.category === 'Satellites')!), id:'qa-authored-satellite', name:'QA Authored Satellite', version:'0.1.0', description:'Authored test Satellite' });
  const act = ensureElementCodeFrame({ ...structuredClone(inventory.find(e => e.category === 'Actuators')!), id:'qa-authored-actuator', name:'QA Authored Actuator', version:'0.1.0', description:'Authored test Actuator' });
  orb.satellites = [sat.id]; sat.actuators = [act.id];
  const authored = [orb,sat,act];
  const snapshot = { version:2 as const, coreManifest:createBlankApp(), apothecaryCatalog:authored, navigation:{environmentIds:[]} };
  const exported = JSON.stringify(snapshot); // Same JSON schema exported by AppMenu.
  const clean = new Map<string,string>();
  const storage = { getItem:(k:string)=>clean.get(k)??null, setItem:(k:string,v:string)=>{clean.set(k,v);}, removeItem:(k:string)=>{clean.delete(k);} } as Storage;
  activateApp(storage, readAppFile(exported),'qa-clean-workspace');
  const reopened = readAppFile(storage.getItem(WORKSPACE_KEY)!);
  assert.deepEqual(reopened.apothecaryCatalog,JSON.parse(JSON.stringify(authored)));
  assert.deepEqual(reopened.apothecaryCatalog[0].satellites,[sat.id]);
  assert.deepEqual(reopened.apothecaryCatalog[1].actuators,[act.id]);
  for (const element of authored) {
    const after = reopened.apothecaryCatalog.find(item=>item.id===element.id);
    assert.ok(after);
    for (const prop of ['id','name','version','category','description','requirements','capabilities','codeFrame','umbilicalContractRef','satellites','actuators'] as const) {
      assert.deepEqual(after[prop],element[prop],element.id+':'+prop);
    }
  }
  // Data-only code frames remain unchanged. Import does NOT execute them.
  assert.equal(reopened.apothecaryCatalog[0].codeFrame!.source,orb.codeFrame!.source);
});
