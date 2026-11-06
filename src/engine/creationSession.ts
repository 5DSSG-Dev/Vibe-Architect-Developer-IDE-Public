import { parseCreationAnswer, type AppProposal, type CreationAnswer } from './appCreation';
import type { ApothecaryItem } from './relationEngine';
export type CreationTurn = { role: string; text: string; proposal?: AppProposal | null; suggestions?: string[]; requestId?: string; dispatch?: 'prepared'|'dispatched'|'completed'; state?: 'pending' | 'sent' | 'failed' | 'stopped' };
export interface CreationSession { version:1; turns:CreationTurn[]; answer:CreationAnswer|null; draft:string; suggestions:string[]; usedSuggestions:string[]; selectedDecisions:Record<string,string> }
export const emptyCreationSession=():CreationSession=>({version:1,turns:[],answer:null,draft:'',suggestions:[],usedSuggestions:[],selectedDecisions:{}});
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export const creationSessionKey=(coreId:string)=>'vibe-creation-session:'+coreId;
export function readCreationSession(storage:StoragePort|undefined,key:string,catalog:ApothecaryItem[]):CreationSession {
 try {
  const text=storage?.getItem(key);if(!text || text.length>250000)return emptyCreationSession();
  const data=JSON.parse(text) as CreationSession;
  if(data.version!==1 || !Array.isArray(data.turns) || data.turns.length>100 || data.turns.some(t=>!t || !['architect','luminary'].includes(t.role) || typeof t.text!=='string' || t.text.length>48000 || (t.state && !['pending','sent','failed','stopped'].includes(t.state))))throw Error('Invalid interview');
  if(data.turns.some(t=>(t.requestId!==undefined && (typeof t.requestId!=='string'||!/^[0-9a-f-]{36}$/.test(t.requestId))) || (t.dispatch!==undefined && !['prepared','dispatched','completed'].includes(t.dispatch))))throw Error('Invalid dispatch evidence');
  if(typeof data.draft!=='string' || data.draft.length>48000 || ![data.suggestions,data.usedSuggestions].every(a=>Array.isArray(a)&&a.length<=100&&a.every(s=>typeof s==='string'&&s.length<=700)) || !data.selectedDecisions || typeof data.selectedDecisions!=='object' || Array.isArray(data.selectedDecisions) || Object.values(data.selectedDecisions).some(v=>typeof v!=='string'||v.length>4000))throw Error('Invalid interview');
  let answer:CreationAnswer|null=null;
  if(data.answer){try{answer=parseCreationAnswer(JSON.stringify(data.answer),catalog);}catch{/* Preserve the conversation when an old proposal no longer matches the catalog. */}}
  return {...data,answer,turns:data.turns.map(t=>({...t,...(t.state==='pending'?{state:'stopped' as const}:{})}))};
 }catch{return emptyCreationSession();}
}
export function saveCreationSession(storage:StoragePort|undefined,key:string,value:CreationSession):boolean {
 try{const text=JSON.stringify(value);if(!storage || text.length>250000)return false;storage.setItem(key,text);return true;}catch{return false;}
}
/** Archive first: a failed write never authorizes clearing the visible interview. */
export function archiveCreationSession(storage:StoragePort|undefined,key:string,value:CreationSession):boolean {
 return saveCreationSession(storage,key+':previous',value);
}
