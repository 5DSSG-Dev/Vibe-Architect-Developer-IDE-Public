/** Review belongs to one immutable artifact, not to the panel. */
export function clearLegacyPreviewResume(href:string):string {
 const url=new URL(href);
 url.searchParams.delete('previewRequest');
 url.searchParams.delete('previewBaseline');
 return url.href;
}
export function hasNewTerminalRequest(previous:number,current:number):boolean {
 return current>previous;
}
export function productionStatus(busy:boolean,state:string|undefined,error:string,pendingId:string,outcomeUnknown=false):string {
 if(busy)return 'Generating and independently auditing the application…';
 if(outcomeUnknown)return 'Operation outcome unknown — refresh status';
 if(error.includes('Secondary assembly audit'))return 'Generation blocked by independent audit';
 if(pendingId)return 'Request outcome unknown — recover last request';
 if(error.startsWith('Canceled waiting.'))return 'Waiting canceled — check request status';
 if(error)return 'Generation failed — see details below';
 if(state==='running')return 'Application running';
 if(state==='generated')return 'App generated — review it below, then launch';
 return state ?? 'Architecture ready for generation';
}
export function productionEvidenceId(r:{id:string;requestId:string}):string {
 return r.id+':production-proposed:'+r.requestId;
}
export function productionReceiptKey(r:{id:string;digest:string;contextHash:string}|null):string {
 return r ? r.id+':'+r.digest+':'+r.contextHash : '';
}
/** Authentication, throttling and transport errors say nothing about operation completion. */
export function terminalGenerationFailure(status:number,error:unknown):boolean {
 return status===409 && error==='production_shortfall'; // unknown-outcome uses a distinct code and is never terminal
}
/** Keep the active/uncertain application's controls until its outcome can be inspected. */
export function canReplaceProduction(state:string|undefined,outcomeUnknown:boolean):boolean {
 return !outcomeUnknown && state!=='building' && state!=='running';
}


export interface PendingProduction {
 version:1; requestId:string; coreId:string; contextHash:string; promptHash:string; createdAt:string;
}
export function readPendingProduction(storage:Pick<Storage,'getItem'>,key:string):PendingProduction|null {
 try {
  const value=JSON.parse(storage.getItem(key)??'null');
  return value?.version===1 && typeof value.coreId==='string' && /^[0-9a-f-]{36}$/.test(value.requestId)
   && /^[0-9a-f]{64}$/.test(value.contextHash) && /^[0-9a-f]{64}$/.test(value.promptHash) && typeof value.createdAt==='string' ? value : null;
 } catch {return null;}
}
export function persistPendingProduction(storage:Pick<Storage,'getItem'|'setItem'>,key:string,value:PendingProduction):void {
 const earlier=storage.getItem(key);
 if(earlier && earlier!==JSON.stringify(value))throw Error('A generation identity is already retained for this app. Inspect and recover it before generating again.');
 storage.setItem(key,JSON.stringify(value));
}
export function clearPendingProduction(storage:Pick<Storage,'getItem'|'removeItem'>,key:string,requestId:string):void {
 const value=readPendingProduction(storage,key);
 if(value?.requestId===requestId)storage.removeItem(key);
}
