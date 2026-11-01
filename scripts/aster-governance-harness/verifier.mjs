import { createHash } from 'node:crypto';
import { matches, manifestSchema, eventSchema, observationSchema, roles } from './schemas.mjs';
export function canonical(value) {
 if(value===null||typeof value!=='object') {
  if(typeof value==='number'&&!Number.isFinite(value)) throw new Error('non-json');
  if(!['string','number','boolean'].includes(typeof value)&&value!==null) throw new Error('non-json');
  return JSON.stringify(value);
 }
 if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
 if(Object.getPrototypeOf(value)!==Object.prototype) throw new Error('non-json');
 return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
export const digest = value => createHash('sha256').update(canonical(value),'utf8').digest('hex');
export const receiptRef = descriptor => `p6-return-v1:${digest(descriptor)}`;
export function verify(trace) {
 const errors = new Set(); const fail = code => errors.add(code);
 try { canonical(trace); } catch { return {version:1,status:'invalid',errors:['schema'],counts:null}; }
 if(!trace||Object.keys(trace).sort().join(',')!=='events,manifest,observations'||!matches(manifestSchema,trace.manifest)||!Array.isArray(trace.events)||!trace.events.every(e=>matches(eventSchema,e))||!matches(observationSchema,trace.observations)) return {version:1,status:'invalid',errors:['schema'],counts:null};
 const {manifest:m,events,observations:o}=trace; const id=m.identity;
 let admitted=false,result=null,closed=false,released=false,intent=null,effect=false;
 const seenDispatch=new Set(), roleCounts=Object.fromEntries(roles.map(r=>[r,0]));
 const tagged={dispatches:[],releases:[],effects:[]};
 const writerGroups=new Map(); let retries=0;
 for(const [i,e] of events.entries()) {
  if(e.seq!==i+1) fail('event-order');
  if(e.attemptId!==id.attemptId) fail('identity');
  const p=e.payload;
  switch(e.kind) {
   case 'admitted':
    if(admitted||i!==0||canonical(p)!==canonical(id)) fail('admission');
    admitted=true; break;
   case 'dispatch':
    if(!admitted||result||closed) fail('dispatch-order');
    if(seenDispatch.has(p.dispatchId)) fail('duplicate-dispatch');
    seenDispatch.add(p.dispatchId); roleCounts[p.role]++;
    if(p.role!=='conscience.write'&&p.phase!=='initial') fail('dispatch-phase');
    if(p.role==='conscience.write') {
     if(!p.conscienceResponseId) fail('dispatch-phase');
     const g=writerGroups.get(p.conscienceResponseId)??{initial:0,rewrite:0,'service-retry':0};
     if(p.phase!=='initial'&&g.initial!==1) fail('dispatch-phase');
     g[p.phase]++; writerGroups.set(p.conscienceResponseId,g);
     if(g.initial>1||g.rewrite>m.rewriteLimit||g['service-retry']>1) fail('writer-budget');
     if(p.phase==='service-retry') retries++;
     if(m.retryScope==='per-attempt'&&retries>1) fail('writer-budget');
    } else if(p.conscienceResponseId!==null) fail('dispatch-phase');
    tagged.dispatches.push({attemptId:e.attemptId,...p}); break;
   case 'effect-intent':
    if(!admitted||intent||result||m.route!=='tasks'||m.outcome!=='completed') fail('effect-order');
    if(p.operationId!==digest([id.scope,id.attemptId,'task-propose',1])) fail('effect-binding');
    intent=p.operationId; break;
   case 'effect':
    if(!intent||p.operationId!==intent||effect||result) fail('effect-order');
    effect=true; tagged.effects.push({attemptId:e.attemptId,...p}); break;
   case 'result-durable': {
    if(!admitted||result||closed) fail('result-order');
    const {hash,...line}=p;
    if(hash!==digest(line)||p.seq!==1||p.prevHash!==null) fail('result-anchor');
    const r=p.entry;
    for(const k of Object.keys(id)) if(r[k]!==id[k]) fail('result-binding');
    if(r.route!==m.route||r.submissionKeyDigest!==m.submissionKeyDigest||r.outcome!==m.outcome||r.bodyDigest!==digest(r.body)) fail('result-binding');
    if((r.outcome==='returned'&&r.httpStatus!==422)||(r.outcome==='completed'&&r.httpStatus!==(m.route==='tasks'?201:200))||(r.outcome==='shortfall'&&r.httpStatus<400)) fail('result-status');
    if(r.taskOperationId!==(effect?intent:null)||(m.route==='tasks'&&m.outcome==='completed'&&!effect)) fail('effect-binding');
    result=p; break;
   }
   case 'closed': {
    if(!result||closed) fail('missing-durable-result');
    if(p.outcome!==m.outcome||p.resultId!==result?.entry.resultId) fail('closure-binding');
    if(p.outcome==='returned') {
     const d=p.descriptor;
     if(!d||p.receiptRef!==receiptRef(d)) fail('receipt-reference');
     if(d) {
      for(const k of Object.keys(id)) if(d[k]!==id[k]) fail('receipt-binding');
      if(d.recipientRealm!==id.scope||d.resultId!==result?.entry.resultId||d.bodyDigest!==result?.entry.bodyDigest||d.resultAnchor.area!=='p6-results'||d.resultAnchor.seq!==result?.seq||d.resultAnchor.hash!==result?.hash) fail('receipt-binding');
     }
    } else if(p.descriptor!==null||p.receiptRef!==null) fail('receipt-unexpected');
    closed=true; break;
   }
   case 'release':
    if(!result||!closed||released) fail('release-order');
    if(p.resultId!==result?.entry.resultId||p.bodyDigest!==result?.entry.bodyDigest) fail('release-binding');
    released=true; tagged.releases.push({attemptId:e.attemptId,...p}); break;
  }
 }
 if(!admitted) fail('missing-admission');
 if(!result) fail('missing-durable-result');
 if(!closed) fail('missing-durable-closure');
 if(!released) fail('missing-release');
 for(const role of roles) if(roleCounts[role]>m.roleLimits[role]) fail('call-budget');
 for(const key of Object.keys(tagged)) {
  const observed=o[key];
  if(canonical(tagged[key])!==canonical(observed)) fail(key==='dispatches'?'dispatch-evidence':`${key}-evidence`);
 }
 if(new Set(o.dispatches.map(d=>d.dispatchId)).size!==o.dispatches.length) fail('duplicate-dispatch');
 const counts={dispatch:tagged.dispatches.length,release:tagged.releases.length,effect:tagged.effects.length};
 for(const key of Object.keys(counts)) if(counts[key]!==m.expectedCounts[key]) fail('declared-count');
 return {version:1,status:errors.size?'invalid':o.coverageComplete?'pass':'inconclusive',errors:[...errors].sort(),counts};
}
