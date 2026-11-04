import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextAppSuggestions } from './appSuggestions';
test('new responses offer at most three unique unconsumed choices',()=>{
 assert.deepEqual(nextAppSuggestions([],['Search',' search ','Export','Backups','Theme'],undefined,['Export']),['Search','Backups','Theme']);
});
test('selected slot refreshes while unselected choices remain in place',()=>{
 assert.deepEqual(nextAppSuggestions(['Search','Export','Backups'],['Search','Theme','Export','Sharing'],'Search',[]),['Theme','Export','Backups']);
 assert.deepEqual(nextAppSuggestions(['Search','Export','Backups'],['Theme','Sharing'],'Export',[]),['Search','Theme','Backups']);
});
test('fewer model ideas leave fewer choices instead of fabricated additions',()=>{
 assert.deepEqual(nextAppSuggestions(['Search','Export','Backups'],['Search'],'Search',[]),['Export','Backups']);
});
