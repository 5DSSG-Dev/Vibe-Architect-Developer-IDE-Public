import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCreationSession,creationSessionKey,readCreationSession,saveCreationSession,archiveCreationSession} from './creationSession';
const memory=()=>{const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
test('reload restores interview and marks pending delivery stopped rather than replaying it',()=>{
 const storage=memory(),key=creationSessionKey('one'),value=emptyCreationSession();value.turns=[{role:'architect',text:'My ideas',state:'pending'}];value.draft='Keep this draft';saveCreationSession(storage,key,value);
 const restored=readCreationSession(storage,key,[]);assert.equal(restored.turns[0].state,'stopped');assert.equal(restored.draft,value.draft);assert.deepEqual(readCreationSession(storage,creationSessionKey('two'),[]),emptyCreationSession());
});
test('restart archive preserves original conversation independently of a fresh session',()=>{
 const storage=memory(),key=creationSessionKey('one'),value=emptyCreationSession();value.turns=[{role:'architect',text:'Original request',state:'sent'}];assert.equal(archiveCreationSession(storage,key,value),true);saveCreationSession(storage,key,emptyCreationSession());assert.equal(readCreationSession(storage,key+':previous',[]).turns[0].text,'Original request');assert.equal(readCreationSession(storage,key,[]).turns.length,0);
});
test('bad or unavailable storage does not authorize discarding an interview',()=>{
 assert.equal(archiveCreationSession(undefined,'key',emptyCreationSession()),false);const storage={getItem:()=>'{bad',setItem:()=>{throw Error('quota');}};assert.deepEqual(readCreationSession(storage,'key',[]),emptyCreationSession());assert.equal(archiveCreationSession(storage,'key',emptyCreationSession()),false);
});


test('a proposal that no longer validates cannot erase the restored conversation',()=>{
 const storage=memory(),key=creationSessionKey('one'),value=emptyCreationSession();value.turns=[{role:'architect',text:'Keep my original request',state:'sent'}];value.answer={message:'Old plan',questions:[],decisionChoices:[],suggestions:[],proposal:{name:'Old',appType:'Web App',purpose:'Old purpose',crystalModel:'CORE_CRYSTAL_CAGED.glb',elements:[{id:'removed-orb',parentId:null,reason:'Old catalog'}],gaps:[]}};
 saveCreationSession(storage,key,value);const restored=readCreationSession(storage,key,[]);assert.equal(restored.turns[0]?.text,'Keep my original request');assert.equal(restored.answer,null);
});
