// The Luminary's Knowledge Pack (STP-0002 P23): the IDE's own Element descriptions, sent with the
// Instructions on every question so answers are grounded in the project's words. The pack is read
// once at startup, so its hash names exactly what every answer from this gateway was given; the
// panel records that hash with each exchange.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const KNOWLEDGE_VERSION = 'v0.1';

export interface LuminaryKnowledge {
  version: string;
  /** sha256 of `text`, the exact text sent. */
  sha256: string;
  bytes: number;
  text: string;
}

/** The pack followed by the CORE Element Catalog, unchanged. */
export function loadLuminaryKnowledge(
  root: URL = new URL('../', import.meta.url),
  read: (url: URL) => string = (url) => readFileSync(url, 'utf8'),
): LuminaryKnowledge {
  const pack = read(new URL('docs/LUMINARY_KNOWLEDGE_ELEMENTS_v0.1.md', root));
  const catalog = read(new URL('docs/CORE_ELEMENT_CATALOG.md', root));
  const text = `${pack.trimEnd()}\n\n---\n\nThe CORE Element Catalog follows (source: docs/CORE_ELEMENT_CATALOG.md).\n\n${catalog.trimEnd()}\n`;
  return { version: KNOWLEDGE_VERSION, sha256: createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text), text };
}

/** The system message: the Instructions, then the Knowledge Pack, marked apart. */
export function systemPromptWithKnowledge(instructions: string, knowledge: LuminaryKnowledge): string {
  return `${instructions.trimEnd()}\n\n---\n\n# Reference: the IDE's Elements (Knowledge Pack ${knowledge.version})\n\n${knowledge.text}`;
}
