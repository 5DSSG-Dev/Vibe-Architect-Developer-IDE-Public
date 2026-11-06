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
