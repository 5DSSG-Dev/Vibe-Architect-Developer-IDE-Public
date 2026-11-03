import test from 'node:test';
import assert from 'node:assert/strict';
import {productionReceiptKey,terminalGenerationFailure,canReplaceProduction} from './productionClientState';
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
