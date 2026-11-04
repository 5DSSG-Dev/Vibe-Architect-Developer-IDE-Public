import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'vite';
import type { ProductionContext } from '../src/engine/applicationProduction.js';

function command(args: string[], cwd: string, timeout: number): Promise<string> {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,USERPROFILE:process.env.USERPROFILE,TEMP:process.env.TEMP,TMP:process.env.TMP,NODE_ENV:'development',npm_config_ignore_scripts:'true'}});
    let output='';const timer=setTimeout(()=>{child.kill();reject(Error('Isolated dependency/test operation timed out.'));},timeout);
    const collect=(chunk:Buffer)=>{output=(output+chunk.toString()).slice(-40000);};child.stdout.on('data',collect);child.stderr.on('data',collect);
    child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);if(code===0)resolve(output);else reject(Error('Isolated operation failed ('+code+'): '+output));});
  });
}
export async function resolveAndVerifyAssembly(projectPath: string, context: ProductionContext) {
  const npm=join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  const install=await command([npm,'install','--ignore-scripts','--no-audit','--no-fund'],projectPath,180000);
  const packageLock=await readFile(join(projectPath,'package-lock.json'),'utf8');
  const lock=JSON.parse(packageLock);
  const resolved: Record<string,{version:string;integrity:string;path:string}>={};
  const require=createRequire(join(projectPath,'package.json'));
  for(const [name,version] of Object.entries(context.dependencies??{})) {
    const entry=lock.packages?.['node_modules/'+name];
    const path=require.resolve(name);
    if(entry?.version!==version || typeof entry.integrity!=='string' || !path.replace(/\\/g,'/').startsWith(projectPath.replace(/\\/g,'/')+'/node_modules/'))throw Error('Dependency did not resolve inside its isolated project: '+name);
    resolved[name]={version,integrity:entry.integrity,path};
  }
  const tests=await command(['test/application.test.mjs'],projectPath,30000);
  await build({root:projectPath,base:'./',configFile:false,envFile:false,publicDir:false,logLevel:'silent',css:{postcss:{plugins:[]}},build:{outDir:'dist',emptyOutDir:true}});
  return {packageLock,dependencies:resolved,install,tests,build:'passed' as const};
}
