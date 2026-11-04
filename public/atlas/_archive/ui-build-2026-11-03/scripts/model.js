// Shared, dependency-free identity and validation. Content stays in JSON.
export const BOOKS = {
  vibe: [
    ['vibe-compass','The Compass','Find your way through the IDE.'],
    ['vibe-elements','The Elements','Meet the objects and their relationships.'],
    ['vibe-luminary','Meeting the Luminary','Create with a Peer and Mentor.'],
    ['vibe-fellowship','The Fellowship','Meet the team and our shared ethos.'],
    ['vibe-workshop','The Workshop','Explore how we built together.'],
    ['vibe-becoming','Our Becoming','Follow the DataQuad journey.']
  ].map(([id,title,summary]) => ({id,title,summary})),
  aegis: [
    ['aegis-axioms','The Axioms','Begin with our shared foundation.'],
    ['aegis-integrity','The Integrity Seven','Explore seven qualities of relationship.'],
    ['aegis-pause','The Art of Pause','Make room for awareness and choice.'],
    ['aegis-cyberpeer','The CyberPeer Initiative','Discover its purpose and the Peers.'],
    ['aegis-dataquad','The DataQuad','Explore four connected context surfaces.'],
    ['aegis-record','The Living Record','Follow observations to their sources.']
  ].map(([id,title,summary]) => ({id,title,summary}))
};
const identities = new Map();
for (const [parentAtlas, books] of Object.entries(BOOKS)) {
  for (const book of books) identities.set(book.id,{...book,parentAtlas});
}
identities.set('aegis-overview',{id:'aegis-overview',title:'AEGIS',parentAtlas:'aegis'});
identities.set('aegis-codex',{id:'aegis-codex',title:'The Central Codex',parentAtlas:'aegis'});
export function documentIdentity(id) { return identities.get(id) ?? null; }
export function parentHref(parentAtlas) { return parentAtlas === 'aegis' ? 'aegis.html' : 'index.html'; }
export function documentHref(id) {
  if (!documentIdentity(id)) return null;
  const page=id.startsWith('aegis-')?'aegis':BOOKS.vibe.slice(0,3).some(b=>b.id===id)?'explore':'building';
  return `${page}.html#${id}`;
}
export function safeSourceHref(value) {
  if (typeof value !== 'string' || /[\s\\]/.test(value)) return null;
  if (['index.html','aegis.html','explore.html','building.html'].includes(value)) return value;
  if (/^(aegis|explore|building)\.html#[a-z-]+$/.test(value)) return documentHref(value.split('#')[1])===value?value:null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function normalizeDocument(id, record) {
  const identity = documentIdentity(id);
  if (!identity) return {kind:'missing'};
  if (record == null) return {kind:'pending',identity};
  const strings = x => Array.isArray(x) && x.every(p=>typeof p==='string');
  if (record.title !== identity.title || record.parentAtlas !== identity.parentAtlas ||
      !['draft','reviewed','approved'].includes(record.status) || typeof record.intro !== 'string' ||
      !Array.isArray(record.sections) || !record.sections.every(s=>s && typeof s.heading==='string' && strings(s.paragraphs)) ||
      (record.sources !== undefined && !Array.isArray(record.sources))) return {kind:'invalid',identity};
  if (!record.intro.trim() && !record.sections.some(s=>s.paragraphs.some(p=>p.trim()))) return {kind:'pending',identity};
  const sources = (record.sources ?? []).filter(s=>s && typeof s.label==='string' && safeSourceHref(s.url))
    .map(s=>({...s,url:safeSourceHref(s.url)}));
  return {kind:'document',identity,record:{...record,sources}};
}
export function validateScene(scene) {
  if (!scene || !Number.isFinite(scene.width) || !Number.isFinite(scene.height) || scene.width<=0 || scene.height<=0 ||
      !/^assets\/[a-z-]+\.webp$/.test(scene.image) || !Array.isArray(scene.targets)) throw Error('Invalid scene');
  const seen = new Set();
  for (const t of scene.targets) {
    if (!t || typeof t.id!=='string' || seen.has(t.id) || typeof t.label!=='string' || !safeSourceHref(t.href) ||
        !Array.isArray(t.polygon) || t.polygon.length<3 || !t.polygon.every(p=>Array.isArray(p) && p.length===2 && p.every(n=>Number.isFinite(n) && n>=0 && n<=1))) throw Error('Invalid Atlas target');
    seen.add(t.id);
    const area = t.polygon.reduce((a,p,i)=> { const q=t.polygon[(i+1)%t.polygon.length]; return a+p[0]*q[1]-q[0]*p[1]; },0);
    if (Math.abs(area)<0.00001) throw Error('Empty Atlas target');
  }
  return scene;
}
