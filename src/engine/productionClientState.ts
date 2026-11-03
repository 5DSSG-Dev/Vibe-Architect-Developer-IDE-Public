/** Review belongs to one immutable artifact, not to the panel. */
export function productionReceiptKey(r:{id:string;digest:string;contextHash:string}|null):string {
 return r ? r.id+':'+r.digest+':'+r.contextHash : '';
}
/** Authentication, throttling and transport errors say nothing about operation completion. */
export function terminalGenerationFailure(status:number,error:unknown):boolean {
 return status===409 && error==='production_shortfall';
}
/** Keep the active/uncertain application's controls until its outcome can be inspected. */
export function canReplaceProduction(state:string|undefined,outcomeUnknown:boolean):boolean {
 return !outcomeUnknown && state!=='building' && state!=='running';
}
