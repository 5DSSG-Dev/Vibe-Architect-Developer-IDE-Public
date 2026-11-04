import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBuildPlan, verifyBuildItem, reopenBuildItem, buildItemFocus } from './appBuildPlan';
import type { AppProposal } from './appCreation';
const proposal: AppProposal = {name:'Notebook',appType:'Web App',purpose:'Save project notes',crystalModel:'AEGIS_POD_CRYSTAL.glb',elements:[{id:'orb',parentId:null,reason:'Store notes'}],gaps:['Create notes table','Build notes view']};
test('build lists are app-local snapshots and survive JSON save/reopen',()=>{
 const first=createBuildPlan(proposal,'Plain notes'),other=createBuildPlan(proposal,'Other decisions');
 assert.notEqual(first.items[0].id,other.items[0].id);
 assert.deepEqual(JSON.parse(JSON.stringify(first)),first);
 proposal.gaps.push('Later change');assert.equal(first.proposal.gaps.length,2);proposal.gaps.pop();
});
test('completion requires explicit verification evidence and preserves sibling items',()=>{
 const plan=createBuildPlan(proposal,'Plain notes');
 assert.throws(()=>verifyBuildItem(plan,plan.items[0].id,'  '),/evidence/i);
 assert.throws(()=>verifyBuildItem(plan,'unknown','Checked saved note'),/not found/i);
 const checked=verifyBuildItem(plan,plan.items[0].id,'Created a note, reloaded, and found it again.');
 assert.equal(plan.items[0].verification,undefined);
 assert.equal(checked.items[0].verification?.by,'Architect');
 assert.match(checked.items[0].verification!.evidence,/reloaded/);
 assert.equal(checked.items[1].verification,undefined);
 assert.equal(reopenBuildItem(checked,checked.items[0].id).items[0].verification,undefined);
});
test('click context preserves purpose, agreed decisions and selected work without granting execution',()=>{
 const plan=createBuildPlan(proposal,'Plain notes, no rich text');
 const focus=buildItemFocus('app-one',plan,plan.items[1].id)!;
 assert.match(focus.text,/Build notes view/);assert.match(focus.text,/no rich text/);assert.match(focus.text,/Save project notes/);
 assert.match(focus.text,/not authorization/i);assert.equal(buildItemFocus('app-one',plan,'unknown'),undefined);
});
test('even an empty gap list does not claim a working app',()=>{
 const plan=createBuildPlan({...proposal,gaps:[]},'');
 assert.ok(plan.items.length>0);assert.ok(plan.items.every(i=>!i.verification));
});

test('Luminary focus includes current Element and bounds a long interview under the host context limit',()=>{
 const plan=createBuildPlan(proposal,'Long interview '.repeat(10000));
 const focus=buildItemFocus('app',plan,plan.items[0].id,{key:'page:notes',label:'Notes code',text:'CURRENT_NOTES_CODE'})!;
 assert.match(focus.text,/CURRENT_NOTES_CODE/);assert.match(focus.key,/page:notes/);
 assert.ok(new TextEncoder().encode(focus.text).length<=20000);
 assert.equal(plan.decisions.length,150000);
});
test('build plan validator rejects malformed imported work without rejecting a valid saved plan',async()=>{
 const {isBuildPlan}=await import('./appBuildPlan');
 const plan=createBuildPlan(proposal,'Plain notes');
 assert.equal(isBuildPlan(plan),true);assert.equal(isBuildPlan({}),false);
 assert.equal(isBuildPlan({...plan,items:[null]}),false);
 assert.equal(isBuildPlan({...plan,items:[{id:'one',text:'Work',verification:{by:'model',evidence:'done',at:'today'}}]}),false);
});
test('Apothecary retains the selected pending item and only defaults when selection is absent',async()=>{
 const {nextBuildItem}=await import('./appBuildPlan');const plan=createBuildPlan(proposal);
 assert.equal(nextBuildItem(plan,plan.items[1].id)?.id,plan.items[1].id);
 assert.equal(nextBuildItem(plan,undefined)?.id,plan.items[0].id);
 assert.equal(nextBuildItem(plan,'stale')?.id,plan.items[0].id);
});

test('bounded interview context preserves final accepted corrections',()=>{
 const plan=createBuildPlan(proposal,'Early decision: plain notes. '+ 'discussion '.repeat(12000) +' FINAL_ACCEPTED_DECISION: Markdown notes.');
 const focus=buildItemFocus('app',plan,plan.items[0].id)!;
 assert.equal(focus.text.includes('FINAL_ACCEPTED_DECISION: Markdown notes.'),true);
 assert.ok(new TextEncoder().encode(focus.text).length<=20000);
});

test('accepted interview ToDo IDs survive acceptance into the actual production context',async()=>{
 const {interviewRequirements}=await import('./creationLedger');
 const requirements=interviewRequirements([{role:'architect',state:'sent',text:'1. Home page\n2. Add notes\n3. Use slugify@1.6.6'},{role:'architect',state:'failed',text:'not accepted'}]);
 assert.deepEqual(requirements.map(r=>r.id),['R001-01','R001-02','R001-03']);
 const plan=createBuildPlan({...proposal,requirements,dependencies:{slugify:'1.6.6'}},'Real accepted interview');
 assert.deepEqual(plan.items.map(i=>i.id),requirements.map(r=>r.id));
 assert.equal(plan.proposal.dependencies?.slugify,'1.6.6');
 assert.deepEqual(JSON.parse(JSON.stringify(plan)).items,plan.items);
});
