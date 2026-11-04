import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateBaseBuild } from './luminary-base-build.js';
import { checkFencePath, LuminaryExecutor, validateManifestAppend } from './luminary-executor.js';

test('25 scoped files are generated in governed pages in one invocation, preserving full spec and previous files', async () => {
  const paths = Array.from({ length: 25 }, (_, i) => `src/feature${i}.ts`);
  const prompts: string[] = [];
  const built = await generateBaseBuild('COMPLETE SPEC: requirements A through Z', paths, async prompt => {
    const offset = prompts.length * 8;
    prompts.push(prompt);
    return { ok: true, reply: { modelId: 'test', content: '```luminary-change\n' + JSON.stringify({ summary: 'page', files: paths.slice(offset, offset + 8).map(path => ({ path, content: `export const value = ${offset};` })) }) + '\n```' } };
  });
  assert.equal(prompts.length, 4);
  assert.deepEqual(built.change.files.map(file => file.path), paths);
  assert.ok(prompts.every(prompt => prompt.includes('requirements A through Z')));
  assert.ok(prompts[3].includes('src/feature0.ts'));
  assert.deepEqual(LuminaryExecutor.fenceTask(paths, true), paths);
  assert.throws(() => LuminaryExecutor.fenceTask(paths));
});

test('missing files and a later governance hold cannot produce a partial build', async () => {
  await assert.rejects(generateBaseBuild('spec', ['a.ts'], async () => ({ ok: true, reply: { modelId: 'test', content: '```luminary-change\n{"summary":"bad","files":[{"path":"b.ts","content":""}]}\n```' } })), /every requested file/);
  let calls = 0;
  const paths = Array.from({ length: 9 }, (_, i) => `${i}.ts`);
  await assert.rejects(generateBaseBuild('spec', paths, async () => {
    if (calls++) return { ok: false, shortfall: { code: 'returned_to_sender', message: 'held', modelId: 'test' } };
    return { ok: true, reply: { modelId: 'test', content: '```luminary-change\n' + JSON.stringify({ summary: 'page', files: paths.slice(0, 8).map(path => ({ path, content: '' })) }) + '\n```' } };
  }), /governance stopped page 2/);
});

test('base-build manifest permission remains scoped and append-only', () => {
  assert.equal(checkFencePath('package.json', true).ok, true);
  for (const path of ['.git/package.json', 'node_modules/package.json', '../package.json', '.env', 'package-lock.json']) assert.equal(checkFencePath(path, true).ok, false, path);
  const original = JSON.stringify({ name: 'app', scripts: { build: 'tsc' }, dependencies: { react: '^18.3.1' } });
  validateManifestAppend(original, JSON.stringify({ name: 'app', scripts: { build: 'tsc' }, dependencies: { react: '^18.3.1', zod: '^3.23.0' } }));
  for (const next of [{ name: 'changed' }, { name: 'app', scripts: { build: 'malicious' } }, { name: 'app', scripts: { build: 'tsc' }, dependencies: { react: '^19.0.0' } }, { name: 'app', scripts: { build: 'tsc' }, dependencies: { react: '^18.3.1', bad: 'file:../secret' } }]) assert.throws(() => validateManifestAppend(original, JSON.stringify(next)));
});

import express from 'express';
import { createLuminaryTaskRouter, readTaskContext } from './luminary-task-router.js';
import { createGovernedAsk } from './luminary-reply-router.js';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';

test('HTTP base build carries 40KB spec, pages 25 files plus manifest, writes one isolated proposal', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'base-build-http-'));
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@local', ...args], {cwd:dir,encoding:'utf8'});
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'package.json'), '{"name":"fixture","dependencies":{}}');
  writeFileSync(join(dir, '.gitignore'), '/.luminary/\n');
  git('add', '.'); git('commit', '-qm', 'fixture');
  const paths = [...Array.from({length:25}, (_, i) => `src/${i}.ts`), 'package.json'];
  let calls = 0, examined = 0;
  const ask = createGovernedAsk(async prompt => {
    const selected = JSON.parse(prompt.match(/exactly these files: (\[[^\n]+\])/)! [1]) as string[];
    assert.ok(prompt.includes('FULL_SPEC_END'));
    calls++;
    return {modelId:'fixture-model',content:'```luminary-change\n'+JSON.stringify({summary:'page',files:selected.map(path => ({path,content:path==='package.json' ? '{"name":"fixture","dependencies":{"zod":"3.23.0"}}' : `export const feature = ${calls};`}))})+'\n```'};
  }, { governance: { maxContentBytes: 262_144 }, pipeline: { gauge: { read: async () => {
    examined++;
    return {Honesty:90,Respect:90,Attention:90,Affection:90,Loyalty:90,Trust:90,Communication:90};
  } } } });
  const app = express(); app.use(express.json({limit:'1mb'}));
  app.use('/tasks',createLuminaryTaskRouter(new LuminaryExecutor({repoRoot:dir,checks:[{name:'fixture check',command:process.execPath,args:['-e','process.exit(0)']}]}),ask));
  const server = app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/tasks`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({baseBuild:true,goal:'Implement the entire app',allowedFiles:paths,context:[{label:'spec',text:'x'.repeat(40_000)+'FULL_SPEC_END'}]})});
    const result = await response.json();
    assert.equal(response.status,201,JSON.stringify(result));
    assert.equal(calls,4); assert.ok(examined>=4);
    assert.equal(result.task.files.length,26); assert.equal(result.task.checks[0].ok,true);
    assert.equal(existsSync(join(dir,'src/0.ts')),false);
    assert.match(readFileSync(join(dir,'.luminary','worktrees',result.task.id,'package.json'),'utf8'),/zod/);
    assert.equal(readFileSync(join(dir,'package.json'),'utf8'),'{"name":"fixture","dependencies":{}}');
    assert.ok(readTaskContext([{label:'spec',text:'x'.repeat(40_000)}],true));
    assert.equal(readTaskContext([{label:'spec',text:'x'.repeat(40_000)}]),null);
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    rmSync(dir,{recursive:true,force:true});
  }
});
