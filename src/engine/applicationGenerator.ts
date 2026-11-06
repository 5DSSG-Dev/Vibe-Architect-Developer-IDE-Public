/** Deterministic generation only. No authored source or process execution. */
export type DisplayOrder = 'insertion-order' | 'newest-first';
export interface ApplicationObjectData { id: string; kind: 'Data'; initialRecords: Record<string, string>[]; displayOrder?: DisplayOrder }
export type ApplicationObject =
  | { id: string; kind: 'Page'; path: string; title: string; children: string[] }
  | { id: string; kind: 'Component'; text: string }
  | { id: string; kind: 'Form'; modelId: string; slugField?: string; fields: { name: string; label: string; required?: boolean }[] }
  | ApplicationObjectData
  | { id: string; kind: 'Navigation'; pageIds: string[] }
  | { id: string; kind: 'API'; path: string };
export interface ApplicationDefinition { version: 1; name: string; objects: ApplicationObject[]; dependencies?: Record<string,string> }
export interface GeneratedApplication { files: Record<string, string> }

const identifier = /^[a-z][a-z0-9-]{0,63}$/;
const pathPattern = /^\/(?:[a-zA-Z0-9_-]+\/?)*$/;
const reserved = new Set(['__proto__', 'constructor', 'prototype']);
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function validate(input: unknown): ApplicationDefinition {
  const d = input as ApplicationDefinition;
  if (!d || d.version !== 1 || typeof d.name !== 'string' || !d.name.trim() || !Array.isArray(d.objects) || d.objects.length > 200) throw new Error('Invalid application definition');
  if (d.dependencies !== undefined && (!d.dependencies || Array.isArray(d.dependencies) || typeof d.dependencies!=='object' || Object.entries(d.dependencies).some(([name,version])=>name!=='slugify'||version!=='1.6.6'))) throw Error('Unsupported generated dependency');
  const ids = new Map<string, ApplicationObject>();
  const routes = new Set<string>();
  for (const o of d.objects) {
    if (!o || typeof o.id !== 'string' || !identifier.test(o.id) || reserved.has(o.id) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(o.id)) throw new Error('Invalid object identifier');
    if (ids.has(o.id)) throw new Error('Duplicate object identifier: ' + o.id);
    ids.set(o.id, o);
    switch (o.kind) {
      case 'Page':
        if (typeof o.path !== 'string' || !pathPattern.test(o.path) || !Array.isArray(o.children) || typeof o.title !== 'string') throw new Error('Invalid page path or definition');
        if (routes.has(o.path)) throw new Error('Duplicate page route');
        routes.add(o.path); break;
      case 'Component':
        if (typeof o.text !== 'string') throw new Error('Invalid component text');
        break;
      case 'Data':
        if (o.displayOrder !== undefined && !['insertion-order', 'newest-first'].includes(o.displayOrder)) throw new Error('Unsupported data display order');
        if (!Array.isArray(o.initialRecords) || !o.initialRecords.every(r => r && typeof r === 'object' && !Array.isArray(r) && Object.entries(r).every(([k, v]) => !reserved.has(k) && typeof v === 'string'))) throw new Error('Invalid data records');
        break;
      case 'Form': {
        if (o.slugField !== undefined && (d.dependencies?.slugify!=='1.6.6' || typeof o.slugField!=='string' || !o.fields.some(f=>f.name===o.slugField))) throw Error('Slug form requires its declared field and pinned dependency');
        if (!Array.isArray(o.fields) || !o.fields.length) throw new Error('Form fields are required');
        const names = new Set<string>();
        for (const f of o.fields) {
          if (!f || typeof f.name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.name) || reserved.has(f.name) || names.has(f.name) || typeof f.label !== 'string' || (f.required !== undefined && typeof f.required !== 'boolean')) throw new Error('Invalid or duplicate form field');
          names.add(f.name);
        }
        break;
      }
      case 'Navigation':
        if (!Array.isArray(o.pageIds) || !o.pageIds.length || new Set(o.pageIds).size !== o.pageIds.length) throw new Error('Invalid navigation pages');
        break;
      case 'API':
        if (typeof o.path !== 'string' || !pathPattern.test(o.path)) throw new Error('API path must be a relative same-origin HTTP path');
        break;
      default: throw new Error('Unsupported object kind');
    }
  }
  if (!routes.has('/')) throw new Error('A home page at / is required');
  for (const o of d.objects) {
    if (o.kind === 'Form' && ids.get(o.modelId)?.kind !== 'Data') throw new Error('Form requires a Data object: ' + o.modelId);
    if (o.kind === 'Navigation') for (const id of o.pageIds) if (ids.get(id)?.kind !== 'Page') throw new Error('Navigation requires a page: ' + id);
    if (o.kind === 'Page') for (const id of o.children) if (!['Component', 'Form', 'Data'].includes(ids.get(id)?.kind ?? '')) throw new Error('Missing or unsupported page child: ' + id);
  }
  return d;
}

