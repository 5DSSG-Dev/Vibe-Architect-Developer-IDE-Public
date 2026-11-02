import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppendOnlyLog } from './log.js';

// The append-only review log (plan rev16 F4, acceptance 20 and 21). Real files in a temp folder.

async function freshDir() {
  return mkdtemp(join(tmpdir(), 'aegis-log-'));
}

test('entries chain, survive a reopen, and check clean', async () => {
  const dir = await freshDir();
  const log = await AppendOnlyLog.open<{ n: number }>(dir);
  const first = await log.append({ n: 1 });
  const second = await log.append({ n: 2 });
  assert.equal(second.prevHash, first.hash);
  const reopened = await AppendOnlyLog.open<{ n: number }>(dir);
  assert.deepEqual(reopened.problems, []);
  assert.deepEqual(reopened.latest, { seq: 2, hash: second.hash });
  assert.deepEqual(reopened.entries.map((line) => line.entry.n), [1, 2]);
  await rm(dir, { recursive: true });
});

test('a changed entry in the middle breaks the chain and is reported, never repaired', async () => {
  const dir = await freshDir();
  const log = await AppendOnlyLog.open<{ text: string }>(dir);
  for (const text of ['a', 'b', 'c']) await log.append({ text });
  const path = join(dir, 'segment-000001.jsonl');
  const original = await readFile(path, 'utf8');
  await writeFile(path, original.replace('"text":"b"', '"text":"B"'));
  const reopened = await AppendOnlyLog.open<{ text: string }>(dir);
  assert.ok(reopened.problems.some((p) => p.code === 'chain_broken'));
  assert.equal((await readFile(path, 'utf8')).includes('"text":"B"'), true, 'the file is left as found');
  await rm(dir, { recursive: true });
});

test('an entry removed from the middle breaks the chain', async () => {
  const dir = await freshDir();
  const log = await AppendOnlyLog.open<{ text: string }>(dir);
  for (const text of ['a', 'b', 'c']) await log.append({ text });
  const path = join(dir, 'segment-000001.jsonl');
  const lines = (await readFile(path, 'utf8')).split('\n');
  await writeFile(path, [lines[0], lines[2], ''].join('\n'));
  assert.ok((await AppendOnlyLog.open(dir)).problems.some((p) => p.code === 'chain_broken'));
  await rm(dir, { recursive: true });
});

test('a crash mid-write leaves a half-written line that is kept, reported, and written around', async () => {
  const dir = await freshDir();
  const log = await AppendOnlyLog.open<{ text: string }>(dir);
  await log.append({ text: 'a' });
  await appendFile(join(dir, 'segment-000001.jsonl'), '{"seq":2,"at":"2026');
  const reopened = await AppendOnlyLog.open<{ text: string }>(dir);
  assert.ok(reopened.problems.some((p) => p.code === 'incomplete_entry'));
  const next = await reopened.append({ text: 'after crash' });
  assert.equal(next.seq, 2);
  assert.ok((await readFile(join(dir, 'segment-000001.jsonl'), 'utf8')).endsWith('{"seq":2,"at":"2026'), 'the partial line is kept as it is');
  assert.deepEqual((await readdir(dir)).sort(), ['index.jsonl', 'segment-000001.jsonl', 'segment-000002.jsonl']);
  const again = await AppendOnlyLog.open<{ text: string }>(dir);
  assert.ok(!again.problems.some((p) => p.code === 'chain_broken'));
  await rm(dir, { recursive: true });
});

test('a full segment starts a new one chained to the last entry; a segment missing from disk is reported', async () => {
  const dir = await freshDir();
  const log = await AppendOnlyLog.open<{ text: string }>(dir, { maxSegmentBytes: 200 });
  for (const text of ['one', 'two', 'three', 'four']) await log.append({ text });
  const segments = (await readdir(dir)).filter((name) => name.startsWith('segment-'));
  assert.ok(segments.length > 1);
  assert.deepEqual((await AppendOnlyLog.open(dir, { maxSegmentBytes: 200 })).problems, []);
  await rm(join(dir, segments[0]));
  assert.ok((await AppendOnlyLog.open(dir)).problems.some((p) => p.code === 'index_mismatch'));
  await rm(dir, { recursive: true });
});

test('the log and its index replaced together still differ from the anchor hash', async () => {
  const dir = await freshDir();
  const log = await AppendOnlyLog.open<{ text: string }>(dir);
  const real = await log.append({ text: 'real' });
  const other = await freshDir();
  const fake = await AppendOnlyLog.open<{ text: string }>(other);
  await fake.append({ text: 'forged' });
  for (const name of ['index.jsonl', 'segment-000001.jsonl']) await writeFile(join(dir, name), await readFile(join(other, name)));
  const reopened = await AppendOnlyLog.open<{ text: string }>(dir);
  assert.deepEqual(reopened.problems, [], 'a consistent replacement passes its own chain check');
  assert.notEqual(reopened.hashAt(1), real.hash, 'only the second anchor can catch it');
  await rm(dir, { recursive: true });
  await rm(other, { recursive: true });
});

test('backup copies every file, and never shrinks a backup copy', async () => {
  const dir = await freshDir();
  const backup = await freshDir();
  const log = await AppendOnlyLog.open<{ text: string }>(dir);
  await log.append({ text: 'a' });
  await log.append({ text: 'b' });
  await log.backup(backup);
  const copied = await readFile(join(backup, 'segment-000001.jsonl'), 'utf8');
  assert.equal(copied, await readFile(join(dir, 'segment-000001.jsonl'), 'utf8'));
  await writeFile(join(dir, 'segment-000001.jsonl'), copied.split('\n')[0] + '\n');
  await log.backup(backup);
  assert.equal(await readFile(join(backup, 'segment-000001.jsonl'), 'utf8'), copied);
  await rm(dir, { recursive: true });
  await rm(backup, { recursive: true });
});
