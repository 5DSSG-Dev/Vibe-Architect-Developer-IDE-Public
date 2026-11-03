import test from 'node:test';
import assert from 'node:assert/strict';
import { generateApplication } from './applicationGenerator';

const definition = {
  version: 1, name: 'Notes <demo>', objects: [
    { id: 'notes', kind: 'Data', initialRecords: [] },
    { id: 'heading', kind: 'Component', text: 'My notes <script>alert(1)</script>' },
    { id: 'editor', kind: 'Form', modelId: 'notes', fields: [{ name: 'text', label: 'Note', required: true }] },
    { id: 'home', kind: 'Page', path: '/', title: 'Notes', children: ['heading', 'editor', 'notes'] },
    { id: 'nav', kind: 'Navigation', pageIds: ['home'] },
    { id: 'service', kind: 'API', path: '/api/notes' }
  ]
};
test('assembles supported definitions into a deterministic complete project', () => {
  const result = generateApplication(definition);
  assert.deepEqual(result, generateApplication(definition));
  for (const path of ['package.json', 'index.html', 'src/main.jsx', 'src/runtime.jsx', 'src/models/notes.js', 'src/components/editor.jsx', 'src/pages/home.jsx', 'src/routes/nav.js', 'src/services/service.js', 'test/application.test.mjs']) {
    assert.equal(typeof result.files[path], 'string', path);
  }
  const pkg = JSON.parse(result.files['package.json']);
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ['build', 'dev', 'test']);
  assert.ok(!result.files['index.html'].includes('<demo>'));
  assert.ok(!result.files['index.html'].includes('<script>alert'));
});
test('rejects unsupported object kinds rather than generating fake functionality', () => {
  assert.throws(() => generateApplication({ ...definition, objects: [{ id: 'x', kind: 'Mystery' }] }), /unsupported/i);
});
test('rejects unsafe identifiers and duplicate IDs', () => {
  assert.throws(() => generateApplication({ ...definition, objects: [{ id: '../escape', kind: 'Data', initialRecords: [] }] }), /identifier/i);
  assert.throws(() => generateApplication({ ...definition, objects: [...definition.objects, definition.objects[0]] }), /duplicate/i);
});
test('rejects unresolved or incorrectly typed relationships', () => {
  const objects = definition.objects.map(o => o.kind === 'Form' ? { ...o, modelId: 'home' } : o);
  assert.throws(() => generateApplication({ ...definition, objects }), /data/i);
  const missing = definition.objects.map(o => o.kind === 'Page' ? { ...o, children: ['missing'] } : o);
  assert.throws(() => generateApplication({ ...definition, objects: missing }), /missing/i);
});
test('rejects executable API URLs and duplicate page routes', () => {
  const objects = definition.objects.map(o => o.kind === 'API' ? { ...o, path: 'javascript:alert(1)' } : o);
  assert.throws(() => generateApplication({ ...definition, objects }), /path/i);
  assert.throws(() => generateApplication({ ...definition, objects: [...definition.objects, { id: 'other', kind: 'Page', path: '/', title: 'Other', children: [] }] }), /route/i);
});
test('requires a home page and validates form fields', () => {
  assert.throws(() => generateApplication({ ...definition, objects: definition.objects.filter(o => o.kind !== 'Page') }), /page/i);
  const objects = definition.objects.map(o => o.kind === 'Form' ? { ...o, fields: [{ name: '__proto__', label: 'Bad' }] } : o);
  assert.throws(() => generateApplication({ ...definition, objects }), /field/i);
});

test('rejects Windows device filenames before project materialization', () => {
  for (const id of ['con', 'nul', 'aux', 'prn', 'com1', 'lpt9']) {
    const objects = [...definition.objects, { id, kind: 'Data', initialRecords: [] }];
    assert.throws(() => generateApplication({ ...definition, objects }), /identifier/i);
  }
});
