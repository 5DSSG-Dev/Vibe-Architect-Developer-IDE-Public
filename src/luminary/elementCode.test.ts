import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_APOTHECARY_CATALOG, ensureElementCodeFrame } from '../engine/relationEngine';
import { readPromptFrame } from './blocks';
import { ELEMENT_CODE_MARKER, composeElementCodePrompt, lineDiff, readElementCodeProposal } from './elementCode';

const item = ensureElementCodeFrame(DEFAULT_APOTHECARY_CATALOG.find((entry) => entry.id === 'sat-rate-limiter')!);

test('the prompt carries the Element, its code frame and the request, and nothing else', () => {
  const prompt = composeElementCodePrompt({ item, catalog: DEFAULT_APOTHECARY_CATALOG, frame: item.codeFrame, source: 'export const x = 1;', request: 'Allow 10 requests a second.', level: 'plain', mode: 'DESIGN' });
  assert.match(prompt, /\[Context: This Element\]\n- \*\*Rate Limiter\*\* \(Satellites; sat-rate-limiter/);
  assert.match(prompt, /\[Context: Element code frame\]\nLanguage: TypeScript\nFile: .+\nEntrypoint: .+\nCurrent source:\n```typescript\nexport const x = 1;\n```/);
  const frame = readPromptFrame(prompt);
  assert.equal(frame.level, 'plain');
  assert.equal(frame.allowedFiles, null, 'not a coding task');
  assert.ok(frame.message.startsWith('Allow 10 requests a second.'));
  assert.ok(frame.message.includes(ELEMENT_CODE_MARKER));
});

test('exactly one code block becomes the proposal, with the words around it as the explanation', () => {
  assert.deepEqual(readElementCodeProposal('It now counts requests.\n\n```typescript\nexport const limit = 10;\n```\n\nAccept to use it.'), {
    ok: true, code: 'export const limit = 10;', explanation: 'It now counts requests.\n\nAccept to use it.',
  });
});

test('no code, two blocks or an empty block give a plain reason, never a guess', () => {
  assert.equal(readElementCodeProposal('I would rather explain first.').ok, false);
  const two = readElementCodeProposal('```ts\na\n```\n```ts\nb\n```');
  assert.equal(two.ok, false);
  assert.match((two as { reason: string }).reason, /2 code blocks/);
  assert.equal(readElementCodeProposal('```ts\n\n```').ok, false);
});

test('the diff marks removed and added lines and keeps the rest', () => {
  assert.deepEqual(lineDiff('a\nb\nc', 'a\nB\nc\nd'), [
    { kind: 'same', text: 'a' },
    { kind: 'removed', text: 'b' },
    { kind: 'added', text: 'B' },
    { kind: 'same', text: 'c' },
    { kind: 'added', text: 'd' },
  ]);
});

function reconstruct(before: string, after: string) {
  const diff = lineDiff(before, after);
  assert.equal(diff.filter((line) => line.kind !== 'added').map((line) => line.text).join('\n'), before);
  assert.equal(diff.filter((line) => line.kind !== 'removed').map((line) => line.text).join('\n'), after);
  return diff;
}

test('diff preserves empty lines, trailing newlines, CRLF and Unicode exactly', () => {
  for (const [before, after] of [
    ['', ''], ['', '\n'], ['\n', ''], ['a\n\n', 'a\n'],
    ['a\r\n\r\n終🙂\r\n', 'a\n\n終🙃\r\n'],
    ['e\u0301\n\t\n', 'é\n\t\n\n'], ['\r', '\r\n'],
  ]) reconstruct(before, after);
});

test('small repeated-line diffs retain the original remove-first LCS tie behavior', () => {
  // Independent old implementation retained only as a small-input test oracle.
  const reference = (before: string, after: string) => {
    const a = before.split('\n'), b = after.split('\n');
    const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    const out: ReturnType<typeof lineDiff> = [];
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { out.push({ kind: 'same', text: a[i++] }); j++; }
      else if (table[i + 1][j] >= table[i][j + 1]) out.push({ kind: 'removed', text: a[i++] });
      else out.push({ kind: 'added', text: b[j++] });
    }
    while (i < a.length) out.push({ kind: 'removed', text: a[i++] });
    while (j < b.length) out.push({ kind: 'added', text: b[j++] });
    return out;
  };
  const inputs = [''];
  let level = [''];
  for (let length = 1; length <= 3; length++) {
    level = level.flatMap((prefix) => ['a', 'b', ''].map((token) => length === 1 ? token : `${prefix}\n${token}`));
    inputs.push(...level);
  }
  for (const before of inputs) for (const after of inputs)
    assert.deepEqual(reconstruct(before, after), reference(before, after));
});

