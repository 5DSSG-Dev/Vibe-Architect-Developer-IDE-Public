import test from 'node:test';
import assert from 'node:assert/strict';
import { productionContext, validateProductionContext, parseProductionAnswer } from './applicationProduction';
import { createBlankApp } from './appCreation';
const context = {version:1 as const,coreId:'core',name:'Notes',purpose:'Add notes',decisions:'Plain notes',elements:[
  {id:'core',name:'Notes',category:'CORE',parentId:null,description:'Add notes'},
  {id:'orb',name:'Notes storage',category:'Orbs',parentId:'core',description:'Store notes'}
]};
const answer = {definition:{version:1,name:'Notes',objects:[{id:'home',kind:'Page',path:'/',title:'Notes',children:[]}]},bindings:{home:'core'},gaps:[]};
test('reads accepted CORE and actual attached hierarchy', () => {
  const core = createBlankApp();
  assert.throws(()=>productionContext(core,[]),/accept/i);
  const item = {id:'orb',name:'Notes',category:'Orbs' as const,description:'Store',version:'1',trust:'Draft' as const,memoryReq:1,threadsReq:1,capabilities:[],requirements:[]};
  const ready = {...core,appCreation:'ready' as const,name:'Notes',appConfiguration:{appType:'Web App',purpose:'Notes',crystalModel:'x',updatedAt:'now'},sockets:core.sockets.map((s,i)=>i? s:{...s,state:'Active' as const,connectedItem:item})};
  assert.deepEqual(productionContext(ready,[]).elements.map(e=>e.id),[core.coreId,'orb']);
  assert.throws(()=>productionContext({...ready,appConfiguration:{...ready.appConfiguration,appType:'Desktop App'}},[]),/Web App/);
});
test('rejects missing hierarchy and malformed generation context', () => {
  assert.throws(()=>validateProductionContext({...context,elements:[context.elements[0],{...context.elements[1],parentId:'missing'}]}),/parent/);
  assert.throws(()=>validateProductionContext({...context,decisions:'x'.repeat(48001)}),/context/);
});
test('requires exact object ownership, same app and no essential gaps', () => {
  assert.equal(parseProductionAnswer(JSON.stringify(answer),context).bindings.home,'core');
  assert.throws(()=>parseProductionAnswer(JSON.stringify({...answer,bindings:{home:'invented'}}),context),/binding/);
  assert.throws(()=>parseProductionAnswer(JSON.stringify({...answer,bindings:{home:'core',extra:'core'}}),context),/binding/);
  assert.throws(()=>parseProductionAnswer(JSON.stringify({...answer,definition:{...answer.definition,name:'Other'}}),context),/name/);
  assert.throws(()=>parseProductionAnswer(JSON.stringify({...answer,gaps:['Needs persistent storage']}),context),/persistent/);
});

test('preserves code-frame changes as review context without executing source', () => {
 const frame={language:'TypeScript' as const,fileName:'notes.ts',entrypoint:'execute',source:'throw new Error("must never execute")',updatedAt:'now'};
 const c={...context,elements:context.elements.map(e=>e.id==='orb'?{...e,code:JSON.stringify(frame)}:e)};
 const checked=validateProductionContext(c);
 assert.equal(checked.elements[1].code,JSON.stringify(frame));
 const changed=validateProductionContext({...c,elements:c.elements.map(e=>e.id==='orb'?{...e,code:JSON.stringify({...frame,source:'changed'})}:e)});
 assert.notDeepEqual(checked,changed);
});
