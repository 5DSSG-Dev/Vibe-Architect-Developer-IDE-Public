import { validateRequirementAst, validateAssemblyAudit, type AssemblyAuditor, type AstBinding, type AssemblyAudit } from './assembly-gates.js';
import { resolveAndVerifyAssembly } from './assembly-dependencies.js';
import express, { Router, type Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { build } from 'vite';
import { generateApplication } from '../src/engine/applicationGenerator.js';
import { verifyCoreApplication } from '../src/engine/coreApplication.js';
import { validateProductionContext, parseProductionAnswer, productionPrompt, productionFiles, type ProductionContext } from '../src/engine/applicationProduction.js';
import type { ReviewRecord } from './governance-record/review.js';
import { isLoopback } from './luminary-task-router.js';
import type { GovernedAskResult } from './luminary-reply-router.js';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileDigest = (files: Record<string,string>) => hash(Object.keys(files).sort().map(path=>[path,files[path]]));
export interface ProductionReceipt {
 id:string; requestId:string; digest:string; contextHash:string; modelId:string; projectPath:string;
 answer:ReturnType<typeof parseProductionAnswer>; files:Record<string,string>;
 gates?:{ast:AstBinding[];audit:AssemblyAudit;verification:Awaited<ReturnType<typeof resolveAndVerifyAssembly>>};
 state:'generated'|'building'|'running'|'stopped'|'failed'; output:string; previewUrl?:string;
 record?:Extract<GovernedAskResult,{ok:true}>['record'];
}
interface Entry { receipt:ProductionReceipt; server?:Server; pending?:Promise<ProductionReceipt> }
export interface ProductionOptions {
 assembly?: {audit:AssemblyAuditor;resolve?:typeof resolveAndVerifyAssembly};
 root:string; record:ReviewRecord; ask:(prompt:string)=>Promise<GovernedAskResult>;
}
export class ProductionRuntime {
 private readonly entries = new Map<string,Entry>();
 private readonly requests = new Map<string,{contextHash:string;result:Promise<ProductionReceipt>}>();
 private generating = false;
 private disposed = false;
 constructor(private readonly options:ProductionOptions) {}
 private assertOpen() {
  if(this.disposed)throw Error('Application production is closed.');
  if(this.options.record.closed)throw Error('The governance review record is closed.');
 }
 private async note(text:string) {
  this.assertOpen();
  await this.options.record.architect.append({kind:'note',id:randomUUID(),text});
 }
 private entry(id:string) {
  const e=this.entries.get(id);if(!e)throw Error('Generated project not found. Restore the saved CORE app, or generate again if it was not saved.');return e;
 }
 get(id:string):ProductionReceipt { return structuredClone(this.entry(id).receipt); }
 /** Restore only a generation already witnessed by this private review record. No model call. */
 async restoreCore(raw:unknown,current:unknown):Promise<ProductionReceipt> {
  this.assertOpen();
  const application=await verifyCoreApplication(raw,validateProductionContext(current));
  this.assertOpen();
  const original=this.options.record.architect.entries.find(row=>{
   if(row.entry.kind!=='note')return false;
   try {
    const note=JSON.parse(row.entry.text);
    return note.kind==='application_generated' && note.id===application.generationId && note.digest===application.sourceDigest
     && note.contextHash===application.contextHash && JSON.stringify(note.bindings)===JSON.stringify(application.answer.bindings);
   } catch {return false;}
  });
  if(!original || original.entry.kind!=='note')throw Error('The original governed generation is missing from this review record. Restore that record before restoring CORE.');
  const existing=this.entries.get(application.generationId);
  if(existing) {
   if(existing.receipt.digest!==application.sourceDigest || existing.receipt.contextHash!==application.contextHash)throw Error('CORE generation identity conflicts with the current project.');
   return this.get(application.generationId);
  }
  if(this.generating || [...this.entries.values()].some(e=>e.server||e.pending))throw Error('Stop the active application and wait for generation before restoring CORE.');
  if(this.entries.size>=8)throw Error('This gateway session has reached its eight-project limit. Restart after stopping previews.');
  this.generating=true;
  try {
   const files=productionFiles(application.answer);
   await mkdir(this.options.root,{recursive:true});
   const projectPath=await mkdtemp(join(resolve(this.options.root),'app-'));
   for(const [relative,source] of Object.entries(files)) {
    const target=join(projectPath,relative);
    await mkdir(dirname(target),{recursive:true});await writeFile(target,source,{flag:'wx'});
   }
   let gates:ProductionReceipt['gates'];
   if(this.options.assembly) {
    const ast=validateRequirementAst(application.context,application.answer,files);
    const verification=await (this.options.assembly.resolve??resolveAndVerifyAssembly)(projectPath,application.context);
    if(verification.packageLock!==application.answer.packageLock)throw Error('Restored dependency resolution changed the saved bundle; generate and review again.');
    const input={files,context:application.context,answer:application.answer,writerModelId:JSON.parse(original.entry.text).modelId,ast};
    const audit=await this.options.assembly.audit(input);validateAssemblyAudit(audit,input);gates={ast,audit,verification};
   }
   await writeFile(join(projectPath,'vibe-provenance.json'),JSON.stringify({restoredFromCore:application,gates},null,2),{flag:'wx'});
   await this.note(JSON.stringify({kind:'application_restored_from_core',id:application.generationId,digest:application.sourceDigest,contextHash:application.contextHash,projectPath}));
   const receipt:ProductionReceipt={id:application.generationId,requestId:randomUUID(),digest:application.sourceDigest,contextHash:application.contextHash,
    modelId:JSON.parse(original.entry.text).modelId,projectPath,answer:application.answer,files,state:'generated',...(gates?{gates}:{}),
    output:'Saved CORE program restored against its original governed generation. No writer generation request repeated. Review the source before launch.\nData profile: in memory only. Existing code frames are not compiled.\n'};
   this.entries.set(receipt.id,{receipt});return this.get(receipt.id);
  } finally {this.generating=false;}
 }
 async generate(raw:unknown,requestId=randomUUID()):Promise<ProductionReceipt> {
  this.assertOpen();
  if(!/^[0-9a-f-]{36}$/.test(requestId))throw Error('Invalid generation request ID.');
  const context=validateProductionContext(raw),contextHash=hash(context),previous=this.requests.get(requestId);
  if(previous){if(previous.contextHash!==contextHash)throw Error('This request ID belongs to different app decisions.');return structuredClone(await previous.result);}
  if(this.requests.size>=32)throw Error('The generation request history is full for this gateway session.');
  const result=this.generateOnce(context,requestId);this.requests.set(requestId,{contextHash,result});
  return structuredClone(await result);
 }
 async recover(requestId:string):Promise<ProductionReceipt> {
  const operation=this.requests.get(requestId);
  if(!operation)throw Error('Generation request not found in this gateway session. No model request was repeated.');
  return this.get((await operation.result).id);
 }
 private async generateOnce(raw:unknown,requestId:string):Promise<ProductionReceipt> {
  this.assertOpen();
  if(this.generating)throw Error('Another generation request is already active.');
  if([...this.entries.values()].some(e=>e.server||e.pending))throw Error('Stop the active application before generating another project.');
  if(this.entries.size>=8)throw Error('This gateway session has reached its eight-project limit. Restart after stopping previews.');
  const context=validateProductionContext(raw);
  if(Buffer.byteLength(JSON.stringify(context))>524288)throw Error('The production context exceeds 524288 bytes.');
  this.generating=true;
  try {
   const result=await this.options.ask(productionPrompt(context));
   if(!result.ok)throw Error(result.shortfall.message);
   if(!result.record || result.record.state!=='sent' || !result.lineage?.some(l=>l.stage==='prism'))throw Error('The production definition lacks a recorded governed delivery.');
   this.assertOpen();
   const answer=parseProductionAnswer(result.reply.content,context);
   const files=productionFiles(answer);
   const ast=this.options.assembly ? validateRequirementAst(context,answer,files) : undefined;
   const id=randomUUID(),contextHash=hash(context);
   await mkdir(this.options.root,{recursive:true});
   const projectPath=await mkdtemp(join(resolve(this.options.root),'app-'));
   for(const [relative,source] of Object.entries(files)) {
    const target=join(projectPath,relative);
    await mkdir(dirname(target),{recursive:true});
    await writeFile(target,source,{flag:'wx'});
   }
   let gates:ProductionReceipt['gates'];
   if(this.options.assembly) {
    const verification=await (this.options.assembly.resolve??resolveAndVerifyAssembly)(projectPath,context);
    answer.packageLock=verification.packageLock;files['package-lock.json']=verification.packageLock;
    const auditInput={files,context,answer,writerModelId:result.reply.modelId,ast:ast!};
    const audit=await this.options.assembly.audit(auditInput);validateAssemblyAudit(audit,auditInput);
    gates={ast:ast!,audit,verification};
    await this.note(JSON.stringify({kind:'assembly_gates_verified',id,artifactHash:audit.artifactHash,requirementsHash:audit.requirementsHash,auditorModel:audit.modelId,audit,ast,dependencies:verification.dependencies,tests:verification.tests,build:verification.build}));
   }
   const digest=fileDigest(files);
   await writeFile(join(projectPath,'vibe-provenance.json'),JSON.stringify({id,requestId,digest,contextHash,context,bindings:answer.bindings,modelId:result.reply.modelId,record:result.record,lineage:result.lineage,gates},null,2),{flag:'wx'});
   await this.note(JSON.stringify({kind:'application_generated',id,requestId,digest,contextHash,modelId:result.reply.modelId,bindings:answer.bindings,projectPath}));
   const receipt:ProductionReceipt={id,requestId,digest,contextHash,modelId:result.reply.modelId,projectPath,answer,files,state:'generated',...(gates?{gates}:{}),output:'Governed definition recorded. Deterministic source assembled. Review the files before launching.\nData profile: in memory only. Existing code frames are not compiled.\n',record:result.record};
   this.entries.set(id,{receipt});
   return structuredClone(receipt);
  } finally {this.generating=false;}
 }
 async launch(id:string,raw:unknown,digest:string):Promise<ProductionReceipt> {
  this.assertOpen();
  const e=this.entry(id),r=e.receipt;
  if(this.options.assembly && (!r.gates || r.gates.audit.artifactHash!==r.digest))throw Error('A matching complete-bundle assembly audit is required before preview.');
  if(r.digest!==digest)throw Error('The reviewed source digest does not match.');
  if(hash(validateProductionContext(raw))!==r.contextHash)throw Error('The accepted architecture or decisions changed. Generate and review again.');
  if(e.pending)return e.pending;
  if(e.server)return this.get(id);
  if([...this.entries.values()].some(other=>other!==e && (other.server||other.pending)))throw Error('Stop the current preview before launching another project.');
  e.pending=this.start(e);
  try {return await e.pending;} finally {e.pending=undefined;}
 }
 private async start(e:Entry):Promise<ProductionReceipt> {
  const r=e.receipt;
  r.state='building';
  r.output+='\nLaunch requested for '+r.digest+'\n';
  try {
   const actual:Record<string,string>={};
   for(const relative of Object.keys(r.files))actual[relative]=await readFile(join(r.projectPath,relative),'utf8');
   if(fileDigest(actual)!==r.digest)throw Error('Generated source changed on disk. Generate and review again.');
   await this.note(JSON.stringify({kind:'application_launch_requested',id:r.id,digest:r.digest,contextHash:r.contextHash}));
   r.output+='$ npm test (generated behavioral checks)\n';
   await new Promise<void>((done,reject)=>{
    const child=spawn(process.execPath,['--test',join(r.projectPath,'test/application.test.mjs')],{cwd:r.projectPath,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP}});
    const timer=setTimeout(()=>{child.kill();reject(Error('Generated tests exceeded 30 seconds.'));},30000);
    const output=(chunk:Buffer)=>{r.output=(r.output+chunk.toString()).slice(-40000);};
    child.stdout.on('data',output);child.stderr.on('data',output);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);if(code===0)done();else reject(Error('Generated tests exited '+code));});
   });
   this.assertOpen();
   r.output+='$ npm run build (Vite, fixed generation profile)\n';
   const previewToken=randomUUID();
   await build({root:r.projectPath,base:'./',configFile:false,envFile:false,publicDir:false,logLevel:'silent',css:{postcss:{plugins:[]}},build:{outDir:'dist',emptyOutDir:true}});
   this.assertOpen();
   // Recheck source after the asynchronous build; a changed file needs a new review.
   for(const relative of Object.keys(r.files))actual[relative]=await readFile(join(r.projectPath,relative),'utf8');
   if(fileDigest(actual)!==r.digest)throw Error('Generated source changed during build. Generate and review again.');
   await this.note(JSON.stringify({kind:'application_build_verified',id:r.id,digest:r.digest,contextHash:r.contextHash}));
   const preview=express();
   preview.use((_req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'");
    res.setHeader('X-Content-Type-Options','nosniff');
    next();
   });
   preview.use('/'+previewToken,express.static(join(r.projectPath,'dist'),{index:'index.html',dotfiles:'deny'}));
   const server=preview.listen(0,'127.0.0.1');
   try {
    await once(server,'listening');this.assertOpen();
    const previewUrl='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/'+previewToken+'/';
    await this.note(JSON.stringify({kind:'application_preview_started',id:r.id,digest:r.digest,previewUrl}));
    e.server=server;r.previewUrl=previewUrl;r.state='running';
    r.output+='Build passed. Preview: '+previewUrl+'\nUses installed IDE dependencies; a clean npm install has not been checked.\n';
   } catch(error) {await new Promise<void>(done=>server.close(()=>done()));throw error;}
   return this.get(r.id);
  } catch(error) {
   r.state='failed';delete r.previewUrl;r.output+='ERROR: '+(error as Error).message+'\n';
   throw error;
  }
 }
 async stop(id:string):Promise<ProductionReceipt> {
  const e=this.entry(id);
  if(e.pending)throw Error('The project is building. Wait for its result before stopping.');
  if(e.server) {
   await new Promise<void>((done,reject)=>e.server!.close(error=>error?reject(error):done()));
   e.server=undefined;
  }
  e.receipt.state='stopped';delete e.receipt.previewUrl;
  await this.note(JSON.stringify({kind:'application_preview_stopped',id,digest:e.receipt.digest}));
  return this.get(id);
 }
 async close():Promise<void> {
  this.disposed=true;
  await Promise.allSettled([...this.entries.values()].map(async e=>{
   await e.pending?.catch(()=>{});
   if(e.server)await new Promise<void>(done=>e.server!.close(()=>done()));
  }));
 }
}
/** Socket loopback + exact Origin/Host equality; proxy headers remain refused. */
export function localProductionRequest(req:Request):boolean {
 if(!isLoopback(req))return false;
 if(!req.headers.origin)return true; // authenticated command-line tools
 try {const origin=new URL(req.headers.origin);return origin.protocol==='http:' && origin.host===req.headers.host;}catch{return false;}
}
export function createProductionRouter(runtime:ProductionRuntime):Router {
 const router=Router();
 router.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  if(!localProductionRequest(req)){res.status(403).json({error:'production_local_only'});return;}
  next();
 });
 const reply=(res:express.Response,error:unknown)=>res.status(409).json({error:'production_shortfall',message:error instanceof Error?error.message:'Application production could not finish.'});
 router.post('/generate',async(req,res)=>{try{if(typeof req.body?.requestId!=='string')throw Error('A recoverable request ID is required.');res.status(201).json(await runtime.generate(req.body?.context,req.body.requestId));}catch(error){reply(res,error);}});
 router.post('/restore-core',async(req,res)=>{try{res.status(201).json(await runtime.restoreCore(req.body?.application,req.body?.context));}catch(error){reply(res,error);}});
 router.get('/requests/:id',async(req,res)=>{try{res.json(await runtime.recover(String(req.params.id)));}catch(error){reply(res,error);}});
 router.get('/:id',(req,res)=>{try{res.json(runtime.get(String(req.params.id)));}catch(error){reply(res,error);}});
 router.post('/:id/launch',async(req,res)=>{try{res.json(await runtime.launch(String(req.params.id),req.body?.context,req.body?.digest));}catch(error){reply(res,error);}});
 router.post('/:id/stop',async(req,res)=>{try{res.json(await runtime.stop(String(req.params.id)));}catch(error){reply(res,error);}});
 return router;
}
