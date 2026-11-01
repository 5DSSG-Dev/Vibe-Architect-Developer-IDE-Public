import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticTrace } from './fakes.mjs';
import { verify, digest, receiptRef, canonical } from './verifier.mjs';
import { manifestSchema, eventSchema, resultSchema, publishedSchema, matches, observationSchema } from './schemas.mjs';
const event=(t,k)=>t.events.find(e=>e.kind===k);
const renumber=t=>t.events.forEach((e,i)=>e.seq=i+1);
function broken(name,change,code,options) {
 test(name,()=>{const t=syntheticTrace(options);change(t);const result=verify(t);assert.equal(result.status,'invalid');assert.ok(result.errors.includes(code),JSON.stringify(result));});
}
for(const options of [{},{outcome:'completed'},{outcome:'shortfall'},{outcome:'completed',route:'tasks'},{writerCalls:12,writerLimit:12,retryScope:'per-response'},{writerCalls:10,writerLimit:10,retryScope:'per-attempt'}]) {
 test(`valid synthetic trace ${JSON.stringify(options)}`,()=>assert.equal(verify(syntheticTrace(options)).status,'pass'));
}
test('published JSON schemas match runtime vocabulary',()=>{for(const [n,s] of Object.entries({manifest:manifestSchema,event:eventSchema,result:resultSchema})) assert.deepEqual(publishedSchema(n),s);});
test('canonicalization is order independent with a fixed independent hash vector',()=>{assert.equal(canonical({z:1,a:[true,null]}),'{"a":[true,null],"z":1}');assert.equal(digest('abc'),'6cc43f858fbb763301637b5af970e2a46b46f461f27e5a0f41e009c59b827b25');});
broken('duplicate dispatch in both witnesses',t=>{const d=structuredClone(event(t,'dispatch'));t.events.splice(2,0,d);t.observations.dispatches.push(structuredClone(t.observations.dispatches[0]));t.manifest.expectedCounts.dispatch++;renumber(t);},'duplicate-dispatch');
for(const [kind,code] of [['result-durable','missing-durable-result'],['closed','missing-durable-closure'],['admitted','missing-admission']]) broken(`missing ${kind}`,t=>{t.events=t.events.filter(e=>e.kind!==kind);renumber(t);},code);
broken('release before closure',t=>{const a=t.events.findIndex(e=>e.kind==='closed'),b=a+1;[t.events[a],t.events[b]]=[t.events[b],t.events[a]];renumber(t);},'release-order');
broken('unobserved tagged dispatch',t=>{t.observations.dispatches=[];},'dispatch-evidence');
broken('untagged transport dispatch',t=>{t.events=t.events.filter(e=>e.kind!=='dispatch');t.manifest.expectedCounts.dispatch=0;renumber(t);},'dispatch-evidence');
broken('unknown dispatch role',t=>{t.observations.dispatches[0].role='unknown';},'schema');
broken('missing transport release evidence',t=>{t.observations.releases=[];},'releases-evidence');
broken('exceeded role ceiling',t=>{t.manifest.roleLimits['gauge.read']=0;},'call-budget');
broken('12-call evidence cannot fit 10-call budget',t=>{t.manifest.roleLimits['conscience.write']=10;},'call-budget',{writerCalls:12});
broken('per-response retries cannot masquerade as per-attempt',t=>{t.manifest.retryScope='per-attempt';},'writer-budget',{writerCalls:12});
broken('forged receipt reference',t=>{event(t,'closed').payload.receiptRef='p6-return-v1:forged';},'receipt-reference');
for(const key of ['scope','workspace','attemptId','exchangeId','ordinal','registrationDigest','snapshotDigest','originalDigest','effectiveDigest','recipientRealm','resultId','bodyDigest']) {
 broken(`receipt binds ${key} even with recomputed reference`,t=>{const p=event(t,'closed').payload;p.descriptor[key]=key==='ordinal'?1:key.endsWith('Digest')?digest('wrong'):'wrong';p.receiptRef=receiptRef(p.descriptor);},'receipt-binding');
}
broken('wrong receipt direction',t=>{event(t,'closed').payload.descriptor.direction='luminary-to-architect';},'schema');
for(const key of ['seq','hash']) broken(`receipt anchor ${key}`,t=>{const p=event(t,'closed').payload;p.descriptor.resultAnchor[key]=key==='seq'?2:digest('wrong');p.receiptRef=receiptRef(p.descriptor);},'receipt-binding');
broken('result hash tampering',t=>{event(t,'result-durable').payload.hash=digest('wrong');},'result-anchor');
broken('result identity mismatch with recomputed chain hash',t=>{const p=event(t,'result-durable').payload;p.entry.snapshotDigest=digest('wrong');const {hash,...line}=p;p.hash=digest(line);},'result-binding');
broken('missing task intent',t=>{t.events=t.events.filter(e=>e.kind!=='effect-intent');renumber(t);},'effect-order',{route:'tasks',outcome:'completed'});
broken('missing task effect evidence',t=>{t.observations.effects=[];},'effects-evidence',{route:'tasks',outcome:'completed'});
broken('unknown schema version',t=>{t.manifest.version=2;},'schema');
broken('unreviewed contract pin',t=>{t.manifest.contract='latest';},'schema');
broken('negative budget',t=>{t.manifest.roleLimits['gauge.read']=-1;},'schema');
broken('declared count mismatch',t=>{t.manifest.expectedCounts.release=2;},'declared-count');
broken('duplicate closure',t=>{t.events.splice(-1,0,structuredClone(event(t,'closed')));renumber(t);},'missing-durable-result');
broken('event sequence gap',t=>{t.events[1].seq=99;},'event-order');
test('incomplete witness coverage is inconclusive, never pass',()=>{const t=syntheticTrace();t.observations.coverageComplete=false;assert.equal(verify(t).status,'inconclusive');});
test('invalid evidence remains invalid despite incomplete coverage',()=>{const t=syntheticTrace();t.observations.coverageComplete=false;t.events=[];assert.equal(verify(t).status,'invalid');});
test('non-JSON/cyclic evidence is rejected without throwing',()=>{const t=syntheticTrace();t.extra=t;assert.equal(verify(t).status,'invalid');});
for(const [name,mutate] of [
 ['deleted event',t=>{delete t.events[1];}],
 ['all-hole events',t=>{t.events=new Array(2);}],
 ['undefined event',t=>{t.events[1]=undefined;}],
 ...['dispatches','releases','effects'].map(key=>[`sparse observation ${key}`,t=>{t.observations[key]=new Array(1);}]),
 ['sparse nested result body',t=>{event(t,'result-durable').payload.entry.body={values:new Array(1)};}],
]) {
 test(`malformed evidence returns invalid without throwing: ${name}`,()=>{
  const t=syntheticTrace(); mutate(t);
  assert.deepEqual(verify(t),{version:1,status:'invalid',errors:['schema'],counts:null});
 });
}
test('canonical rejects sparse arrays instead of silently skipping holes',()=>{
 assert.throws(()=>canonical(new Array(1)),/non-json/);
 const nested={values:[1,2]}; delete nested.values[0];
 assert.throws(()=>canonical(nested),/non-json/);
});

test('standalone schema validator rejects sparse observation arrays',()=>{
 for(const key of ['dispatches','releases','effects']) {
  const o=syntheticTrace().observations; o[key]=new Array(1);
  assert.equal(matches(observationSchema,o),false);
 }
});
