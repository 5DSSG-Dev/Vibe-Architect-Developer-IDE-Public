import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProductionRuntime } from './application-production.js';
import { ReviewRecord } from './governance-record/review.js';
import { createGovernedAsk } from './luminary-reply-router.js';
const context = {version:1 as const,coreId:'core',name:'Notes',purpose:'Add plain notes in memory',decisions:'In-memory demo only',elements:[
{id:'core',name:'Notes',category:'CORE',parentId:null,description:'Notes'},
{id:'orb',name:'Storage',category:'Orbs',parentId:'core',description:'Notes in memory'}]};
const definition = {version:1,name:'Notes',objects:[
{id:'notes',kind:'Data',initialRecords:[]},
{id:'editor',kind:'Form',modelId:'notes',fields:[{name:'text',label:'Note',required:true}]},
{id:'home',kind:'Page',path:'/',title:'Notes',children:['editor','notes']}]};
const content = JSON.stringify({definition,bindings:{notes:'orb',editor:'orb',home:'core'},gaps:[]});
async function fixture() {
 const root = await mkdtemp(join(tmpdir(),'vibe-production-'));
 const record = await ReviewRecord.open({dir:join(root,'review')});
 const ask = createGovernedAsk(async()=>({modelId:'fixture-only',content}),{record,pipeline:{gauge:{read:async()=>({Honesty:90,Respect:90,Attention:90,Affection:90,Loyalty:90,Trust:90,Communication:90})}}});
 return {root,record,runtime:new ProductionRuntime({root:join(root,'projects'),record,ask})};
}
test('generation is recorded, bound to CORE/Elements and cannot launch against changed decisions', async () => {
 const {runtime,record} = await fixture();
 try {
  const receipt = await runtime.generate(context);
  assert.match(receipt.digest,/^[a-f0-9]{64}$/);
  assert.equal(receipt.modelId,'fixture-only');
  assert.ok(receipt.files['src/pages/home.jsx']);
  assert.ok(record.architect.entries.some(e=>e.entry.kind==='note' && e.entry.text.includes(receipt.digest)));
  await assert.rejects(()=>runtime.launch(receipt.id,{...context,decisions:'Changed'},receipt.digest),/changed/i);
  await assert.rejects(()=>runtime.launch(receipt.id,context,'0'.repeat(64)),/digest/i);
 } finally {await runtime.close();}
});
test('changed generated source is refused before execution', async () => {
 const {runtime} = await fixture();
 try {
  const r = await runtime.generate(context);
  await writeFile(join(r.projectPath,'src/main.jsx'),'throw new Error("changed")');
  await assert.rejects(()=>runtime.launch(r.id,context,r.digest),/changed|digest/i);
 } finally {await runtime.close();}
});
test('governance rejection produces no launchable receipt', async () => {
 const f = await fixture();
 const runtime = new ProductionRuntime({root:join(f.root,'rejected'),record:f.record,ask:async()=>({ok:false,shortfall:{code:'governance_closed',message:'review closed',modelId:null}})});
 await assert.rejects(()=>runtime.generate(context),/review closed/);
 assert.throws(()=>runtime.get('unknown'),/not found/i);
});
test('a closed review record blocks generation before any model call', async () => {
 const f = await fixture(); let calls=0;
 f.record.checkAnchors([{area:'architect',seq:999,hash:'0'.repeat(64)}]);
 const runtime = new ProductionRuntime({root:join(f.root,'closed'),record:f.record,ask:async()=>{calls++;throw Error('unexpected');}});
 await assert.rejects(()=>runtime.generate(context),/closed/i);
 assert.equal(calls,0);
});
test('review-record append errors do not register a launchable project', async () => {
 const f = await fixture();
 const append = f.record.architect.append.bind(f.record.architect);
 // Permit the real governed turn, then fail the production-specific durable note.
 f.record.architect.append = async entry => {if(entry.kind==='note')throw Error('disk unavailable');return append(entry);};
 await assert.rejects(()=>f.runtime.generate(context),/disk unavailable/);
});

