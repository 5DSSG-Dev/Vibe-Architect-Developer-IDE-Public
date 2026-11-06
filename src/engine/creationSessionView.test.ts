import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppCreationConversation} from '../components/AppCreationConversation';
import {emptyCreationSession,saveCreationSession,creationSessionKey} from './creationSession';
test('restored interrupted interview renders visible stopped status and Cancel/Restart controls',()=>{
 const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
 Object.defineProperty(globalThis,'sessionStorage',{value:storage,configurable:true});
 try{
  const session=emptyCreationSession();session.turns=[{role:'architect',text:'Keep my idea',state:'pending'}];saveCreationSession(storage,creationSessionKey('test-core'),session);
  const html=renderToStaticMarkup(React.createElement(AppCreationConversation,{coreId:'test-core',catalog:[],onAccept:async()=>{throw Error('Must not accept automatically');}}));
  assert.match(html,/Interview stopped/);assert.match(html,/no request was repeated/);assert.match(html,/>Cancel<\/button>/);assert.match(html,/>Restart<\/button>/);assert.match(html,/Keep my idea/);
  assert.ok(html.indexOf('role="alert"')<html.indexOf('<form'));
 }finally{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else Reflect.deleteProperty(globalThis,'sessionStorage');}
});


test('blocked browser storage does not crash the interview',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');Object.defineProperty(globalThis,'sessionStorage',{get:()=>{throw Error('Storage blocked');},configurable:true});
 try{assert.doesNotThrow(()=>renderToStaticMarkup(React.createElement(AppCreationConversation,{coreId:'blocked',catalog:[],onAccept:async()=>{}})));}finally{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else Reflect.deleteProperty(globalThis,'sessionStorage');}
});
