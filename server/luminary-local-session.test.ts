import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLocalLuminarySession } from './luminary-local-session.js';
const origin='http://127.0.0.1:3012';
const middleware=createLocalLuminarySession(origin,'server-only-secret');
function invoke(overrides: any = {}) {
 const req:any={path:'/local-session',method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:3012',origin},...overrides};
 req.headers={...req.headers};req.get=(k:string)=>req.headers[k];let status=0;let cookie:any;let next=false;
 const res:any={setHeader(){},cookie(name:string,value:string,options:any){cookie={name,value,options};},sendStatus(code:number){status=code;}};
 middleware(req,res,()=>{next=true;});return {req,status,cookie,next};
}
test('local same-origin session issues opaque HttpOnly cookie without returning demo key',()=>{
 const r=invoke();assert.equal(r.status,204);assert.equal(r.cookie.options.httpOnly,true);assert.equal(r.cookie.options.sameSite,'strict');assert.notEqual(r.cookie.value,'server-only-secret');
});
test('cross-origin, remote, missing-origin and forged-host bootstrap fail',()=>{
 for(const overrides of [{headers:{host:'127.0.0.1:3012',origin:'https://evil.test'}},{socket:{remoteAddress:'10.1.2.3'}},{headers:{host:'127.0.0.1:3012'}},{headers:{host:'evil.test',origin}}])assert.equal(invoke(overrides).status,403);
});
test('valid cookie supplies server key only to local same-origin requests',()=>{
 const c=invoke().cookie;const headers={host:'127.0.0.1:3012',origin,cookie:`${c.name}=${c.value}`};
 assert.equal(invoke({path:'/ask',headers}).req.headers['x-luminary-demo-key'],'server-only-secret');
 assert.equal(invoke({path:'/ask',headers:{...headers,origin:'https://evil.test'}}).req.headers['x-luminary-demo-key'],undefined);
 assert.equal(invoke({path:'/ask',headers:{...headers,cookie:`${c.name}=invalid`}}).req.headers['x-luminary-demo-key'],undefined);
 assert.equal(invoke({path:'/ask',headers,socket:{remoteAddress:'10.1.2.3'}}).req.headers['x-luminary-demo-key'],undefined);
});
test('same-origin browser GET status can use cookie without Origin header',()=>{
 const c=invoke().cookie;const r=invoke({path:'/status',method:'GET',headers:{host:'127.0.0.1:3012','sec-fetch-site':'same-origin',cookie:`${c.name}=${c.value}`}});
 assert.equal(r.req.headers['x-luminary-demo-key'],'server-only-secret');
});
test('public origins and absent gateway keys cannot enable local sessions',()=>{
 assert.throws(()=>createLocalLuminarySession('https://example.com','key'));assert.throws(()=>createLocalLuminarySession(origin,''));
});