test('launch runs real generated tests/build and serves a separate read-only preview', async () => {
 const {mkdir} = await import('node:fs/promises');
 await mkdir('output',{recursive:true});
 const root = await mkdtemp(join(process.cwd(),'output','production-runtime-test-'));
 const f=await fixture();
 const runtime=new ProductionRuntime({root,record:f.record,ask:createGovernedAsk(async()=>({modelId:'fixture-only',content}),{record:f.record,pipeline:{gauge:{read:async()=>({Honesty:90,Respect:90,Attention:90,Affection:90,Loyalty:90,Trust:90,Communication:90})}}})});
 try {
  const r=await runtime.generate(context);
  await mkdir(join(r.projectPath,'public'),{recursive:true});
  await writeFile(join(r.projectPath,'public','unreviewed.txt'),'This file was not reviewed.');
  const [first,second]=await Promise.all([runtime.launch(r.id,context,r.digest),runtime.launch(r.id,context,r.digest)]);
  assert.equal(first.previewUrl,second.previewUrl);
  assert.equal(first.state,'running');
  await assert.rejects(()=>runtime.generate(context),/Stop the active application/);
  assert.equal((await fetch(new URL(first.previewUrl!).origin)).status,404);
  assert.match(first.output,/Build passed/);
  const response=await fetch(first.previewUrl!);
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Notes<\/title>/);
  const asset=html.match(/src="([^"]+\.js)"/)![1];
  const script=await fetch(first.previewUrl+asset);
  assert.equal(script.status,200);
  assert.match(script.headers.get('content-type')!,/javascript/);
  assert.equal((await fetch(first.previewUrl+'/vibe-provenance.json')).status,404);
  assert.equal((await fetch(first.previewUrl+'/unreviewed.txt')).status,404);
  await runtime.stop(r.id);
  assert.equal(runtime.get(r.id).state,'stopped');
  await assert.rejects(()=>fetch(first.previewUrl!));
 } finally {await runtime.close();await f.runtime.close();}
});
test('production requests require exact local origin and reject proxy headers', async () => {
 const {localProductionRequest}=await import('./application-production.js');
 const request=(headers:Record<string,string>,remoteAddress='127.0.0.1')=>({headers,socket:{remoteAddress}}) as any;
 assert.equal(localProductionRequest(request({host:'127.0.0.1:3012',origin:'http://127.0.0.1:3012'})),true);
 assert.equal(localProductionRequest(request({host:'127.0.0.1:3012',origin:'http://127.0.0.1:9999'})),false);
 assert.equal(localProductionRequest(request({host:'127.0.0.1:3012','x-forwarded-for':'127.0.0.1'})),false);
 assert.equal(localProductionRequest(request({host:'127.0.0.1:3012'},'192.168.1.2')),false);
});

test('gateway mount authenticates before generation and refuses cross-port browser requests', async () => {
 const {createGateway}=await import('./app.js');
 const {InMemorySessionStore}=await import('./session-store.js');
 const f=await fixture();let modelCalls=0;
 const app=await createGateway({
  config:{nodeEnv:'development',port:0,origin:'http://127.0.0.1:3012',sessionTtlMs:60000,cookieSecure:false,trustProxy:false,luminaryLocalSession:true,luminaryDemoKey:'fixture-key',luminaryReplySource:'meta',entra:{tenantId:'t',clientId:'c',clientSecret:'fixture',redirectUri:'http://127.0.0.1:3012/auth/entra/callback'}},
  sessions:new InMemorySessionStore(),entra:{configured:false} as any,vite:null,record:f.record,
  askModel:async()=>{modelCalls++;return {modelId:'fixture-only',content};},
  gauge:{read:async()=>({Honesty:90,Respect:90,Attention:90,Affection:90,Loyalty:90,Trust:90,Communication:90})}
 });
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+(server.address() as any).port;
 const post=(headers:Record<string,string>)=>fetch(base+'/api/luminary/production/generate',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({context,requestId:'12345678-1234-4234-8234-123456789012'})});
 try {
  assert.equal((await post({origin:base})).status,401);
  assert.equal((await post({origin:'http://127.0.0.1:9999','x-luminary-demo-key':'fixture-key'})).status,403);
  assert.equal(modelCalls,0);
  const response=await post({origin:base,'x-luminary-demo-key':'fixture-key'});
  assert.equal(response.status,201);
  const receipt=await response.json();
  assert.match(receipt.digest,/^[0-9a-f]{64}$/);assert.equal(modelCalls,1);
  const csp=(await fetch(base+'/')).headers.get('content-security-policy')!;
  assert.match(csp,/frame-src[^;]*http:\/\/127\.0\.0\.1:\*/);
 } finally {await app.locals.applicationProduction.close();await new Promise<void>(r=>server.close(()=>r()));await f.runtime.close();}
});
test('build errors retain failed status and never open a preview', async () => {
 // This project deliberately sits outside the IDE dependency tree.
 const f=await fixture();
 try {
  const r=await f.runtime.generate(context);
  await assert.rejects(()=>f.runtime.launch(r.id,context,r.digest),/resolve|react|build/i);
  const result=f.runtime.get(r.id);
  assert.equal(result.state,'failed');assert.equal(result.previewUrl,undefined);
 } finally {await f.runtime.close();}
});

test('a repeated or recovered request returns the same artifact without another model call', async () => {
 const f=await fixture();let calls=0;
 const ask=createGovernedAsk(async()=>{calls++;return {modelId:'fixture-only',content};},{record:f.record,pipeline:{gauge:{read:async()=>({Honesty:90,Respect:90,Attention:90,Affection:90,Loyalty:90,Trust:90,Communication:90})}}});
 const runtime=new ProductionRuntime({root:join(f.root,'recoverable'),record:f.record,ask});
 try {
  const requestId='12345678-1234-4234-8234-123456789000';
  const [one,two]=await Promise.all([runtime.generate(context,requestId),runtime.generate(context,requestId)]);
  const recovered=await runtime.recover(requestId);
  assert.equal(one.id,two.id);assert.equal(recovered.id,one.id);assert.equal(calls,1);
  await assert.rejects(()=>runtime.generate({...context,decisions:'Different'},requestId),/different/i);
  assert.equal(calls,1);
 } finally {await runtime.close();await f.runtime.close();}
});
test('unknown generation recovery does not start another operation', async () => {
 const f=await fixture();
 await assert.rejects(()=>f.runtime.recover('not-known'),/not found.*No model request was repeated/);
 await f.runtime.close();
});
