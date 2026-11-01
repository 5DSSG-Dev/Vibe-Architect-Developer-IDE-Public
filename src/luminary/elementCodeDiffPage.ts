import type { DiffLine } from './elementCode';

export const ELEMENT_CODE_DIFF_PAGE_SIZE = 200;

/** Zero-based pages; empty comparisons still have one navigable position (page 0). */
export function elementCodeDiffPage(rows: readonly DiffLine[], requestedPage: number) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / ELEMENT_CODE_DIFF_PAGE_SIZE));
  const page = Math.min(pageCount - 1, Math.max(0, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0));
  const offset = page * ELEMENT_CODE_DIFF_PAGE_SIZE;
  return {
    page, pageCount, total,
    start: total === 0 ? 0 : offset + 1,
    end: Math.min(offset + ELEMENT_CODE_DIFF_PAGE_SIZE, total),
    hasPrevious: page > 0,
    hasNext: page + 1 < pageCount,
    rows: rows.slice(offset, offset + ELEMENT_CODE_DIFF_PAGE_SIZE),
  };
}