test('the cell-budget boundary uses exact LCS at the cap and deterministic fallback above it', () => {
  const a = Array.from({ length: 1023 }, (_, i) => `line-${i}`);
  const b = [...a]; b[511] = 'replacement';
  assert.equal(reconstruct(a.join('\n'), b.join('\n')).filter((line) => line.kind === 'same').length, 1022);
  a.push('last'); b.push('last');
  const diff = reconstruct(a.join('\n'), b.join('\n'));
  assert.equal(diff.length, 2048);
  assert.ok(diff.slice(0, 1024).every((line) => line.kind === 'removed'));
  assert.ok(diff.slice(1024).every((line) => line.kind === 'added'));
});

test('10,000–20,000-line different, repeated, identical and unbalanced inputs reconstruct', () => {
  for (const count of [10_000, 20_000]) {
    const before = Array.from({ length: count }, (_, i) => `old-${i}🙂\r`).join('\n') + '\n';
    const after = Array.from({ length: count }, (_, i) => `new-${i}終\r`).join('\n') + '\n';
    const diff = reconstruct(before, after);
    assert.equal(diff.length, 2 * (count + 1));
    reconstruct('repeat\n'.repeat(count), 'repeat\n'.repeat(count - 1) + 'changed\n');
    assert.ok(reconstruct(before, before).every((line) => line.kind === 'same'));
    reconstruct('one line', after);
  }
});

test('20,000-line comparisons complete in an isolated child with a 64 MiB old-space cap', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const code = `
    import assert from 'node:assert/strict';
    import { getHeapStatistics } from 'node:v8';
    import { lineDiff } from './src/luminary/elementCode.ts';
    const start = performance.now();
    const a = Array.from({length:20000}, (_,i) => 'old-'+i+'🙂\\r').join('\\n')+'\\n';
    const b = Array.from({length:20000}, (_,i) => 'new-'+i+'終\\r').join('\\n')+'\\n';
    const diff = lineDiff(a,b);
    assert.equal(diff.filter(x=>x.kind!=='added').map(x=>x.text).join('\\n'),a);
    assert.equal(diff.filter(x=>x.kind!=='removed').map(x=>x.text).join('\\n'),b);
    console.log(JSON.stringify({node:process.version,oldSpaceMiB:64,semiSpaceMiB:4,heapLimitBytes:getHeapStatistics().heap_size_limit,heapUsedBytes:process.memoryUsage().heapUsed,maxRSSKiB:process.resourceUsage().maxRSS,elapsedMs:performance.now()-start,outputLines:diff.length}));
  `;
  const child = spawnSync(process.execPath, ['--max-old-space-size=64', '--max-semi-space-size=4', '--import', 'tsx', '--input-type=module', '--eval', code], {
    cwd: process.cwd(), env: { ...process.env, NODE_OPTIONS: '' }, timeout: 20_000, encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.signal, null);
  const measured = JSON.parse(child.stdout.trim());
  assert.equal(measured.outputLines, 40_002);
  assert.ok(measured.heapLimitBytes <= 80 * 1024 * 1024, child.stdout);
  t.diagnostic(`Isolated resource measurement: ${child.stdout.trim()}`);
});
