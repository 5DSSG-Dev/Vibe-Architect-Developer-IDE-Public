import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadPrivateGovernanceManifest, guardRuntimeSources } from './private-governance-loader.js';
import { createBidirectionalAsk, type GovernanceRuntime } from '../luminary-bidirectional.js';
import { examine } from './marker-route.js';

test('private manifest loader rejects unpinned, modified or public-workspace source files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'luminary-loader-'));
  const path = join(dir, 'manifest.json');
  const content = JSON.stringify({ version: 1 });
  writeFileSync(path, content);
  const hash = createHash('sha256').update(content).digest('hex');
  assert.throws(() => loadPrivateGovernanceManifest(path, '', process.cwd()));
  assert.throws(() => loadPrivateGovernanceManifest(path, '0'.repeat(64), process.cwd()));
  assert.throws(() => loadPrivateGovernanceManifest(path, hash, dir));
});

for (const revokeAt of ['inbound', 'writer', 'outbound']) {
  test(`source revocation during ${revokeAt} blocks the next dispatch/release`, async () => {
    let valid = true; let writerCalls = 0;
    const runtime: GovernanceRuntime = { createSession: () => ({
      invokeWriter: async (writer, prompt) => { const result = await writer(prompt); if (revokeAt === 'writer') valid = false; return result; },
      evaluate: async (candidate, direction) => {
        const result = await examine(candidate, { pim: () => ({ result: 1 }), irg: () => ({ result: 1 }), ptag: () => ({ result: 1 }) });
        if (revokeAt === direction) valid = false;
        return result;
      },
    }) };
    const guarded = guardRuntimeSources(runtime, () => { if (!valid) throw new Error('source revoked'); });
    const result = await createBidirectionalAsk(async () => { writerCalls++; return { modelId: 'm', content: 'reply' }; }, guarded)('hello');
    assert(!result.ok);
    assert.equal(writerCalls, revokeAt === 'inbound' ? 0 : 1);
    assert(!JSON.stringify(result).includes('reply'));
  });
}
