// AEGIS reply-governance: the fail-closed gate every Luminary model reply passes
// through before it can reach a person (M1.a). It is provider-agnostic — it makes no
// model call — so it can be exercised against fixtures now and enforced ahead of any
// real model wiring (governed first, not wired first).
//
// AEGIS contract: a reply is shown only if it is provably valid. Anything else becomes
// a NAMED Shortfall — never fallback text posing as a real answer (the honest floor).

export type ShortfallCode =
  | 'empty_reply'
  | 'malformed_reply'
  | 'oversized_reply'
  | 'missing_model_id';

export interface GovernedReply {
  /** The model identifier the gateway declares on every reply. */
  modelId: string;
  /** The reply text, preserved exactly as produced. */
  content: string;
}

export interface Shortfall {
  code: ShortfallCode;
  message: string;
  /** The declared model id when it could be read, else null (honest about provenance). */
  modelId: string | null;
}

export type GovernanceResult =
  | { ok: true; reply: GovernedReply }
  | { ok: false; shortfall: Shortfall };

export interface GovernanceOptions {
  /** Maximum reply content size in UTF-8 bytes. Defaults to DEFAULT_MAX_CONTENT_BYTES. */
  maxContentBytes?: number;
}

/** Default reply ceiling (32 KiB), mirroring the gateway's request body limit. */
export const DEFAULT_MAX_CONTENT_BYTES = 32_768;

function shortfall(code: ShortfallCode, message: string, modelId: string | null): GovernanceResult {
  return { ok: false, shortfall: { code, message, modelId } };
}

function readModelId(candidate: Record<string, unknown>): string | null {
  const raw = candidate.modelId;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate a candidate model reply, fail-closed.
 *
 * Returns the governed reply only when the candidate is an object carrying a non-empty
 * declared `modelId` and non-empty `content` within the byte ceiling. Every other case
 * — a non-object, a missing/blank model id, a missing/non-string or empty body, or an
 * oversized body — returns a named Shortfall instead, with the model id when it is known.
 */
export function governReply(candidate: unknown, options: GovernanceOptions = {}): GovernanceResult {
  const maxContentBytes = options.maxContentBytes ?? DEFAULT_MAX_CONTENT_BYTES;

  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return shortfall('malformed_reply', 'Reply is not a structured object.', null);
  }

  const record = candidate as Record<string, unknown>;

  const modelId = readModelId(record);
  if (modelId === null) {
    return shortfall('missing_model_id', 'Reply does not declare a model id.', null);
  }

  const content = record.content;
  if (typeof content !== 'string') {
    return shortfall('malformed_reply', 'Reply content is missing or not a string.', modelId);
  }
  if (content.trim().length === 0) {
    return shortfall('empty_reply', 'Reply content is empty.', modelId);
  }

  const contentBytes = Buffer.byteLength(content, 'utf8');
  if (contentBytes > maxContentBytes) {
    return shortfall(
      'oversized_reply',
      `Reply content is ${contentBytes} bytes, over the ${maxContentBytes}-byte limit.`,
      modelId,
    );
  }

  return { ok: true, reply: { modelId, content } };
}
