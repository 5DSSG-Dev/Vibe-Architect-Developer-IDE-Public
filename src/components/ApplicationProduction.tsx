import React, { useEffect, useRef, useState } from 'react';
import type { CoreManifest, ApothecaryItem } from '../engine/relationEngine';
import { productionContext, type ProductionAnswer } from '../engine/applicationProduction';
import { luminaryApi, readDemoKey, saveDemoKey, anchorDetail, type TurnRecord } from '../luminary/client';
import { appendLuminaryExchangeEvidence } from '../engine/evidenceArchive';
interface Receipt {
 id:string;requestId:string;digest:string;contextHash:string;modelId:string;projectPath:string;
 answer:ProductionAnswer;files:Record<string,string>;state:string;output:string;previewUrl?:string;record?:TurnRecord;
}
import { productionReceiptKey as receiptKey, terminalGenerationFailure, canReplaceProduction } from '../engine/productionClientState';
export function ApplicationProduction({core,catalog,onRemember}:{core:CoreManifest;catalog:ApothecaryItem[];onRemember:(pointer:NonNullable<CoreManifest['applicationProduction']>)=>void}) {
 const pendingKey='vibe.production.request:'+core.coreId;
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [outcomeUnknown,setOutcomeUnknown]=useState(false);
 const [receipt,setReceipt]=useState<Receipt|null>(null),[file,setFile]=useState('src/main.jsx');
 const [reviewedFor,setReviewedFor]=useState(''),[evidenceFor,setEvidenceFor]=useState(''),[key,setKey]=useState(readDemoKey);
 const [pendingId,setPendingId]=useState(()=>{try{return sessionStorage.getItem(pendingKey)??'';}catch{return '';}});
 const [fingerprint,setFingerprint]=useState({text:'',hash:''});
 const dialog=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null),epoch=useRef(0);
 let context:ReturnType<typeof productionContext>|undefined,problem='';
 try {context=productionContext(core,catalog);}catch(e){problem=(e as Error).message;}
 const contextText=JSON.stringify(context ?? null);
 const live=useRef(contextText);live.current=contextText;
 const reviewed=Boolean(receipt && reviewedFor===receiptKey(receipt));
 const evidenceSaved=Boolean(receipt && evidenceFor===receiptKey(receipt));
 useEffect(()=>{
  let active=true;
  void crypto.subtle.digest('SHA-256',new TextEncoder().encode(contextText)).then(value=>{
   if(active)setFingerprint({text:contextText,hash:Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('')});
  }).catch(()=>{if(active)setError('The browser could not fingerprint the accepted app. Launch remains unavailable.');});
  return()=>{active=false;};
 },[contextText]);
 useEffect(()=>{
  if(open && !dialog.current?.open)dialog.current?.showModal();
  if(!open && dialog.current?.open)dialog.current?.close();
 },[open]);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function api(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<Receipt> {
  await luminaryApi.localSession(signal);
  const response=await fetch('/api/luminary/production'+path,{method,headers:{'content-type':'application/json','x-luminary-demo-key':key.trim()},body:body===undefined?undefined:JSON.stringify(body),signal,credentials:'same-origin'});
  if(response.status===404)throw Object.assign(Error('Application production needs the updated local development gateway, a live Luminary source, its gauge and the review record.'),{confirmed:false});
  let value:any;try{value=await response.json();}catch{throw Error('The gateway result could not be read. Recover the last request before generating again.');}
  if(!response.ok)throw Object.assign(Error(value.message ?? value.shortfall?.message ?? 'Application production is unavailable ('+response.status+').'),{confirmed:terminalGenerationFailure(response.status,value.error)});
  return value;
 }
 function adopt(next:Receipt) {
  setReceipt(next);setReviewedFor('');setEvidenceFor('');setOutcomeUnknown(false);
  onRemember({id:next.id,digest:next.digest,contextHash:next.contextHash});
  try{sessionStorage.removeItem(pendingKey);}catch{/* The known receipt is also kept in the app. */}
  setPendingId('');
 }
 async function saveEvidence(next:Receipt) {
  await appendLuminaryExchangeEvidence({exchangeId:next.id+':production-proposed',event:'task_proposed',conversationId:core.coreId,detail:{generationId:next.id,sourceDigest:next.digest,contextHash:next.contextHash,...anchorDetail(next.record)}});
 }
 useEffect(()=>{
  const pointer=core.applicationProduction;
  const path=pendingId?'/requests/'+encodeURIComponent(pendingId):(pointer && typeof pointer.id==='string' && /^[0-9a-f-]{36}$/.test(pointer.id)?'/'+encodeURIComponent(pointer.id):'');
  if(!path)return;
  const controller=new AbortController(),startedAt=epoch.current;
  void api(path,'GET',undefined,controller.signal).then(async value=>{
   if(controller.signal.aborted||epoch.current!==startedAt)return;
   adopt(value);
   try{await saveEvidence(value);if(!controller.signal.aborted&&epoch.current===startedAt)setEvidenceFor(receiptKey(value));}
   catch(e){if(!controller.signal.aborted&&epoch.current===startedAt)setError('Generated files are retained, but browser evidence was not saved: '+(e as Error).message);}
  }).catch(e=>{if(!controller.signal.aborted&&epoch.current===startedAt)setError('The earlier generated project could not be restored: '+e.message+' Your architecture is retained.');});
  return()=>controller.abort();
 },[core.coreId]);
 const stale=!receipt || fingerprint.text!==contextText || receipt.contextHash!==fingerprint.hash;
 const replaceable=canReplaceProduction(receipt?.state,outcomeUnknown);
 useEffect(()=>{
  if(!receipt || (receipt.state!=='building'&&!outcomeUnknown))return;
  const controller=new AbortController();let timer:number|undefined,attempts=0;
  const poll=async()=>{
   try{
    const next=await api('/'+encodeURIComponent(receipt.id),'GET',undefined,controller.signal);
    if(controller.signal.aborted)return;
    setReceipt(next);setOutcomeUnknown(false);
    if(next.state!=='building')return;
   }catch{if(controller.signal.aborted)return;}
   if(++attempts<30)timer=window.setTimeout(poll,3000);
  };
  timer=window.setTimeout(poll,1000);
  return()=>{controller.abort();window.clearTimeout(timer);};
 },[receipt?.id,receipt?.state,outcomeUnknown,key]);
 async function act(action:'generate'|'recover'|'evidence'|'status'|'launch'|'stop') {
  if(request.current || (action==='generate' && (!context||!replaceable)))return;
  const controller=new AbortController();request.current=controller;epoch.current++;
  const sentContext=contextText;
  setBusy(true);setError('');
  try {
   if(key.trim())saveDemoKey(key.trim());
   let next:Receipt;
   if(action==='generate'||action==='recover') {
    if(action==='generate') {
     if(pendingId)throw Error('Recover the earlier request before starting another generation.');
     const id=crypto.randomUUID();sessionStorage.setItem(pendingKey,id);setPendingId(id);
     next=await api('/generate','POST',{context,requestId:id},controller.signal);
    } else next=await api('/requests/'+encodeURIComponent(pendingId),'GET',undefined,controller.signal);
    if(controller.signal.aborted)return;
    // Preserve successful source and its ID before a supplementary browser write.
    adopt(next);
    await saveEvidence(next);if(controller.signal.aborted)return;
    setEvidenceFor(receiptKey(next));
    if(live.current!==sentContext)setError('The architecture changed while generating. Generate again before review or launch.');
   } else if(action==='status') {
    const id=receipt?.id ?? core.applicationProduction?.id;
    if(!id)throw Error('Generate the app first.');
    next=await api('/'+encodeURIComponent(id),'GET',undefined,controller.signal);
    if(!controller.signal.aborted){
     if(!receipt){adopt(next);await saveEvidence(next);setEvidenceFor(receiptKey(next));}
     else setReceipt(next);
     setOutcomeUnknown(false);
    }
   } else if(action==='evidence') {
    if(!receipt)throw Error('Generate the app first.');
    await saveEvidence(receipt);if(!controller.signal.aborted)setEvidenceFor(receiptKey(receipt));
   } else {
    if(!receipt)throw Error('Generate the app first.');
    if(action==='launch') {
     if(!reviewed || stale || !evidenceSaved || outcomeUnknown || receipt.state==='building')throw Error('Save the evidence and review the current generated source before launching.');
     await appendLuminaryExchangeEvidence({exchangeId:crypto.randomUUID(),event:'task_accepted',conversationId:core.coreId,detail:{generationId:receipt.id,sourceDigest:receipt.digest,contextHash:receipt.contextHash}});
    }
    next=await api('/'+encodeURIComponent(receipt.id)+'/'+action,'POST',action==='launch'?{context,digest:receipt.digest}:{},controller.signal);
    if(!controller.signal.aborted){setReceipt(next);setOutcomeUnknown(false);}
   }
  } catch(e) {
   if(!controller.signal.aborted) {
    setError((e as Error).message);
    if((action==='generate'||action==='recover') && (e as {confirmed?:boolean}).confirmed){try{sessionStorage.removeItem(pendingKey);}catch{}setPendingId('');}
    if((action==='launch'||action==='stop') && receipt) {
     setOutcomeUnknown(true);
     try{const current=await api('/'+encodeURIComponent(receipt.id),'GET',undefined,controller.signal);if(!controller.signal.aborted){setReceipt(current);setOutcomeUnknown(false);}}
     catch{if(!controller.signal.aborted)setError('The operation outcome is unknown. Reconnect and inspect its status before retrying.');}
    }
   }
  } finally {if(request.current===controller){request.current=null;setBusy(false);}}
 }
 const preview=receipt?.previewUrl && /^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]{36}\/$/.test(receipt.previewUrl) ? receipt.previewUrl : undefined;
 const button='rounded-lg border border-cyan-400/40 px-3 py-2 text-sm disabled:opacity-40 hover:bg-cyan-500/10';
 return <>
  <button type="button" className="fixed top-20 right-4 z-30 rounded-xl border border-cyan-400/40 bg-slate-950/90 px-4 py-2 text-xs text-cyan-100" onClick={()=>setOpen(true)}>Build &amp; Preview</button>
  <dialog ref={dialog} aria-labelledby="application-production-title" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} className="m-auto w-[min(95vw,80rem)] max-h-[90dvh] overflow-y-auto rounded-2xl border border-cyan-400/40 bg-slate-950 p-5 text-slate-100 backdrop:bg-black/70">
   <div className="flex items-center justify-between gap-4"><h2 id="application-production-title" className="text-xl">Build &amp; Preview — {core.name}</h2><button type="button" className={button} onClick={()=>setOpen(false)}>Close panel</button></div>
   <p className="my-3 text-sm text-slate-300">Generate from your accepted architecture, review the files, then launch. This first profile supports text, forms, in-memory records, pages and navigation. Reloading clears app data. Existing Element code frames are not compiled.</p>
   <details className="my-3"><summary>Gateway connection</summary><label className="block text-sm">Local demo key, if needed<input type="password" value={key} onChange={e=>setKey(e.target.value)} className="ml-3 rounded bg-slate-800 p-2" autoComplete="off" /></label></details>
   {problem && <p className="my-3 text-amber-200">{problem}</p>}
   <div className="flex flex-wrap items-center gap-3">
    <button type="button" className={button} disabled={busy||!context||!replaceable||Boolean(pendingId)} onClick={()=>void act('generate')}>{busy?'Working…':'Generate application'}</button>
    {pendingId && <button type="button" className={button} disabled={busy} onClick={()=>void act('recover')}>Recover last request</button>}
    {receipt&&!evidenceSaved && <button type="button" className={button} disabled={busy} onClick={()=>void act('evidence')}>Save generation evidence</button>}
    <button type="button" className={button} disabled={busy||stale||!reviewed||!evidenceSaved||Boolean(preview)||outcomeUnknown||receipt?.state==='building'} onClick={()=>void act('launch')}>Launch reviewed application</button>
    <button type="button" className={button} disabled={busy||!preview} onClick={()=>void act('stop')}>Stop application</button>
    {(receipt || core.applicationProduction) && <button type="button" className={button} disabled={busy} onClick={()=>void act('status')}>{receipt?'Refresh status':'Restore previous generation'}</button>}
    <span role="status" className="text-sm">{busy?'Waiting for the gateway…':receipt?.state ?? 'Architecture ready for generation'}</span>
   </div>
   {error && <p role="alert" className="my-3 whitespace-pre-wrap text-rose-200">{error}</p>}
   {receipt && <>
    {stale && <p className="my-3 text-amber-200">The current architecture differs from this generation, or its fingerprint is still being checked. Regenerate before launching.</p>}
    <details className="my-4" open={!preview}><summary>Generated source and ownership</summary>
     <p className="my-2 break-all text-xs text-slate-400">Model: {receipt.modelId} · Source digest: {receipt.digest}<br/>Project: {receipt.projectPath}</p>
     <ul className="mb-2 text-xs">{Object.entries(receipt.answer.bindings).map(([objectId,elementId])=><li key={objectId}>{objectId} → {context?.elements.find(e=>e.id===elementId)?.name ?? elementId}</li>)}</ul>
     <label className="text-sm">File <select value={file} onChange={e=>setFile(e.target.value)} className="rounded bg-slate-800 p-2">{Object.keys(receipt.files).map(path=><option key={path}>{path}</option>)}</select></label>
     <pre tabIndex={0} className="mt-2 max-h-64 overflow-auto rounded bg-black p-3 text-xs">{receipt.files[file] ?? 'Select a generated file.'}</pre>
    </details>
    <label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={stale||busy} onChange={e=>setReviewedFor(e.target.checked?receiptKey(receipt):'')}/>I reviewed this generated app against the agreed requirements.</label>
    <details className="my-4" open><summary>Execution output</summary><pre tabIndex={0} className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black p-3 text-xs">{receipt.output}</pre></details>
    {preview && <section className="mt-4"><h3 className="mb-2">Application Preview</h3><iframe title={core.name+' application preview'} src={preview} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" className="h-[55vh] w-full rounded bg-white" /><p className="mt-2 text-xs text-slate-400">Closing this panel keeps the app running. Stop application closes its local preview.</p></section>}
   </>}
  </dialog>
 </>;
}
