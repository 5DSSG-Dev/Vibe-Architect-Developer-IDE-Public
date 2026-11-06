import test from 'node:test';
import assert from 'node:assert/strict';
import {productionEvidenceId,productionReceiptKey,terminalGenerationFailure,canReplaceProduction,productionStatus,clearLegacyPreviewResume,hasNewTerminalRequest} from './productionClientState';
import {appendLuminaryExchangeEvidence,readEvidenceArchive} from './evidenceArchive';

test('new apps do not inherit an earlier preview recovery link or terminal open event',()=>{
 const cleaned=new URL(clearLegacyPreviewResume('http://127.0.0.1:3012/?previewRequest=old-note-keep&previewBaseline=1&project=NoteVault#workspace'));
 assert.equal(cleaned.searchParams.has('previewRequest'),false);
 assert.equal(cleaned.searchParams.has('previewBaseline'),false);
 assert.equal(cleaned.searchParams.get('project'),'NoteVault');
 assert.equal(cleaned.hash,'#workspace');
 assert.equal(hasNewTerminalRequest(3,3),false,'mounting another CORE must not replay the earlier Terminal click');
 assert.equal(hasNewTerminalRequest(3,4),true,'a new explicit Terminal click must still open the panel');
 assert.equal(hasNewTerminalRequest(3,0),false);
});

test('production status reports audit holds and pending requests instead of resetting to ready',()=>{
 assert.equal(productionStatus(false,undefined,'Secondary assembly audit did not approve this exact bundle',''), 'Generation blocked by independent audit');
 assert.equal(productionStatus(true,undefined,'','id'), 'Generating and independently auditing the application…');
 assert.equal(productionStatus(false,undefined,'','id'), 'Request outcome unknown — recover last request');
 assert.equal(productionStatus(false,undefined,'Something failed',''), 'Generation failed — see details below');
 assert.equal(productionStatus(false,'running','',''), 'Application running');
 assert.equal(productionStatus(false,undefined,'',''), 'Architecture ready for generation');
});

test('restored materialization appends evidence without conflicting with the original generation',async()=>{
 const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 const original={exchangeId:productionEvidenceId({id:'same-generation',requestId:'initial'}),event:'task_proposed' as const,conversationId:'core',detail:{sourceDigest:'same-source',originalAnchor:'anchor'}};
 const restored={...original,exchangeId:productionEvidenceId({id:'same-generation',requestId:'restored'}),detail:{sourceDigest:'same-source'}};
 await appendLuminaryExchangeEvidence(original,storage);await appendLuminaryExchangeEvidence(restored,storage);
 assert.equal((await appendLuminaryExchangeEvidence(restored,storage)).appended,false);
 const records=await readEvidenceArchive(storage);
 assert.equal(records.length,2);assert.deepEqual(records[0].payload,original);assert.deepEqual(records[1].payload,restored);
});
test('review approval never transfers to a different receipt, source or context',()=>{
 const first={id:'a',digest:'source-a',contextHash:'context-a'};
 for(const other of [{...first,id:'b'},{...first,digest:'source-b'},{...first,contextHash:'context-b'}])assert.notEqual(productionReceiptKey(first),productionReceiptKey(other));
});
test('recoverable authentication/throttle/transport errors preserve the saved operation',()=>{
 for(const status of [401,403,404,429,500,503])assert.equal(terminalGenerationFailure(status,'production_shortfall'),false);
 assert.equal(terminalGenerationFailure(409,'production_shortfall'),true);
 assert.equal(terminalGenerationFailure(409,'other_error'),false);
});
test('a lost launch response cannot replace a building, running or uncertain application',()=>{
 assert.equal(canReplaceProduction('building',false),false);
 assert.equal(canReplaceProduction('running',false),false);
 assert.equal(canReplaceProduction('generated',true),false);
 for(const state of ['generated','stopped','failed',undefined])assert.equal(canReplaceProduction(state,false),true);
});


test('canceling the wait does not label an unknown or running operation as failed',()=>{
 assert.equal(productionStatus(false,'building','Canceled waiting.','',true),'Operation outcome unknown — refresh status');
 assert.equal(productionStatus(false,undefined,'Canceled waiting.','pending'),'Request outcome unknown — recover last request');
 assert.equal(productionStatus(false,undefined,'Canceled waiting.',''),'Waiting canceled — check request status');
});


test('a generated app gives the next action instead of implying it already launched',()=>{
 assert.equal(productionStatus(false,'generated','',''),'App generated — review it below, then launch');
});
