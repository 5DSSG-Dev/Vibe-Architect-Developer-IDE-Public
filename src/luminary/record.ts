// The Luminary's side of the record (STP-0002 P19): every request, result, accept and decline is
// appended to the IDE's existing evidence record, the one Work Request receipts already use. The
// gateway keeps its own ledger for coding tasks as well, because only a record the server writes can
// stop a merge when the Architect's approval was not written down first; this record is the
// Architect's full trail of what the Luminary was asked and said.

import { appendLuminaryExchangeEvidence, type LuminaryExchange, type LuminaryExchangeEvent } from '../engine/evidenceArchive';
import { sha256Hex } from '../engine/workRequestRuntime';

const EXCERPT_CHARS = 280;

/** One conversation per page visit; every exchange in it carries this id. */
export const conversationId = globalThis.crypto.randomUUID();

/** A short excerpt plus the hash of the whole text, so the record binds text it does not repeat. */
export async function textEvidence(text: string): Promise<{ excerpt: string; sha256: string; chars: number }> {
  return { excerpt: text.length > EXCERPT_CHARS ? `${text.slice(0, EXCERPT_CHARS)}…` : text, sha256: await sha256Hex(text), chars: text.length };
}

/**
 * Append one exchange. Returns null when recorded, or the reason it was not, so the conversation can
 * say so plainly instead of implying a record exists.
 */
export async function recordExchange(event: LuminaryExchangeEvent, detail: LuminaryExchange['detail']): Promise<string | null> {
  try {
    await appendLuminaryExchangeEvidence({ exchangeId: globalThis.crypto.randomUUID(), event, conversationId, detail });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'The record could not be written.';
  }
}
