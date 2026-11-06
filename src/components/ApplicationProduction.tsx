import type { VerifiedBuildReceipt } from '../engine/appBuildPlan';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play } from 'lucide-react';
import type { CoreManifest, ApothecaryItem } from '../engine/relationEngine';
import { productionContext, productionBaselineContext, type ProductionAnswer } from '../engine/applicationProduction';
import { luminaryApi, readDemoKey, saveDemoKey, anchorDetail, type TurnRecord } from '../luminary/client';
import { appendLuminaryExchangeEvidence } from '../engine/evidenceArchive';
import { acceptedCoreContext, saveCoreApplication, verifyCoreApplication, type CoreApplication } from '../engine/coreApplication';
interface Receipt extends Omit<VerifiedBuildReceipt,'context'> {
 id:string;requestId:string;digest:string;contextHash:string;modelId:string;projectPath:string;
 answer:ProductionAnswer;files:Record<string,string>;state:string;output:string;previewUrl?:string;record?:TurnRecord;
}
import { productionEvidenceId, productionReceiptKey as receiptKey, terminalGenerationFailure, canReplaceProduction, productionStatus, clearLegacyPreviewResume, hasNewTerminalRequest } from '../engine/productionClientState';
export function ApplicationProduction({core,catalog,onRemember,onSaveCore,onVerified,terminalRequest=0}:{core:CoreManifest;catalog:ApothecaryItem[];onRemember:(pointer:NonNullable<CoreManifest['applicationProduction']>)=>void;onSaveCore:(app:CoreApplication)=>void;onVerified?:(receipt:VerifiedBuildReceipt)=>void;terminalRequest?:number}) {
 const pendingKey='vibe.production.request:'+core.coreId;
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [baselineMode,setBaselineMode]=useState(false);
 const [terminalInput,setTerminalInput]=useState(''),[terminalLines,setTerminalLines]=useState<string[]>(['Vibe Architect Terminal. Type help for available commands.']);
 const terminalEnd=useRef<HTMLDivElement>(null);
 const [outcomeUnknown,setOutcomeUnknown]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{if(!busy){setElapsed(0);return;}const started=Date.now();const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>window.clearInterval(timer);},[busy]);
 const [receipt,setReceipt]=useState<Receipt|null>(null),[file,setFile]=useState('src/main.jsx');
 const [reviewedFor,setReviewedFor]=useState(''),[evidenceFor,setEvidenceFor]=useState(''),[key,setKey]=useState(readDemoKey);
 const [pendingId,setPendingId]=useState(()=>{try{return sessionStorage.getItem(pendingKey)??'';}catch{return '';}});
 const [fingerprint,setFingerprint]=useState({text:'',hash:''});
 const coreOperation=useRef(false);
 const dialog=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null),epoch=useRef(0);
 const trigger=useRef<HTMLButtonElement>(null);
 const [triggerHost,setTriggerHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{setTriggerHost(document.getElementById('footer-build-preview'));},[]);
 useEffect(()=>{
  const cleaned=clearLegacyPreviewResume(window.location.href);
  if(cleaned!==window.location.href)window.history.replaceState(window.history.state,'',cleaned);
 },[]);
 const previousTerminalRequest=useRef(terminalRequest);
 useEffect(()=>{
  const fresh=hasNewTerminalRequest(previousTerminalRequest.current,terminalRequest);
  previousTerminalRequest.current=terminalRequest;
  if(!fresh)return;
  setOpen(true);
  const timer=window.setTimeout(()=>document.getElementById('production-terminal-input')?.focus(),0);
  return()=>window.clearTimeout(timer);
 },[terminalRequest]);
 const keepModalFocus=(event:React.KeyboardEvent<HTMLDialogElement>)=>{
  if(event.key!=='Tab')return;
  const root=event.currentTarget;
  const candidates=Array.from(root.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])'));
  const focusable=candidates.filter(el=>{
   const computed=window.getComputedStyle(el);
   return computed.display!=='none'&&computed.visibility!=='hidden'&&el.getClientRects().length>0&&
     !(el.closest('details:not([open])')&&!el.matches('summary'));
  });
  if(!focusable.length){event.preventDefault();root.focus();return;}
  const first=focusable[0],last=focusable[focusable.length-1],active=document.activeElement;
  if(!root.contains(active)||(!event.shiftKey&&active===last)|| (event.shiftKey&&active===first)){
   event.preventDefault();(event.shiftKey?last:first).focus();
  }
 };

 let context:ReturnType<typeof productionContext>|undefined,problem='';
 try {context=baselineMode?productionBaselineContext(core,catalog):productionContext(core,catalog);}catch(e){problem=(e as Error).message;}
 const contextText=JSON.stringify(context ?? null);
 const canOfferNoteBaseline=core.appBuildPlan?.items.some(item=>item.text.trim()==='My answer: Personal single-user, no login') && core.appBuildPlan.items.some(item=>item.text.trim()==='My answer: Text only for now');
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
  if(response.status===404) {
   // Only the composition layer's structured unavailable response confirms non-admission.
   // Missing recovery IDs, proxy errors and unreadable responses remain uncertain.
   const unavailable=await response.json().catch(()=>null);
   const notAdmitted=method==='POST' && path==='/generate' && unavailable?.error==='application_production_unavailable' && unavailable.admitted===false;
   throw Object.assign(Error(notAdmitted
    ? 'Generation was not started: this gateway does not provide application production. Connect to the configured local development gateway before retrying.'
    : 'Application production needs the updated local development gateway, a live Luminary source, its gauge and the review record.'),{confirmed:Boolean(notAdmitted)});
  }
  let value:any;try{value=await response.json();}catch{throw Error('The gateway result could not be read. Recover the last request before generating again.');}
  if(!response.ok)throw Object.assign(Error(value.message ?? value.shortfall?.message ?? 'Application production is unavailable ('+response.status+').'),{confirmed:terminalGenerationFailure(response.status,value.error)});
  return value;
 }
 function adopt(next:Receipt) {
  setReceipt(next);setReviewedFor('');setEvidenceFor('');setOutcomeUnknown(false);
  if(!baselineMode)onRemember({id:next.id,digest:next.digest,contextHash:next.contextHash});
  try{sessionStorage.removeItem(pendingKey);}catch{/* The known receipt is also kept in the app. */}
  setPendingId('');
 }
 async function saveEvidence(next:Receipt) {
  // A restored materialization has its own request; preserve the original proposal evidence.
  await appendLuminaryExchangeEvidence({exchangeId:productionEvidenceId(next),event:'task_proposed',conversationId:core.coreId,detail:{generationId:next.id,sourceDigest:next.digest,contextHash:next.contextHash,...anchorDetail(next.record)}});
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
 useEffect(()=>{if(!baselineMode && receipt && context && receipt.contextHash===fingerprint.hash)onVerified?.({...receipt,context});},[receipt?.id,receipt?.digest,fingerprint.hash,baselineMode]);
 const stale=!receipt || fingerprint.text!==contextText || receipt.contextHash!==fingerprint.hash;
 const replaceable=canReplaceProduction(receipt?.state,outcomeUnknown);
 async function saveToCore() {
  if(coreOperation.current || request.current)return;
  coreOperation.current=true;setBusy(true);setError('');
  const sentContext=contextText;
  try {
    if(!receipt || !reviewed || stale || !evidenceSaved || outcomeUnknown)throw Error('Review the current generated source and save its evidence before saving to CORE.');
    if(baselineMode)throw Error('This preview baseline leaves accepted features pending and cannot be saved as the complete CORE application.');
    const application=await saveCoreApplication(core,catalog,receipt);
    await appendLuminaryExchangeEvidence({exchangeId:crypto.randomUUID(),event:'task_accepted',conversationId:core.coreId,detail:{generationId:receipt.id,sourceDigest:receipt.digest,contextHash:receipt.contextHash,action:'save_core_program'}});
    if(live.current!==sentContext)throw Error('The architecture changed before saving. Review again.');
    onSaveCore(application);
  } catch(e) {setError((e as Error).message);}
  finally {coreOperation.current=false;setBusy(false);}
 }
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
 async function act(action:'generate'|'recover'|'restore-core'|'evidence'|'status'|'launch'|'stop') {
  if(coreOperation.current || request.current || (action==='generate' && (!context||!replaceable)))return;
  const controller=new AbortController();request.current=controller;epoch.current++;
  const sentContext=contextText;
  setBusy(true);setError('');
  try {
   if(key.trim())saveDemoKey(key.trim());
   let next:Receipt;
   if(action==='generate'||action==='recover'||action==='restore-core') {
    if(action==='generate') {
     if(pendingId)throw Error('Recover the earlier request before starting another generation.');
     const id=crypto.randomUUID();sessionStorage.setItem(pendingKey,id);setPendingId(id);
     next=await api('/generate','POST',{context,requestId:id},controller.signal);
    } else if(action==='restore-core') {
     if(!core.application || !replaceable || pendingId)throw Error('Recover any pending request and stop the running app before restoring CORE.');
     const application=await verifyCoreApplication(core.application,acceptedCoreContext(core,catalog));
     next=await api('/restore-core','POST',{application,context},controller.signal);
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
 function cancelWait() {
  const controller=request.current;if(!controller)return;
  controller.abort();request.current=null;epoch.current++;setBusy(false);
  if(receipt)setOutcomeUnknown(true);
  setError('Canceled waiting. The gateway may still finish this request. Use Recover last request or Refresh status to check it; no new generation was sent.');
 }
 function runTerminal(raw:string) {
  const command=raw.trim().toLowerCase();
  setTerminalInput('');
  if(!command)return;
  if(command==='clear'){setTerminalLines([]);return;}
  const write=(line:string)=>setTerminalLines(previous=>[...previous,'> '+raw,line].slice(-80));
  if(command==='help'){write('Available: help, files, status, start, stop, clear. Start runs the reviewed app through the governed launch path.');return;}
  if(command==='files'){write(receipt?Object.keys(receipt.files).join('\n'):'Generate an application first.');return;}
  if(command==='status'){write(receipt?`${receipt.state}${receipt.previewUrl?' · '+receipt.previewUrl:''}`:'No generated application yet.');if(receipt&&!busy)void act('status');return;}
  if(command==='start'){
   if(!receipt){write('Generate an application first.');return;}
   if(busy||stale||!reviewed||!evidenceSaved||Boolean(preview)||outcomeUnknown||receipt.state==='building') {write('Review the current source and save its evidence before starting; wait for any active operation to finish.');return;}
   write('Starting reviewed application. Tests and build output will appear below.');void act('launch');return;
  }
  if(command==='stop'){
   if(!preview||busy){write('No running application is available to stop.');return;}
   write('Stopping application.');void act('stop');return;
  }
  write('Unknown command. Type help for available commands.');
 }
 useEffect(()=>{const log=terminalEnd.current?.parentElement;if(open&&log)log.scrollTop=log.scrollHeight;},[terminalLines,receipt?.output,open]);
 const preview=receipt?.previewUrl && /^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]{36}\/$/.test(receipt.previewUrl) ? receipt.previewUrl : undefined;
 const button='rounded-lg border border-cyan-400/40 px-3 py-2 text-sm disabled:opacity-40 hover:bg-cyan-500/10';
 return <>
  {triggerHost && createPortal(<button ref={trigger} type="button" aria-haspopup="dialog" onClick={()=>setOpen(true)} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border font-orbitron text-[10px] font-bold tracking-wider uppercase transition-colors bg-slate-900/80 border-cyan-500/30 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-200"><Play className="w-4 h-4 text-cyan-300" /><span>Build &amp; Preview</span></button>,triggerHost)}
  <dialog ref={dialog} tabIndex={-1} onKeyDown={keepModalFocus} aria-labelledby="application-production-title" onCancel={()=>setOpen(false)} onClose={()=>{setOpen(false);trigger.current?.focus();}} className={'m-auto max-h-[90dvh] overflow-y-auto rounded-2xl border border-cyan-400/40 bg-slate-950 p-5 text-slate-100 backdrop:bg-black/70 '+(preview?'h-[90dvh] w-[min(95vw,100rem)] lg:overflow-hidden':'w-[min(95vw,80rem)]')}>
   <div className="flex items-center justify-between gap-4"><h2 id="application-production-title" className="text-xl">Build &amp; Preview — {core.name}</h2><button type="button" className={button} onClick={()=>setOpen(false)}>Close panel</button></div>
   <div className={preview?'mt-4 grid gap-5 lg:h-[calc(90dvh-7rem)] lg:min-h-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]':''}>
   <div className={preview?'min-w-0 lg:h-full lg:overflow-y-auto lg:pr-3':''}>
   <p className="my-3 text-sm text-slate-300">Generate from your accepted architecture, review the files, then launch. This first profile supports text-entry forms, lists of in-memory records, pages and navigation. Records entered in a generated app clear when that app reloads; saving the IDE workspace does not keep them. Not yet supported: image uploads and attachments, accounts and login, persistent storage, search, and editing or deleting records. Existing Element code frames are not compiled.</p>
   <details className="my-3"><summary>Gateway connection</summary><label className="block text-sm">Local demo key, if needed<input type="password" value={key} onChange={e=>setKey(e.target.value)} className="ml-3 rounded bg-slate-800 p-2" autoComplete="off" /></label></details>
   {problem && <p className="my-3 text-amber-200">{problem}</p>}
   {!baselineMode && problem && canOfferNoteBaseline && <button type="button" className={button} onClick={()=>{setBaselineMode(true);setError('');}}>Generate supported text-and-list baseline</button>}
   {baselineMode && <p className="my-3 text-amber-200">Preview baseline only: plain-text notes and an in-memory list. Folders, tags, rich text, search, pinning and archiving remain pending in the accepted interview; this preview does not complete those ToDos or replace the full CORE program. <button type="button" className="underline" onClick={()=>setBaselineMode(false)}>Return to full scope</button></p>}
   <div className="flex flex-wrap items-center gap-3">
    <button type="button" className={button} disabled={busy||!context||!replaceable||Boolean(pendingId)} onClick={()=>void act('generate')}>{busy?'Working…':'Generate application'}</button>
    {busy && request.current && <button type="button" className={button} onClick={cancelWait}>Cancel wait</button>}
    {pendingId && <button type="button" className={button} disabled={busy} onClick={()=>void act('recover')}>Recover last request</button>}
    {receipt&&!evidenceSaved && <button type="button" className={button} disabled={busy} onClick={()=>void act('evidence')}>Save generation evidence</button>}
    <button type="button" className={button} disabled={busy||stale||!reviewed||!evidenceSaved||Boolean(preview)||outcomeUnknown||receipt?.state==='building'} onClick={()=>void act('launch')}>Launch reviewed application</button>
    <button type="button" className={button} disabled={busy||!preview} onClick={()=>void act('stop')}>Stop application</button>
    {(receipt || core.applicationProduction) && <button type="button" className={button} disabled={busy} onClick={()=>void act('status')}>{receipt?'Refresh status':'Restore previous generation'}</button>}
    <span role="status" className="text-sm">{problem?'Generation unavailable — see details above':productionStatus(busy,receipt?.state,error,pendingId,outcomeUnknown)}{busy?` · ${elapsed}s`:''}</span>
   </div>
   {error && <p role="alert" className="my-3 whitespace-pre-wrap text-rose-200">{error}</p>}
   <section aria-label="CORE application" className="my-4 rounded-xl border border-cyan-400/30 p-3">
    <h3 className="mb-2">CORE application</h3>
    <p className="mb-3 text-sm text-slate-300">Save the reviewed program inside this app. After reopening, restore it without another model request, review its source, then launch above. The local gateway and its original review record are required. App records remain in memory; Element code frames are not compiled.</p>
    <div className="flex flex-wrap gap-3">
     <button type="button" className={button} disabled={baselineMode||busy||stale||!reviewed||!evidenceSaved||outcomeUnknown} onClick={()=>void saveToCore()}>Save reviewed app to CORE</button>
     <button type="button" className={button} disabled={baselineMode||busy||!context||!core.application||!replaceable||Boolean(pendingId)} onClick={()=>void act('restore-core')}>Restore saved CORE app</button>
    </div>
    {core.application && <p className="mt-2 text-xs text-slate-400">Saved program: {core.application.answer?.definition?.name} · Run is always explicit.</p>}
   </section>
   {receipt && <>
    {stale && <p className="my-3 text-amber-200">The current architecture differs from this generation, or its fingerprint is still being checked. Regenerate before launching.</p>}
    <details className="my-4" open={!preview}><summary>Generated source and ownership</summary>
     <p className="my-2 break-all text-xs text-slate-400">Model: {receipt.modelId} · Source digest: {receipt.digest}<br/>Project: {receipt.projectPath}</p>
     <ul className="mb-2 text-xs">{Object.entries(receipt.answer.bindings).map(([objectId,elementId])=><li key={objectId}>{objectId} → {context?.elements.find(e=>e.id===elementId)?.name ?? elementId}</li>)}</ul>
     <label className="text-sm">File <select value={file} onChange={e=>setFile(e.target.value)} className="rounded bg-slate-800 p-2">{Object.keys(receipt.files).map(path=><option key={path}>{path}</option>)}</select></label>
     <pre tabIndex={0} className="mt-2 max-h-64 overflow-auto rounded bg-black p-3 text-xs">{receipt.files[file] ?? 'Select a generated file.'}</pre>
    </details>
    <label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={stale||busy} onChange={e=>setReviewedFor(e.target.checked?receiptKey(receipt):'')}/>I reviewed this generated app against the agreed requirements.</label>
   </>}
    <section className="my-4" aria-label="Application Terminal"><h3 className="mb-2 text-sm font-semibold">Terminal</h3>
     <div role="log" aria-live="polite" aria-relevant="additions text" tabIndex={0} className="max-h-52 overflow-auto rounded bg-black p-3 font-mono text-xs whitespace-pre-wrap text-emerald-100">
      {terminalLines.join('\n')}{'\n'}{receipt?.output ?? 'Generate an application before using start or stop.'}<div ref={terminalEnd}/>
     </div>
     <form className="mt-2 flex gap-2" onSubmit={e=>{e.preventDefault();runTerminal(terminalInput);}}>
      <label htmlFor="production-terminal-input" className="sr-only">Terminal command</label>
      <span aria-hidden="true" className="py-2 font-mono text-emerald-200">&gt;</span>
      <input id="production-terminal-input" autoComplete="off" spellCheck={false} value={terminalInput} onChange={e=>setTerminalInput(e.target.value)} placeholder="Type help, start, stop or status" className="min-w-0 flex-1 rounded bg-slate-800 p-2 font-mono text-sm" />
      <button type="submit" className={button} disabled={busy}>Run</button>
     </form>
     <p className="mt-2 text-xs text-slate-400">Commands operate only on this generated app. Start runs its tests and build before opening Preview.</p>
    </section>
   </div>
    {preview && <section aria-label="Application Preview" className="flex min-h-0 min-w-0 flex-col rounded-xl border border-cyan-400/30 bg-slate-900/40 p-3 lg:h-full"><h3 className="mb-2 shrink-0">Application Preview</h3><iframe title={core.name+' application preview'} src={preview} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" className="h-[60dvh] min-h-[20rem] w-full rounded bg-white lg:h-auto lg:min-h-0 lg:flex-1" /><p className="mt-2 shrink-0 text-xs text-slate-400">Closing this panel keeps the app running. Stop application closes its local preview.</p></section>}
   </div>
  </dialog>
 </>;
}
