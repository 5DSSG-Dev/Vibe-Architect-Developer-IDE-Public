import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
test('preview serves the four pages with module MIME types and rejects missing or escaping paths', async t=>{
  const path=new URL('./preview.mjs',import.meta.url);
  assert.ok(existsSync(path),'Loopback preview server is not implemented');
  const {createPreviewServer}=await import(path.href);
  const server=createPreviewServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}/atlas/`;
  for(const name of ['index.html','aegis.html','explore.html','building.html']) assert.equal((await fetch(base+name)).status,200);
  const js=await fetch(base+'scripts/model.js');assert.match(js.headers.get('content-type'),/javascript/);
  assert.equal((await fetch(base+'document.html')).status,404);
  assert.equal((await fetch(base+'%2e%2e%2fpackage.json')).status,403);
  assert.equal((await fetch(base+'content/documents.json')).status,200);
});
