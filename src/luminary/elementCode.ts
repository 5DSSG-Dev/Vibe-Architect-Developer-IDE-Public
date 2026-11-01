// The Luminary writes an Element's code (STP-0002 P25). An Element's code is its code frame, kept
// with the Element in the Apothecary, so this goes through the ordinary governed /ask (gauge,
// record) and never through the coding-task branch. The reply is a proposal: the Architect sees it
// beside the current code, and only Accept, then the editor's own Save, changes the Element.

import type { ApothecaryItem, ElementCodeFrame } from '../engine/relationEngine';
import { composePrompt, parseReply, type ExplanationLevel } from './blocks';
import { describeElement } from './knowledge';

/** Marks a prompt as an Element code request, so the rehearsal stand-in can answer it too. */
export const ELEMENT_CODE_MARKER = '[Element code request]';

export interface ElementCodeRequest {
  item: ApothecaryItem;
  catalog: readonly ApothecaryItem[];
  frame: ElementCodeFrame;
  /** The current source in the editor, which may hold unsaved edits. */
  source: string;
  request: string;
  level: ExplanationLevel;
  mode: string;
}

const fenceLanguage = (frame: ElementCodeFrame) => frame.language.toLowerCase();

/** The prompt: the Element's description, its code frame and the Architect's request. Nothing else. */
export function composeElementCodePrompt({ item, catalog, frame, source, request, level, mode }: ElementCodeRequest): string {
  return composePrompt({
    mode,
    level,
    context: [
      { label: 'This Element', text: describeElement(item, catalog) },
      {
        label: 'Element code frame',
        text: [`Language: ${frame.language}`, `File: ${frame.fileName}`, `Entrypoint: ${frame.entrypoint}`, 'Current source:', `\`\`\`${fenceLanguage(frame)}`, source, '```'].join('\n'),
      },
    ],
    message: [
      request.trim(),
      '',
      `${ELEMENT_CODE_MARKER} Explain in plain words what you wrote, then give the complete new source for ${frame.fileName} in exactly one fenced code block. Keep the language (${frame.language}) and the entrypoint (${frame.entrypoint}).`,
    ].join('\n'),
  });
}

export type ElementCodeProposal = { ok: true; code: string; explanation: string } | { ok: false; reason: string };

/** Read the proposal out of a governed reply: exactly one code block, or a plain reason why not. */
export function readElementCodeProposal(content: string): ElementCodeProposal {
  const parts = parseReply(content);
  const code = parts.filter((part): part is Extract<typeof part, { kind: 'code' }> => part.kind === 'code');
  if (code.length === 0) return { ok: false, reason: 'The Luminary did not send any code, so there is nothing to accept.' };
  if (code.length > 1) return { ok: false, reason: `The Luminary sent ${code.length} code blocks instead of one, so it is not clear which is the Element's code. Nothing is offered.` };
  if (!code[0].code.trim()) return { ok: false, reason: 'The Luminary sent an empty code block, so there is nothing to accept.' };
  const explanation = parts.filter((part) => part.kind === 'text').map((part) => (part as { text: string }).text).join('\n\n');
  return { ok: true, code: code[0].code, explanation };
}

export type DiffLine = { kind: 'same' | 'added' | 'removed'; text: string };

/**
 * Exact LCS within a deterministic budget of 1,048,576 cells (at most 4 MiB
 * of Uint32 scores and fewer than that many recurrence steps). Preserve the
 * existing remove-first tie break. Above the budget, emit all removals then
 * additions: non-minimal, but lossless and linear in input/output size.
 * Splitting/emitting still requires O(input characters + output lines) storage
 * and work; the fixed cap bounds the additional quadratic algorithm, not source
 * size or string-comparison costs. No newline/CR/Unicode normalization occurs.
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const maxCells = 1_048_576;
  const columns = b.length + 1;
  const lines: DiffLine[] = [];
  // Avoid allocating even a bounded matrix for the common identical-source case.
  if (before === after) return a.map((text) => ({ kind: 'same', text }));
  if (a.length + 1 > Math.floor(maxCells / columns)) {
    for (const text of a) lines.push({ kind: 'removed', text });
    for (const text of b) lines.push({ kind: 'added', text });
    return lines;
  }
  const table = new Uint32Array((a.length + 1) * columns);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * columns + j] = a[i] === b[j] ? table[(i + 1) * columns + j + 1] + 1 : Math.max(table[(i + 1) * columns + j], table[i * columns + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (table[(i + 1) * columns + j] >= table[i * columns + j + 1]) {
      lines.push({ kind: 'removed', text: a[i++] });
    } else {
      lines.push({ kind: 'added', text: b[j++] });
    }
  }
  while (i < a.length) lines.push({ kind: 'removed', text: a[i++] });
  while (j < b.length) lines.push({ kind: 'added', text: b[j++] });
  return lines;
}
