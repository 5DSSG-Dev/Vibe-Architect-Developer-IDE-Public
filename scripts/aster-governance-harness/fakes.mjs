// In-memory synthetic witnesses only. No fetch, providers, executor or store imports.
import { digest, receiptRef } from './verifier.mjs';
export function fakeAdapters(trace) {
 const event = (kind,payload) => trace.events.push({version:1,seq:trace.events.length+1,attemptId:trace.manifest.identity.attemptId,kind,payload:structuredClone(payload)});
 const observe = (key,payload) => trace.observations[key].push({attemptId:trace.manifest.identity.attemptId,...structuredClone(payload)});
 return {
  event,
  dispatch(payload) { observe('dispatches',payload); event('dispatch',payload); },
  release(payload) { observe('releases',payload); event('release',payload); },
  effect(operationId) { observe('effects',{operationId}); event('effect',{operationId}); }
 };
}
export function syntheticTrace({outcome='returned',route='ask',retryScope='per-response',writerCalls=0,writerLimit=12}={}) {
 const identity={scope:'fixture-realm',workspace:'fixture-workspace',direction:'architect-to-luminary',attemptId:'fixture-attempt',exchangeId:'fixture-exchange',ordinal:0,registrationDigest:digest('registration'),snapshotDigest:digest('snapshot'),originalDigest:digest('original'),effectiveDigest:digest('effective')};
 const trace={manifest:{version:1,runId:'synthetic-run',contract:'P6-A-v0.2@fb50bacc2ef0e8ecf66fb082aa4ea78f4cdffd52:section-5',mode:'offline-synthetic',identity,route,submissionKeyDigest:digest('key'),outcome,retryScope,rewriteLimit:2,roleLimits:{'response.generate':1,'response.reform':0,'conscience.write':writerLimit,'gauge.read':1},expectedCounts:{dispatch:writerCalls||1,release:1,effect:route==='tasks'&&outcome==='completed'?1:0}},events:[],observations:{coverageComplete:true,dispatches:[],releases:[],effects:[]}};
 const f=fakeAdapters(trace); f.event('admitted',identity);
 if(writerCalls) {
  // Comparative synthetic budget fixtures, not private cases or model responses.
  for(let c=0,n=0;n<writerCalls;c++) {
   const phases=['initial','rewrite','rewrite'];
   if(retryScope==='per-response'||c===0) phases.push('service-retry');
   for(const phase of phases) { if(n===writerCalls) break; f.dispatch({dispatchId:`dispatch-${++n}`,role:'conscience.write',phase,conscienceResponseId:`return-${c}`}); }
  }
 } else f.dispatch({dispatchId:'dispatch-1',role:outcome==='completed'?'response.generate':'gauge.read',phase:'initial',conscienceResponseId:null});
 let operationId=null;
 if(route==='tasks'&&outcome==='completed') {
  operationId=digest([identity.scope,identity.attemptId,'task-propose',1]);
  f.event('effect-intent',{operationId}); f.effect(operationId);
 }
 const body={message:'synthetic status only'};
 const result={version:1,kind:'p6_public_result',resultId:'fixture-result',...identity,route,submissionKeyDigest:trace.manifest.submissionKeyDigest,outcome,httpStatus:outcome==='returned'?422:outcome==='completed'?(route==='tasks'?201:200):503,body,bodyDigest:digest(body),taskOperationId:operationId};
 const line={seq:1,at:'2026-11-01T00:00:00.000Z',prevHash:null,entry:result};
 const record={...line,hash:digest(line)}; f.event('result-durable',record);
 const descriptor=outcome==='returned'?{version:1,issuer:'p6-inbound-coordinator',subject:'validated-inbound-return',...identity,recipientRealm:identity.scope,resultId:result.resultId,bodyDigest:result.bodyDigest,resultAnchor:{area:'p6-results',seq:record.seq,hash:record.hash}}:null;
 f.event('closed',{outcome,resultId:result.resultId,descriptor,receiptRef:descriptor?receiptRef(descriptor):null});
 f.release({resultId:result.resultId,bodyDigest:result.bodyDigest});
 return trace;
}
