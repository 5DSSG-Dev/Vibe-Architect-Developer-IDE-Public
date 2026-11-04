import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const modulePath = new URL('scripts/model.js', root);
async function model() {
  assert.ok(existsSync(modulePath), 'Atlas navigation and document model has not been implemented');
  return import(modulePath.href);
}
test('all twelve books retain their agreed identity and parent Atlas', async () => {
  const { BOOKS, documentIdentity } = await model();
  assert.deepEqual(BOOKS.vibe.map(x => x.id), ['vibe-compass','vibe-elements','vibe-luminary','vibe-fellowship','vibe-workshop','vibe-becoming']);
  assert.deepEqual(BOOKS.aegis.map(x => x.id), ['aegis-axioms','aegis-integrity','aegis-pause','aegis-cyberpeer','aegis-dataquad','aegis-record']);
  for (const [parent, books] of Object.entries(BOOKS)) for (const book of books) assert.equal(documentIdentity(book.id).parentAtlas, parent);
  assert.equal(documentIdentity('aegis-codex').title, 'The Central Codex');
  assert.equal(documentIdentity('__proto__'), null);
  assert.equal(documentIdentity('vibe-unknown'), null);
});
test('source links accept HTTPS or known local documents and reject executable or foreign local paths', async () => {
  const { safeSourceHref } = await model();
  assert.equal(safeSourceHref('https://example.org/record'), 'https://example.org/record');
  assert.equal(safeSourceHref('aegis.html#aegis-axioms'), 'aegis.html#aegis-axioms');
  assert.equal(safeSourceHref('explore.html#vibe-compass'), 'explore.html#vibe-compass');
  for (const url of ['javascript:alert(1)','data:text/html,test','file:///G:/secret','//example.org','../.env','http://example.org','https://user:password@example.org','aegis.html#unknown','explore.html#aegis-axioms','https://example.org\n.evil']) assert.equal(safeSourceHref(url), null, url);
});
test('empty and draft documents remain visibly distinguishable from approved content', async () => {
  const { normalizeDocument } = await model();
  assert.equal(normalizeDocument('vibe-compass', null).kind, 'pending');
  const base = { title:'The Compass', parentAtlas:'vibe', status:'draft', intro:'A reviewed introduction can go here.', sections:[], sources:[] };
  const draft = normalizeDocument('vibe-compass', base);
  assert.equal(draft.kind,'document'); assert.equal(draft.record.status,'draft');
  assert.equal(normalizeDocument('vibe-compass', {...base, status:'approved'}).record.status,'approved');
  assert.equal(normalizeDocument('vibe-compass', {...base, intro:'', sections:[]}).kind,'pending');
  assert.equal(normalizeDocument('vibe-compass', {...base, parentAtlas:'aegis'}).kind,'invalid');
  assert.equal(normalizeDocument('unknown', base).kind,'missing');
  assert.equal(normalizeDocument('vibe-compass', {...base, sections:[{heading:'Bad', paragraphs:'not an array'}]}).kind,'invalid');
});
test('HTML-looking prose stays text and unsafe sources are removed', async () => {
  const { normalizeDocument } = await model();
  const record = {title:'The Compass',parentAtlas:'vibe',status:'draft',intro:'<img src=x onerror=alert(1)>',sections:[],sources:[{label:'Bad',url:'javascript:alert(1)'},{label:'Record',url:'https://example.org'}]};
  const result = normalizeDocument('vibe-compass', record);
  assert.equal(result.record.intro, record.intro);
  assert.equal(result.record.sources.length, 1);
});
test('real geometry is normalized, nondegenerate and routes the crystal to AEGIS', async () => {
  const { validateScene } = await model();
  const nav = JSON.parse(readFileSync(new URL('content/navigation.json', root)));
  assert.equal(nav.vibe.targets.find(x => x.id==='vibe-crystal').href,'aegis.html');
  for (const scene of Object.values(nav)) {
    assert.doesNotThrow(() => validateScene(scene));
    assert.equal(scene.targets.filter(x=>x.kind==='book').length,6);
  }
  const bad = structuredClone(nav.vibe); bad.targets[0].polygon[0][0] = 2;
  assert.throws(() => validateScene(bad));
  const unsafe = structuredClone(nav.vibe); unsafe.targets[0].href = 'javascript:alert(1)';
  assert.throws(() => validateScene(unsafe));
});
test('all fourteen document slots exist, with no fabricated Canon', async () => {
  const { BOOKS, documentIdentity } = await model();
  const { documents } = JSON.parse(readFileSync(new URL('content/documents.json', root)));
  assert.equal(Object.keys(documents).length,14);
  for (const books of Object.values(BOOKS)) for (const book of books) assert.equal(documents[book.id].title,book.title);
  for (const [id, record] of Object.entries(documents)) assert.equal(record.parentAtlas,documentIdentity(id).parentAtlas);
  assert.equal(documents['aegis-axioms'].intro,'');
  assert.equal(documents['aegis-codex'].intro,'');
});
test('both pages ship useful ordinary links even without JavaScript', async () => {
  await model();
  for (const page of ['index.html','aegis.html']) {
    const html = readFileSync(new URL(page,root),'utf8');
    assert.ok(html.includes('Browse the books'));
    assert.equal((html.match(/data-book-id=/g)||[]).length,6);
    assert.ok(html.includes('width=') && html.includes('height='));
  }
});
test('exactly four HTML pages contain all content without a fifth document page', async () => {
  const { documentHref } = await model();
  assert.equal(documentHref('vibe-compass'),'explore.html#vibe-compass');
  assert.equal(documentHref('vibe-workshop'),'building.html#vibe-workshop');
  assert.equal(documentHref('aegis-axioms'),'aegis.html#aegis-axioms');
  assert.equal(documentHref('unknown'),null);
  for (const page of ['index.html','aegis.html','explore.html','building.html']) assert.ok(existsSync(new URL(page,root)),page);
  assert.ok(!existsSync(new URL('document.html',root)));
  const explore=readFileSync(new URL('explore.html',root),'utf8');
  assert.ok(explore.includes('id="vibe-compass"') && explore.includes('id="vibe-elements"') && explore.includes('id="vibe-luminary"'));
  const building=readFileSync(new URL('building.html',root),'utf8');
  assert.ok(building.includes('id="vibe-fellowship"') && building.includes('id="vibe-workshop"') && building.includes('id="vibe-becoming"'));
});
