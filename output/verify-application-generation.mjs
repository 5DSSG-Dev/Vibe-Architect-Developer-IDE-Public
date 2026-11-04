import { generateApplication } from '../src/engine/applicationGenerator.ts';
import { mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'vite';
const project = await mkdtemp(path.resolve('output/generated-app-'));
const objects = [
 { id:'notes', kind:'Data', initialRecords:[] },
 { id:'heading', kind:'Component', text:'Write a note and save it.' },
 { id:'editor', kind:'Form', modelId:'notes', fields:[{name:'text',label:'Note',required:true}] },
 { id:'home', kind:'Page', path:'/', title:'Generated Notes', children:['heading','editor','notes'] },
 { id:'about', kind:'Page', path:'/about', title:'About this app', children:['heading'] },
 { id:'nav', kind:'Navigation', pageIds:['home','about'] },
 { id:'notes-api', kind:'API', path:'/api/notes' }
];
const { files } = generateApplication({version:1,name:'Vibe Generated Notes',objects});
for (const [relative, content] of Object.entries(files)) {
 const target = path.join(project,relative);
 await mkdir(path.dirname(target),{recursive:true});
 await writeFile(target,content);
}
console.log('PROJECT',project);
const run = async args => {
 const child = spawn(process.execPath,args,{cwd:project,stdio:'inherit'});
 const [code] = await once(child,'exit');
 if (code !== 0) throw new Error('Command failed: '+args.join(' ')+' exit '+code);
};
await run(['--test','test/application.test.mjs']);
await run([path.resolve('node_modules/vite/bin/vite.js'),'build']);
const server = await createServer({root:project,configFile:path.join(project,'vite.config.js'),server:{host:'127.0.0.1',port:0,preTransformRequests:false}});
const keepAlive = setInterval(() => {}, 1000);
try {
 await server.listen();
 const address = server.httpServer.address();
 const url = 'http://127.0.0.1:'+address.port;
 const response = await fetch(url);
 const html = await response.text();
 if (response.status!==200 || !html.includes('Vibe Generated Notes')) throw new Error('Application HTML not served');
 for (const file of ['/src/main.jsx','/src/pages/home.jsx','/src/components/editor.jsx','/src/models/notes.js']) {
   const response = await fetch(url+file);
   if (response.status!==200) throw new Error(file+' HTTP '+response.status);
   console.log('HTTP',response.status,file);
 }
 console.log('RUNTIME_VERIFIED',url);
} finally { await server.waitForRequestsIdle(); await server.close(); clearInterval(keepAlive); }
console.log('Uses ancestor installed dependencies; clean npm install and interactive browser behavior not verified.');
