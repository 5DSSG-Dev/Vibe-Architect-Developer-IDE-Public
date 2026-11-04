import test from 'node:test';
import assert from 'node:assert/strict';
import { productionContext, validateProductionContext, parseProductionAnswer, productionPrompt } from './applicationProduction';
import { createBlankApp } from './appCreation';
const context = {version:1 as const,coreId:'core',name:'Notes',purpose:'Add notes',decisions:'Plain notes',elements:[
  {id:'core',name:'Notes',category:'CORE',parentId:null,description:'Add notes'},
  {id:'orb',name:'Notes storage',category:'Orbs',parentId:'core',description:'Store notes'}
]};
const answer = {definition:{version:1,name:'Notes',objects:[{id:'home',kind:'Page',path:'/',title:'Notes',children:[]}]},bindings:{home:'core'},gaps:[]};

test('production dependency contract rejects the observed array/null output and requests exact dependency objects',()=>{
 for(const dependencies of [[],null])assert.throws(()=>parseProductionAnswer(JSON.stringify({...answer,definition:{...answer.definition,dependencies}}),context),/dependencies must be an object/);
 assert.deepEqual(parseProductionAnswer(JSON.stringify({...answer,definition:{...answer.definition,dependencies:{}}}),context).definition.dependencies,{});
 assert.ok(productionPrompt(context).includes('set definition.dependencies to exactly {}'));
 assert.ok(productionPrompt({...context,dependencies:{slugify:'1.6.6'}}).includes('set definition.dependencies to exactly {"slugify":"1.6.6"}'));
});

test('production field contract rejects due-date without rewriting it and accepts dueDate',()=>{
 const formAnswer={definition:{version:1,name:'Notes',dependencies:{},objects:[{id:'home',kind:'Page',path:'/',title:'Notes',children:['task-form','tasks']},{id:'tasks',kind:'Data',initialRecords:[]},{id:'task-form',kind:'Form',modelId:'tasks',fields:[{name:'due-date',label:'Due date',required:true}]}]},bindings:{home:'core',tasks:'orb','task-form':'orb'},gaps:[]};
 assert.throws(()=>parseProductionAnswer(JSON.stringify(formAnswer),context),/use dueDate, not due-date/);
 const valid=JSON.parse(JSON.stringify(formAnswer));valid.definition.objects[2].fields[0].name='dueDate';
 assert.equal(parseProductionAnswer(JSON.stringify(valid),context).definition.objects[2].kind,'Form');
});
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
