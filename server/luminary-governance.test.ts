import assert from 'node:assert/strict';
import { test } from 'node:test';
import { governReply, DEFAULT_MAX_CONTENT_BYTES } from './luminary-governance.js';

test('a well-formed reply passes and is returned with its model id and exact content', () => {
  const result = governReply({ modelId: 'meta/muse-spark-open', content: 'Hello, Architect.' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.reply.modelId, 'meta/muse-spark-open');
  assert.equal(result.reply.content, 'Hello, Architect.');
});

test('the declared model id is trimmed but the content is preserved exactly', () => {
  const content = '  leading and trailing spaces are part of the answer  ';
  const result = governReply({ modelId: '  meta/muse-spark-open  ', content });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.reply.modelId, 'meta/muse-spark-open');
  assert.equal(result.reply.content, content);
});

test('a non-object candidate is a malformed_reply with no model id', () => {
  for (const candidate of [null, undefined, 'a string', 42, true, ['a']]) {
    const result = governReply(candidate);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.shortfall.code, 'malformed_reply');
    assert.equal(result.shortfall.modelId, null);
  }
});

test('a missing or blank model id is a missing_model_id shortfall', () => {
  for (const modelId of [undefined, '', '   ', 123]) {
    const result = governReply({ modelId, content: 'valid content' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.shortfall.code, 'missing_model_id');
    assert.equal(result.shortfall.modelId, null);
  }
});

test('missing or non-string content is a malformed_reply that still reports the model id', () => {
  for (const content of [undefined, 123, {}, ['x']]) {
    const result = governReply({ modelId: 'meta/muse-spark-open', content });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.shortfall.code, 'malformed_reply');
    assert.equal(result.shortfall.modelId, 'meta/muse-spark-open');
  }
});

test('empty or whitespace-only content is an empty_reply', () => {
  for (const content of ['', '   ', '\n\t  \n']) {
    const result = governReply({ modelId: 'meta/muse-spark-open', content });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.shortfall.code, 'empty_reply');
    assert.equal(result.shortfall.modelId, 'meta/muse-spark-open');
  }
});

test('content over the byte ceiling is an oversized_reply', () => {
  const result = governReply(
    { modelId: 'meta/muse-spark-open', content: 'x'.repeat(11) },
    { maxContentBytes: 10 },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'oversized_reply');
  assert.equal(result.shortfall.modelId, 'meta/muse-spark-open');
  assert.match(result.shortfall.message, /11 bytes.*10-byte/);
});

test('the size ceiling is measured in UTF-8 bytes, not characters', () => {
  // '€' is 3 UTF-8 bytes; four of them are 12 bytes, over a 10-byte ceiling.
  const result = governReply({ modelId: 'm', content: '€€€€' }, { maxContentBytes: 10 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.shortfall.code, 'oversized_reply');
});

test('content exactly at the byte ceiling passes', () => {
  const result = governReply({ modelId: 'm', content: 'x'.repeat(10) }, { maxContentBytes: 10 });
  assert.equal(result.ok, true);
});

test('the default byte ceiling is applied when no option is given', () => {
  const atLimit = governReply({ modelId: 'm', content: 'x'.repeat(DEFAULT_MAX_CONTENT_BYTES) });
  assert.equal(atLimit.ok, true);
  const overLimit = governReply({ modelId: 'm', content: 'x'.repeat(DEFAULT_MAX_CONTENT_BYTES + 1) });
  assert.equal(overLimit.ok, false);
  if (overLimit.ok) return;
  assert.equal(overLimit.shortfall.code, 'oversized_reply');
});
