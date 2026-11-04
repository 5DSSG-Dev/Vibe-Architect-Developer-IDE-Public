/** Live Q4 receipt verification and independent-model positive/negative control.
 * npx tsx scripts/audit-assembly.ts [--negative-control] [--receipt path] [--out path]
 * Uses an actual captured UI production context/receipt; never substitutes a production POST.
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { validateProductionContext, productionFiles, type ProductionAnswer } from '../src/engine/applicationProduction.js';
import { resolveAndVerifyAssembly } from '../server/assembly-dependencies.js';
import { artifactHash, assemblyHash, validateRequirementAst, validateAssemblyAudit, createLocalAssemblyAuditor, AssemblyAuditRejected, type AssemblyAuditInput } from '../server/assembly-gates.js';

const args=process.argv.slice(2);
const value=(flag:string,fallback:string)=>args.includes(flag)?args[args.indexOf(flag)+1]??fallback:fallback;
const negative=args.includes('--negative-control');
const root=resolve('.luminary/q4-live-20261104');
const inputPath=resolve(value('--receipt',join(root,'accepted-baseline.json')));
const outputPath=resolve(value('--out',join(root,negative?'negative-audit.json':'positive-audit.json')));
let capturedText:string;
try{capturedText=await readFile(inputPath,'utf8');}catch(error){
 if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
 const result={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'UNVERIFIED',reason:'No gated production receipt exists at the supplied path. Generation must pass before an assembly audit can be credited.',inputPath};
 await mkdir(dirname(outputPath),{recursive:true});await writeFile(outputPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,outputPath}));process.exit(2);
}
const captured=JSON.parse(capturedText);
const context=validateProductionContext(captured.context);
const receipt=captured.receipt;
assert.ok(receipt?.gates,'An actual gated production receipt is required.');
assert.equal(receipt.contextHash,assemblyHash(context),'Context digest mismatch.');
assert.equal(receipt.digest,artifactHash(receipt.files),'Artifact digest mismatch.');
assert.deepEqual(productionFiles(receipt.answer),receipt.files,'Source does not reproduce from the received answer.');
let input:AssemblyAuditInput={context,answer:receipt.answer,files:receipt.files,writerModelId:receipt.modelId,ast:validateRequirementAst(context,receipt.answer,receipt.files),verification:receipt.gates.verification};
assert.deepEqual(receipt.gates.ast,input.ast,'Receipt AST evidence does not match the actual assembled files.');
validateAssemblyAudit(receipt.gates.audit,input);

if(negative){
 const answer=structuredClone(receipt.answer) as ProductionAnswer;
 let removed=0;
 answer.definition.objects=answer.definition.objects.map(object=>{
  if(object.kind==='Form'){removed++;return {id:object.id,kind:'Component' as const,text:''};}
  if(object.kind==='Component')return {...object,text:''};
  return object;
 });
 assert.ok(removed>0,'Negative control requires an actual baseline Form to remove.');
 const files=productionFiles(answer),ast=validateRequirementAst(context,answer,files);
 await mkdir(root,{recursive:true});
 const project=await mkdtemp(join(root,'negative-'));
 for(const [path,source] of Object.entries(files)){await mkdir(dirname(join(project,path)),{recursive:true});await writeFile(join(project,path),source,{flag:'wx'});}
 const verification=await resolveAndVerifyAssembly(project,context);
 answer.packageLock=verification.packageLock;files['package-lock.json']=verification.packageLock;
 input={context,answer,files,ast,writerModelId:receipt.modelId,verification};
}

const auditor=createLocalAssemblyAuditor(process.env.LUMINARY_GAUGE_ENDPOINT?.trim()||'http://127.0.0.1:11434/v1',process.env.LUMINARY_ASSEMBLY_MODEL?.trim()||process.env.LUMINARY_GAUGE_MODEL?.trim()||'');
let audit,transportError;
try{audit=await auditor(input);}catch(error){if(error instanceof AssemblyAuditRejected)audit=error.audit;else transportError=error instanceof Error?error.message:String(error);}
const record={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),mode:negative?'negative-control':'positive-control',sourceReceiptDigest:receipt.digest,artifactHash:artifactHash(input.files),requirementsHash:assemblyHash(context.requirements),requirementIds:context.requirements!.map(r=>r.id),ast:input.ast,audit,transportError,qualification:negative?'Real-model evaluation of deliberately removed forms and empty component content; isolated diagnostic, never offered as a generated app.':'Real-model re-audit of exact captured UI baseline; existing receipt was also checked.'};
await mkdir(dirname(outputPath),{recursive:true});await writeFile(outputPath,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({head:record.head,mode:record.mode,artifactHash:record.artifactHash,decision:audit?.decision,findings:audit?.findings,transportError,outputPath}));
assert.ok(!transportError,'Auditor transport failed; control is UNVERIFIED.');
if(negative){
 assert.equal(audit?.decision,'hold','Known-incomplete application was falsely approved.');
 assert.equal(audit?.artifactHash,record.artifactHash,'Hold did not identify this control artifact.');
 assert.equal(audit?.requirementsHash,record.requirementsHash,'Hold did not identify these requirements.');
 assert.ok(audit?.findings.length,'A negative control hold must include inspectable findings.');
}else validateAssemblyAudit(audit!,input);
