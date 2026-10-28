// Structured parts of a Luminary reply (STP-0002 P19). A reply is governed text; an Offering or a
// proposed code change travels inside it as a fenced block, so the governance gate and the reply
// pipeline stay unchanged and the gauge reads the whole reply as words. The parser is fail-closed:
// a block that does not validate is reported as a malformed part, never guessed into shape.
//
//   ```luminary-offering            ```luminary-change
//   { "title": ..., ... }            { "summary": ..., "files": [...] }
//   ```                              ```
//
// Shared by the IDE panel (to draw cards) and the gateway executor (to apply a change).

export type ExplanationLevel = 'plain' | 'guided' | 'technical';

export const EXPLANATION_LEVELS: readonly ExplanationLevel[] = ['plain', 'guided', 'technical'];

export const EXPLANATION_LABELS: Record<ExplanationLevel, string> = {
  plain: 'Plain',
  guided: 'Guided',
  technical: 'Technical',
};

/** A proposed Markdown artifact. Accepting it runs the existing document.markdown.compose Work Request. */
export interface OfferingBlock {
  title: string;
  purpose: string;
  sections: { heading: string; body: string }[];
}

/** One file the Luminary proposes to write, whole, on its own working branch. */
export interface ChangeFile {
  path: string;
  content: string;
}

/** A proposed code change. It is applied only by the executor, on the Luminary's branch. */
export interface ChangeBlock {
  summary: string;
  files: ChangeFile[];
}

export type ReplyPart =
  | { kind: 'text'; text: string }
  | { kind: 'code'; language: string; code: string }
  | { kind: 'offering'; offering: OfferingBlock }
  | { kind: 'change'; change: ChangeBlock }
  | { kind: 'malformed'; block: 'offering' | 'change'; reason: string };

/** Ceilings that keep one reply from carrying an unbounded change. */
export const MAX_CHANGE_FILES = 8;
export const MAX_CHANGE_FILE_BYTES = 16_384;

const FENCE = /```([A-Za-z0-9_-]*)\n([\s\S]*?)```/g;

const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function parseJsonObject(raw: string): Record<string, unknown> | string {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return 'The block is not valid JSON.';
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'The block is not a JSON object.';
  return value as Record<string, unknown>;
}

export function validateOffering(raw: string): OfferingBlock | string {
  const value = parseJsonObject(raw);
  if (typeof value === 'string') return value;
  if (!nonEmptyString(value.title)) return 'The offering has no title.';
  if (!nonEmptyString(value.purpose)) return 'The offering has no purpose.';
  if (!Array.isArray(value.sections) || value.sections.length === 0) return 'The offering has no sections.';
  const sections: OfferingBlock['sections'] = [];
  for (const section of value.sections) {
    if (typeof section !== 'object' || section === null) return 'An offering section is not an object.';
    const { heading, body } = section as Record<string, unknown>;
    if (!nonEmptyString(heading) || !nonEmptyString(body)) return 'An offering section needs a heading and a body.';
    sections.push({ heading: heading.trim(), body });
  }
  return { title: value.title.trim(), purpose: value.purpose.trim(), sections };
}

export function validateChange(raw: string): ChangeBlock | string {
  const value = parseJsonObject(raw);
  if (typeof value === 'string') return value;
  if (!nonEmptyString(value.summary)) return 'The change has no summary.';
  if (!Array.isArray(value.files) || value.files.length === 0) return 'The change names no files.';
  if (value.files.length > MAX_CHANGE_FILES) return `The change names more than ${MAX_CHANGE_FILES} files.`;
  const files: ChangeFile[] = [];
  for (const file of value.files) {
    if (typeof file !== 'object' || file === null) return 'A changed file is not an object.';
    const { path, content } = file as Record<string, unknown>;
    if (!nonEmptyString(path)) return 'A changed file has no path.';
    if (typeof content !== 'string') return `${path} has no content.`;
    if (new TextEncoder().encode(content).length > MAX_CHANGE_FILE_BYTES) return `${path} is larger than ${MAX_CHANGE_FILE_BYTES} bytes.`;
    files.push({ path: path.trim(), content });
  }
  return { summary: value.summary.trim(), files };
}

/** Split a governed reply into text, code, Offering and change parts, in order. */
export function parseReply(content: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let cursor = 0;
  const pushText = (text: string) => {
    if (text.trim().length > 0) parts.push({ kind: 'text', text: text.trim() });
  };
  for (const match of content.matchAll(FENCE)) {
    pushText(content.slice(cursor, match.index));
    cursor = (match.index ?? 0) + match[0].length;
    const [, language, body] = match;
    if (language === 'luminary-offering') {
      const offering = validateOffering(body);
      parts.push(typeof offering === 'string' ? { kind: 'malformed', block: 'offering', reason: offering } : { kind: 'offering', offering });
    } else if (language === 'luminary-change') {
      const change = validateChange(body);
      parts.push(typeof change === 'string' ? { kind: 'malformed', block: 'change', reason: change } : { kind: 'change', change });
    } else {
      parts.push({ kind: 'code', language, code: body.replace(/\n$/, '') });
    }
  }
  pushText(content.slice(cursor));
  return parts;
}

/** The first proposed change in a reply, or a reason there is none usable. */
export function findChange(content: string): ChangeBlock | string {
  for (const part of parseReply(content)) {
    if (part.kind === 'change') return part.change;
    if (part.kind === 'malformed' && part.block === 'change') return part.reason;
  }
  return 'The reply proposes no code change.';
}

/** What the IDE tells the model about the Architect's request. Plain text, read by the gauge too. */
export interface PromptFrame {
  mode: string;
  level: ExplanationLevel;
  context: { label: string; text: string }[];
  message: string;
  /** Present when the Architect assigned a coding task. */
  task?: { allowedFiles: string[] };
}

export function composePrompt(frame: PromptFrame): string {
  const lines = [`[Mode: ${frame.mode}] [Explanation: ${EXPLANATION_LABELS[frame.level]}]`];
  if (frame.task) lines.push(`[Task] Allowed files: ${frame.task.allowedFiles.join(', ')}`);
  for (const item of frame.context) lines.push(`[Context: ${item.label}]\n${item.text}`);
  lines.push(`Architect: ${frame.message}`);
  return lines.join('\n');
}

/** Read the frame lines back out of a prompt. Used by the rehearsal stand-in. */
export function readPromptFrame(prompt: string): { mode: string; level: ExplanationLevel; allowedFiles: string[] | null; message: string } {
  const mode = /\[Mode: ([^\]]+)\]/.exec(prompt)?.[1] ?? 'DESIGN';
  const levelLabel = /\[Explanation: ([^\]]+)\]/.exec(prompt)?.[1]?.toLowerCase();
  const level = (EXPLANATION_LEVELS as readonly string[]).includes(levelLabel ?? '') ? (levelLabel as ExplanationLevel) : 'plain';
  const task = /\[Task\] Allowed files: (.*)/.exec(prompt)?.[1];
  const allowedFiles = task ? task.split(',').map((file) => file.trim()).filter(Boolean) : null;
  const message = /Architect: ([\s\S]*)$/.exec(prompt)?.[1]?.trim() ?? prompt.trim();
  return { mode, level, allowedFiles, message };
}
