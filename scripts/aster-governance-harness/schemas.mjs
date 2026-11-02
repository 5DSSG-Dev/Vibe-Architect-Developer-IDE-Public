// JSON Schema vocabulary for synthetic offline evidence, not production instrumentation.
import { readFileSync } from 'node:fs';
export const roles = ['response.generate', 'response.reform', 'conscience.write', 'gauge.read'];
const str = {type:'string', minLength:1};
const digest = {type:'string', pattern:'^[a-f0-9]{64}$'};
const integer = {type:'integer', minimum:0};
const obj = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const constant = value => ({const:value});
export const identity = obj({scope:str,workspace:str,direction:constant('architect-to-luminary'),attemptId:str,exchangeId:str,ordinal:{type:'integer',minimum:0,maximum:2},registrationDigest:digest,snapshotDigest:digest,originalDigest:digest,effectiveDigest:digest});
export const anchor = obj({area:constant('p6-results'),seq:{type:'integer',minimum:1},hash:digest});
const result = obj({version:constant(1),kind:constant('p6_public_result'),resultId:str,...identity.properties,route:{enum:['ask','tasks']},submissionKeyDigest:digest,outcome:{enum:['returned','completed','shortfall']},httpStatus:{type:'integer',minimum:100,maximum:599},body:{},bodyDigest:digest,taskOperationId:{oneOf:[str,{type:'null'}]}});
export const receipt = obj({version:constant(1),issuer:constant('p6-inbound-coordinator'),subject:constant('validated-inbound-return'),...identity.properties,recipientRealm:str,resultId:str,bodyDigest:digest,resultAnchor:anchor});
export const record = obj({seq:{type:'integer',minimum:1},at:str,prevHash:{oneOf:[digest,{type:'null'}]},entry:result,hash:digest});
const version = {$schema:'https://json-schema.org/draft/2020-12/schema'};
export const resultSchema = {...version,...result};
export const manifestSchema = {...version,...obj({version:constant(1),runId:str,contract:constant('P6-A-v0.2@fb50bacc2ef0e8ecf66fb082aa4ea78f4cdffd52:section-5'),mode:constant('offline-synthetic'),identity,route:{enum:['ask','tasks']},submissionKeyDigest:digest,outcome:{enum:['returned','completed','shortfall']},retryScope:{enum:['per-response','per-attempt']},rewriteLimit:integer,roleLimits:obj(Object.fromEntries(roles.map(r=>[r,integer]))),expectedCounts:obj({dispatch:integer,release:integer,effect:integer})})};
const dispatch = obj({dispatchId:str,role:{enum:roles},phase:{enum:['initial','rewrite','service-retry']},conscienceResponseId:{oneOf:[str,{type:'null'}]}});
const payloads = {
 'admitted':identity,
 'dispatch':dispatch,
 'effect-intent':obj({operationId:digest}),
 'effect':obj({operationId:digest}),
 'result-durable':record,
 'closed':obj({outcome:{enum:['returned','completed','shortfall']},resultId:str,receiptRef:{oneOf:[str,{type:'null'}]},descriptor:{oneOf:[receipt,{type:'null'}]}}),
 'release':obj({resultId:str,bodyDigest:digest})
};
export const eventSchema = {...version,oneOf:Object.entries(payloads).map(([kind,payload])=>obj({version:constant(1),seq:{type:'integer',minimum:1},attemptId:str,kind:constant(kind),payload}))};
export const observationSchema = obj({coverageComplete:{type:'boolean'},dispatches:{type:'array',items:obj({attemptId:str,...dispatch.properties})},releases:{type:'array',items:obj({attemptId:str,resultId:str,bodyDigest:digest})},effects:{type:'array',items:obj({attemptId:str,operationId:digest})}});
// Deliberately small validator: only the keyword subset used by these checked-in schemas.
export function matches(schema,value) {
 if (schema.oneOf && schema.oneOf.filter(s=>matches(s,value)).length!==1) return false;
 if ('const' in schema && value!==schema.const) return false;
 if (schema.enum && !schema.enum.includes(value)) return false;
 if (schema.type) {
  const valid = schema.type==='null'?value===null:schema.type==='integer'?Number.isSafeInteger(value):schema.type==='array'?Array.isArray(value):schema.type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===schema.type;
  if (!valid) return false;
 }
 if (typeof value==='number' && ((schema.minimum!==undefined&&value<schema.minimum)||(schema.maximum!==undefined&&value>schema.maximum))) return false;
 if (typeof value==='string' && ((schema.minLength&&value.length<schema.minLength)||(schema.pattern&&!new RegExp(schema.pattern).test(value)))) return false;
 if (schema.type==='object') {
  if(schema.required.some(k=>!Object.hasOwn(value,k))) return false;
  if(schema.additionalProperties===false&&Object.keys(value).some(k=>!Object.hasOwn(schema.properties,k))) return false;
  if(Object.entries(schema.properties).some(([k,s])=>Object.hasOwn(value,k)&&!matches(s,value[k]))) return false;
 }
 if(schema.type==='array') {
  for(let i=0;i<value.length;i++) {
   if(!Object.hasOwn(value,i)||!matches(schema.items,value[i])) return false;
  }
 }
 return true;
}
export function publishedSchema(name) { return JSON.parse(readFileSync(new URL(`./${name}.schema.json`,import.meta.url),'utf8')); }
