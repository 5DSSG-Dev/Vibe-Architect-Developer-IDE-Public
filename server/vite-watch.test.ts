import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

test('generated application HTML does not reload the IDE, while IDE HTML still does', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vibe-watch-'));
  const hmr = createServer();
  await new Promise<void>(done => hmr.listen(0, '127.0.0.1', done));
  const vite = await createViteServer({
    root, configFile: resolve('vite.config.ts'),
    server: { middlewareMode: true, hmr: { server: hmr } }, appType: 'custom',
    optimizeDeps: { noDiscovery: true }, logLevel: 'silent',
  });
  const reloads: unknown[] = [];
  const generatedEvents: string[] = [];
  vite.watcher.on('all', (_event, path) => {
    if (/\/(?:output|\.luminary)\//.test(path.replaceAll('\\', '/'))) generatedEvents.push(path);
  });
  vite.ws.send = ((message: unknown) => { if ((message as {type?: string})?.type === 'full-reload') reloads.push(message); }) as typeof vite.ws.send;
  try {
    if (!vite.watcher.options.ignoreInitial) throw Error('Expected initial events to be ignored');
    if (!(vite.watcher as unknown as { _readyEmitted: boolean })._readyEmitted) {
      await new Promise<void>(done => vite.watcher.once('ready', done));
    }
    const generated = join(root, 'output/generated-projects/app-test');
    await mkdir(join(generated, 'dist'), { recursive: true });
    await writeFile(join(generated, 'index.html'), '<html>Generated source</html>');
    await writeFile(join(generated, 'dist/index.html'), '<html>Generated build</html>');
    const diagnostic = join(root, '.luminary/audit-control');
    await mkdir(join(diagnostic, 'dist'), { recursive: true });
    await writeFile(join(diagnostic, 'index.html'), '<html>Diagnostic source</html>');
    await writeFile(join(diagnostic, 'dist/index.html'), '<html>Diagnostic build</html>');
    // The source index is a positive control: wait until the real watcher handles it.
    const ideIndex = join(root, 'index.html');
    const observed = new Promise<void>(done => vite.watcher.on('add', path => { if (path.replaceAll('\\', '/') === ideIndex.replaceAll('\\', '/')) done(); }));
    await writeFile(ideIndex, '<html>IDE</html>');
    await observed;
    await new Promise(done => setTimeout(done, 350));
    assert.deepEqual(generatedEvents, [], 'generated source, build and diagnostic files must be excluded from the watcher');
    assert.ok(reloads.length >= 1, 'the IDE index must still reload; duplicate native filesystem notifications are allowed');
  } finally {
    await vite.close();
    await new Promise<void>(done => hmr.close(() => done()));
    await rm(root, { recursive: true, force: true });
  }
});
