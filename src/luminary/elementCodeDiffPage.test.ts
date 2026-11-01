import assert from 'node:assert/strict';
import test from 'node:test';
import { lineDiff, type DiffLine } from './elementCode';
import { elementCodeDiffPage } from './elementCodeDiffPage';

const rows = (count: number): DiffLine[] => Array.from({ length: count }, (_, i) => ({ kind: i % 2 ? 'added' : 'removed', text: String(i) }));
for (const count of [0, 1, 199, 200, 201, 400, 401, 40_002]) {
  test(`page boundaries and complete row reconstruction: ${count}`, () => {
    const original = rows(count);
    const first = elementCodeDiffPage(original, 0);
    assert.equal(first.start, count ? 1 : 0);
    assert.equal(first.end, Math.min(200, count));
    assert.equal(first.hasPrevious, false);
    const collected: DiffLine[] = [];
    for (let page = 0; page < first.pageCount; page++) {
      const result = elementCodeDiffPage(original, page);
      assert.ok(result.rows.length <= 200);
      collected.push(...result.rows);
    }
    assert.deepEqual(collected, original);
    const last = elementCodeDiffPage(original, 999_999);
    assert.equal(last.end, count);
    assert.equal(last.hasNext, false);
    assert.equal(last.page, first.pageCount - 1);
  });
}
test('invalid and changed-comparison pages clamp safely', () => {
  const input = rows(401);
  for (const page of [-1, NaN, Infinity, -Infinity]) assert.equal(elementCodeDiffPage(input, page).page, 0);
  assert.equal(elementCodeDiffPage(input, 1.9).page, 1);
  assert.equal(elementCodeDiffPage(rows(1), 2).page, 0);
});
test('all paged real diff rows reconstruct both complete sources, preserving line content', () => {
  const before = ('old🙂\r\n\n').repeat(10_000);
  const after = ('new終\r\n\n').repeat(10_000);
  const diff = lineDiff(before, after);
  assert.equal(diff.length, 40_002);
  const pages = Array.from({ length: elementCodeDiffPage(diff, 0).pageCount }, (_, page) => elementCodeDiffPage(diff, page).rows).flat();
  assert.equal(pages.filter(row => row.kind !== 'added').map(row => row.text).join('\n'), before);
  assert.equal(pages.filter(row => row.kind !== 'removed').map(row => row.text).join('\n'), after);
});