export function generateApplication(input: unknown): GeneratedApplication {
  const d = validate(input);
  const files: Record<string, string> = {};
  const pages = d.objects.filter((o): o is Extract<ApplicationObject, { kind: 'Page' }> => o.kind === 'Page');
  const models = d.objects.filter((o): o is Extract<ApplicationObject, { kind: 'Data' }> => o.kind === 'Data');
  const forms = d.objects.filter((o): o is Extract<ApplicationObject, { kind: 'Form' }> => o.kind === 'Form');
  // Omitted ordering preserves legacy source bytes and saved CORE evidence.
  const explicitDisplayOrder = models.some(model => model.displayOrder !== undefined);
  files['package.json'] = JSON.stringify({
    name: 'vibe-generated-app', version: '1.0.0', private: true, type: 'module',
    scripts: { dev: 'vite --host 127.0.0.1', build: 'vite build', test: 'node --test test/*.test.mjs' },
    dependencies: { react: '18.3.1', 'react-dom': '18.3.1', ...d.dependencies },
    devDependencies: { vite: '5.4.21' }
  }, null, 2) + '\n';
  files['vite.config.js'] = 'export default { css: { postcss: { plugins: [] } } };\n';
  const title = d.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  files['index.html'] = '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n';
  files['src/logic.js'] = [
    'export const formFields = ' + json(Object.fromEntries(forms.map(form=>[form.id,form.fields]))) + ';',
    'export function appendRecord(records, record) { return [...records, { ...record }]; }',
    ...(explicitDisplayOrder ? ['export function displayRecords(records, order = "insertion-order") { if (order === "newest-first") return [...records].reverse(); if (order === "insertion-order") return records; throw new Error("Unsupported data display order"); }'] : []),
    'export function prepareRecord(fields, values) {',
    '  return Object.fromEntries(fields.map(f => {',
    '    const supplied = values[f.name];',
    '    if (supplied != null && typeof supplied !== "string") throw new Error("Only text values are supported");',
    '    const value = (supplied ?? "").trim();',
    '    if (f.required && !value) throw new Error(f.label + " is required");',
    '    return [f.name, value];',
    '  }));',
    '}',
    'export function resolvePage(pages, path) { return pages.find(p => p.path === path); }'
  ].join('\n') + '\n';
  files['src/runtime.jsx'] = [
    "import React, { createContext, useContext, useState } from 'react';",
    explicitDisplayOrder ? "import { appendRecord, displayRecords } from './logic.js';" : "import { appendRecord } from './logic.js';",
    'const Context = createContext(null);',
    'export function ModelProvider({ initial, children }) {',
    '  const [models, setModels] = useState(initial);',
    '  const append = (id, record) => setModels(prev => ({ ...prev, [id]: appendRecord(prev[id], record) }));',
    '  return <Context.Provider value={{ models, append }}>{children}</Context.Provider>;',
    '}',
    'export function useModel(id) { const { models, append } = useContext(Context); return [models[id], record => append(id, record)]; }',
    explicitDisplayOrder ? 'export function Records({ modelId, displayOrder = "insertion-order" }) {' : 'export function Records({ modelId }) {',
    '  const [records] = useModel(modelId);',
    '  return <ul aria-label="Saved records">{' + (explicitDisplayOrder ? 'displayRecords(records, displayOrder)' : 'records') + '.map((r, i) => <li key={i}>{Object.entries(r).map(([k,v]) => <p key={k}><strong>{k}: </strong>{v}</p>)}</li>)}</ul>;',
    '}'
  ].join('\n') + '\n';
  for (const o of d.objects) {
    if (o.kind === 'Data') files['src/models/' + o.id + '.js'] = 'export const initialRecords = ' + json(o.initialRecords) + ';\n';
    if (o.kind === 'Component') files['src/components/' + o.id + '.jsx'] = "import React from 'react';\nexport default function Component() { return <p>{" + json(o.text) + '}</p>; }\n';
    if (o.kind === 'Form') files['src/components/' + o.id + '.jsx'] = [
      "import React, { useState } from 'react';",
      "import { useModel } from '../runtime.jsx';",
      "import { prepareRecord, formFields } from '../logic.js';",
      'export const fields = formFields[' + json(o.id) + '];',
      'export default function Form() {',
      '  const [, append] = useModel(' + json(o.modelId) + ');',
      '  const [error, setError] = useState("");',
      '  const submit = async event => {',
      '    event.preventDefault(); const form = event.currentTarget;',
      '    try { const record = prepareRecord(fields, Object.fromEntries(new FormData(form)));',
      ...(o.slugField ? ['      const { default: slugify } = await import("slugify");', '      record.slug = slugify(record['+json(o.slugField)+'], { lower: true, strict: true });'] : []),
      '      append(record); form.reset(); setError(""); }',
      '    catch (e) { setError(e.message); }',
      '  };',
      '  return <form onSubmit={submit}>{fields.map(f => <label key={f.name}>{f.label}<input type="text" name={f.name} required={f.required} /></label>)}<button type="submit">Save</button>{error && <p role="alert">{error}</p>}</form>;',
      '}'
    ].join('\n') + '\n';
    if (o.kind === 'Page') {
      const children = o.children.map(id => d.objects.find(c => c.id === id)!);
      const imports = children.map((c, i) => c.kind === 'Data' ? '' : 'import Child' + i + " from '../components/" + c.id + ".jsx';").filter(Boolean);
      files['src/pages/' + o.id + '.jsx'] = [
        "import React from 'react';", "import { Records } from '../runtime.jsx';", ...imports,
        'export default function Page() { return <main><h1>{' + json(o.title) + '}</h1>',
        ...children.map((c, i) => c.kind === 'Data' ? '<Records modelId={' + json(c.id) + '}' + (explicitDisplayOrder ? ' displayOrder={' + json(c.displayOrder ?? 'insertion-order') + '}' : '') + ' />' : '<Child' + i + ' />'),
        '</main>; }'
      ].join('\n') + '\n';
    }
    if (o.kind === 'Navigation') files['src/routes/' + o.id + '.js'] = 'export const routes = ' + json(o.pageIds.map(id => { const p = pages.find(p => p.id === id)!; return { path: p.path, title: p.title }; })) + ';\n';
    if (o.kind === 'API') files['src/services/' + o.id + '.js'] = 'export async function request(fetcher = fetch) { const response = await fetcher(' + json(o.path) + '); if (!response.ok) throw new Error("Request returned HTTP " + response.status); return response.json(); }\n';
  }
  const navs = d.objects.filter(o => o.kind === 'Navigation');
  files['src/main.jsx'] = [
    "import React, { useEffect, useState } from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import { ModelProvider } from './runtime.jsx';",
    "import { resolvePage } from './logic.js';",
    "import './style.css';",
    ...pages.map((p, i) => 'import Page' + i + " from './pages/" + p.id + ".jsx';"),
    ...models.map((m, i) => 'import { initialRecords as model' + i + " } from './models/" + m.id + ".js';"),
    ...navs.map((n, i) => 'import { routes as nav' + i + " } from './routes/" + n.id + ".js';"),
    'const pages = [' + pages.map((p, i) => '{ path: ' + json(p.path) + ', Component: Page' + i + ' }').join(',') + '];',
    'const initial = { ' + models.map((m, i) => json(m.id) + ': model' + i).join(',') + ' };',
    'const routes = [' + navs.map((_, i) => '...nav' + i).join(',') + '];',
    'function App() {',
    '  const [path, setPath] = useState(location.hash.slice(1) || "/");',
    '  useEffect(() => { const change = () => setPath(location.hash.slice(1) || "/"); window.addEventListener("hashchange", change); return () => window.removeEventListener("hashchange", change); }, []);',
    '  const page = resolvePage(pages, path);',
    '  return <ModelProvider initial={initial}><nav>{routes.map((r,i) => <a key={i} href={"#" + r.path}>{r.title}</a>)}</nav>{page ? <page.Component /> : <main><h1>Page not found</h1><a href="#/">Home</a></main>}</ModelProvider>;',
    '}',
    'createRoot(document.getElementById("root")).render(<App />);'
  ].join('\n') + '\n';
  files['src/style.css'] = 'body{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#172033}nav{display:flex;gap:1rem}form,label{display:grid;gap:.5rem}form{max-width:28rem;gap:1rem}input,button{font:inherit;padding:.65rem}li{border-bottom:1px solid #ddd}button{cursor:pointer}\n';
  files['test/application.test.mjs'] = [
    "import test from 'node:test';", "import assert from 'node:assert/strict';",
    explicitDisplayOrder ? "import { appendRecord, displayRecords, prepareRecord, resolvePage } from '../src/logic.js';" : "import { appendRecord, prepareRecord, resolvePage } from '../src/logic.js';",
    'test("form values append without mutating earlier records", () => { const before = []; const record = prepareRecord([{name:"text",label:"Note",required:true}], {text:" hello "}); const after = appendRecord(before,record); assert.deepEqual(before,[]); assert.deepEqual(after,[{text:"hello"}]); record.text = "changed"; assert.equal(after[0].text,"hello"); });',
    ...(explicitDisplayOrder ? models : []).map(m => 'test(' + json('Data '+m.id+' displays '+(m.displayOrder ?? 'insertion-order')) + ', () => { const stored = appendRecord(appendRecord([], {text:"FIRST"}), {text:"SECOND"}); assert.deepEqual(displayRecords(stored,' + json(m.displayOrder ?? 'insertion-order') + ').map(r=>r.text),' + json(m.displayOrder === 'newest-first' ? ['SECOND','FIRST'] : ['FIRST','SECOND']) + '); assert.deepEqual(stored.map(r=>r.text),["FIRST","SECOND"]); });'),
    'test("required fields reject whitespace", () => { assert.throws(() => prepareRecord([{name:"text",label:"Note",required:true}],{text:"   "}), /Note is required/); });',
    'test("non-text form values are rejected", () => { assert.throws(() => prepareRecord([{name:"text",label:"Note",required:true}],{text:{file:"image.png"}}), /Only text values/); });',
    ...(d.dependencies?.slugify ? ["test('declared dynamic slug dependency resolves and normalizes a title', async () => { const {default: slugify} = await import('slugify'); assert.equal(slugify('Hello Peer Two!',{lower:true,strict:true}),'hello-peer-two'); });"] : []),
    'test("routes resolve exactly and unknown routes stay missing", () => { const pages = [{path:"/"}]; assert.equal(resolvePage(pages,"/"), pages[0]); assert.equal(resolvePage(pages,"/unknown"),undefined); });',
    ...d.objects.filter(o => o.kind === 'API').map((o, i) => "import { request as request" + i + " } from '../src/services/" + o.id + ".js';\ntest(" + json('API ' + o.id + ' uses its declared path and reports HTTP errors') + ', async () => { assert.deepEqual(await request' + i + '(async path => { assert.equal(path,' + json(o.path) + '); return {ok:true,json:async()=>({value:1})}; }),{value:1}); await assert.rejects(() => request' + i + '(async()=>({ok:false,status:503})),/503/); });')
  ].join('\n') + '\n';
  files['README.md'] = '# Generated application\n\nRun npm install, npm test, npm run build, then npm run dev.\n\nForm data lives in memory for this first generation profile; reloading clears changes. API services expose GET JSON calls; a backend is not generated. Source assembly does not certify governance approval. Review the generated project before execution.\n';
  files['vibe-definition.json'] = JSON.stringify(d, null, 2) + '\n';
  return { files };
}
