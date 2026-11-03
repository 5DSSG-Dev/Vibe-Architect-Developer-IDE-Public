import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPrivateDecisionLog, verifyDecisionLog } from './private-decision-log.js';

test('private decision records append with verifiable order; replay invokes no provider', () => {
  const dir = mkdtempSync(join(tmpdir(), 'governance-log-'));
  const path = join(dir, 'decisions.jsonl');
  const append = createPrivateDecisionLog(path, process.cwd());
  append({ requestId: 'request:1', stage: 'inbound', outcome: 'admitted' });
  const first = readFileSync(path, 'utf8');
  append({ requestId: 'request:1', stage: 'outbound', outcome: 'admitted' });
  const full = readFileSync(path, 'utf8');
  assert(full.startsWith(first));
  assert.equal(verifyDecisionLog(full).length, 2);
  assert.throws(() => verifyDecisionLog(full.replace('outbound', 'tampered')));
});

test('audit uncertainty, capacity and public-location failures prevent the next append', () => {
  const dir = mkdtempSync(join(tmpdir(), 'governance-log-'));
  const path = join(dir, 'decisions.jsonl');
  const append = createPrivateDecisionLog(path, process.cwd(), 1024);
  writeFileSync(`${path}.lock`, 'other writer');
  assert.throws(() => append({ result: 'admitted' }));
  assert.throws(() => createPrivateDecisionLog(path, dir));
  const limited = createPrivateDecisionLog(join(dir, 'limited.jsonl'), process.cwd(), 1024);
  assert.throws(() => limited({ data: 'x'.repeat(1024) }));
});
