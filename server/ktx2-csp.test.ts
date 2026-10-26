import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';

type Provenance = {
  package: string;
  version: string;
  files: Record<string, { bytes: number; sha256: string }>;
  upstream: Record<string, { bytes: number; sha256: string }>;
};

test('self-hosted Basis assets are pinned, provenance-verifiable, and generated-function-free', async () => {
  const basisPath = resolve(process.cwd(), 'public/basis');
  const provenance = JSON.parse(
    await readFile(resolve(basisPath, 'PROVENANCE.json'), 'utf8'),
  ) as Provenance;

  assert.equal(provenance.package, 'three');
  assert.equal(provenance.version, '0.184.0');

  for (const [fileName, expected] of Object.entries(provenance.files)) {
    const payload = await readFile(resolve(basisPath, fileName));
    assert.equal(payload.byteLength, expected.bytes);
    assert.equal(createHash('sha256').update(payload).digest('hex'), expected.sha256);
  }

  const wrapper = await readFile(resolve(basisPath, 'basis_transcoder.js'), 'utf8');
  assert.match(wrapper, /AEGIS strict-CSP Embind invoker/);
  assert.match(wrapper, /AEGIS strict-CSP Embind method caller/);
  assert.match(wrapper, /AEGIS strict-CSP global lookup/);
  assert.doesNotMatch(wrapper, /newFunc\(Function,(?:args|params)\)|\bnew\s+Function\b|\beval\s*\(/);
  assert.doesNotMatch(wrapper, /function\(\)\{return Function\}\(\)\("return this"\)\(\)/);
  assert.equal(provenance.upstream['basis_transcoder.js'].sha256, '8478b5b6d6b74e7d3082b89f6417321d8d1dc0307f2b30d4484bb11b441696a1');
});

test('GLTF KTX2 path parses embedded bufferViews without connect-src blob fetches', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/utils/gltfLoaderService.ts'), 'utf8');
  const gatewaySource = await readFile(resolve(process.cwd(), 'server/app.ts'), 'utf8');
  assert.match(source, /configuredLoader\.parse\(buffer, resolve, reject\)/);
  assert.match(source, /StrictCspGltfLoader/);
  assert.doesNotMatch(gatewaySource, /["']unsafe-eval["']/);
  assert.match(gatewaySource, /connectSrc:\s*\["'self'", 'ws:', 'wss:'\]/);
});
