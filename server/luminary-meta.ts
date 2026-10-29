// The main Meta model reply source for the Luminary (M1.b-2 smoke test): an AskModel backed by
// Meta's Model API (OpenAI-compatible chat completions, Muse Spark). It returns an untrusted
// { modelId, content } candidate; the router governs it and the pipeline gauges it as usual.
//
// Spend is bounded by a file-backed ledger, checked BEFORE every call: a call is refused once
// the call cap is reached or once its worst-case cost would push total spend past the cap. The
// worst case (a generous input estimate plus the full output allowance) is charged up front and
// only lowered to the provider's reported usage after the call returns, so a crash, a timeout or
// a response without usage can never spend more than the ledger shows. An unreadable ledger
// refuses every call. The API key is never logged, echoed or written to the ledger.
//
// P21 makes this the live reply source (LUMINARY_REPLY_SOURCE=meta): the smoke test's call cap is
// lifted and the Architect's overall ceiling (LUMINARY_META_CEILING_USD) is the stop, counted from
// the same ledger, so every earlier call counts toward it.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AskModel } from './luminary-reply-router.js';

export const DEFAULT_META_BASE_URL = 'https://api.meta.ai/v1';
export const DEFAULT_META_MODEL = 'muse-spark-1.3';
export const DEFAULT_META_SPEND_CAP_USD = 0.25;
export const DEFAULT_META_MAX_CALLS = 2;
export const DEFAULT_META_MAX_OUTPUT_TOKENS = 2_000;
export const DEFAULT_META_TIMEOUT_MS = 60_000;
export const DEFAULT_META_LEDGER_PATH = '.luminary/meta-spend.json';
/** Live replies (P21) include code, which needs more room than the smoke test's 2,000 tokens. */
export const DEFAULT_META_LIVE_MAX_OUTPUT_TOKENS = 8_000;

/**
 * Published standard rates in USD per million tokens. Reasoning tokens bill at the output rate.
 * A model missing here cannot be priced, so it cannot be capped, and is refused. The discounted
 * "-contributor" variants are left out on purpose: they let Meta train on prompts and replies,
 * which the Architect has not chosen.
 */
export const META_PRICING_USD_PER_MILLION: Readonly<Record<string, { input: number; output: number }>> = {
  'muse-spark-1.3': { input: 1.25, output: 4.25 },
  'muse-spark-1.1': { input: 1.25, output: 4.25 },
};

/** Characters per token assumed for the up-front input estimate. Real text runs nearer 4; 2 over-charges. */
const ESTIMATE_CHARS_PER_TOKEN = 2;

export class SpendCapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpendCapError';
  }
}

export interface SpendLedgerEntry {
  at: string;
  model: string;
  reservedUsd: number;
  /** Cost from reported usage, or null while in flight or when the provider reported none. */
  actualUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  status: 'reserved' | 'settled' | 'failed';
}

export interface SpendLedgerState {
  capUsd: number;
  maxCalls: number;
  calls: number;
  /** Charged spend: actual where known, the reserved worst case otherwise. */
  spentUsd: number;
  entries: SpendLedgerEntry[];
}

const charged = (entry: SpendLedgerEntry) => entry.actualUsd ?? entry.reservedUsd;

/** A JSON spend ledger on disk. The caps travel with it, so they hold across restarts. */
export class SpendLedger {
  constructor(
    readonly path: string,
    readonly capUsd: number,
    readonly maxCalls: number,
  ) {}

  read(): SpendLedgerState {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { capUsd: this.capUsd, maxCalls: this.maxCalls, calls: 0, spentUsd: 0, entries: [] };
      }
      throw new SpendCapError('Spend ledger cannot be read, so no call is allowed.');
    }
    let parsed: { entries?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new SpendCapError('Spend ledger is not valid JSON, so no call is allowed.');
    }
    if (!Array.isArray(parsed?.entries)) throw new SpendCapError('Spend ledger is malformed, so no call is allowed.');
    const entries = parsed.entries as SpendLedgerEntry[];
    if (!entries.every((e) => Number.isFinite(e?.reservedUsd) && e.reservedUsd >= 0)) {
      throw new SpendCapError('Spend ledger is malformed, so no call is allowed.');
    }
    return {
      capUsd: this.capUsd,
      maxCalls: this.maxCalls,
      calls: entries.length,
      spentUsd: entries.reduce((sum, e) => sum + charged(e), 0),
      entries,
    };
  }

  private write(entries: SpendLedgerEntry[]): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, `${JSON.stringify({ entries }, null, 2)}\n`);
    renameSync(temp, this.path);
  }

  /** Charge the worst case for one call, or refuse. Returns the entry index to settle later. */
  reserve(model: string, worstCaseUsd: number): number {
    const state = this.read();
    if (state.spentUsd >= this.capUsd) {
      throw new SpendCapError(`Your spending ceiling is reached ($${state.spentUsd.toFixed(2)} of $${this.capUsd.toFixed(2)} used), so the Luminary did not ask the model. It answers again once the ceiling is raised.`);
    }
    if (state.calls >= this.maxCalls) {
      throw new SpendCapError(`Meta model call cap reached (${state.calls} of ${this.maxCalls}); no further calls are allowed.`);
    }
    if (state.spentUsd + worstCaseUsd > this.capUsd) {
      throw new SpendCapError(
        `This question could cost up to $${worstCaseUsd.toFixed(4)}, and the spending ceiling would be passed ($${state.spentUsd.toFixed(4)} of $${this.capUsd.toFixed(2)} used), so the Luminary did not ask the model.`,
      );
    }
    const entries = [...state.entries, {
      at: new Date().toISOString(),
      model,
      reservedUsd: worstCaseUsd,
      actualUsd: null,
      inputTokens: null,
      outputTokens: null,
      status: 'reserved' as const,
    }];
    this.write(entries);
    return entries.length - 1;
  }

  /** The running total for the Architect: spent, ceiling and calls, read from disk each time. */
  summary(): { spentUsd: number; ceilingUsd: number; calls: number } {
    const state = this.read();
    return { spentUsd: state.spentUsd, ceilingUsd: this.capUsd, calls: state.calls };
  }

  /** Record the outcome. Usage only ever lowers the charge to the reported cost; it never raises it. */
  settle(index: number, outcome: { inputTokens: number; outputTokens: number; actualUsd: number } | 'failed' | 'no_usage'): void {
    const entries = this.read().entries;
    const entry = entries[index];
    if (!entry) return;
    if (outcome === 'failed') entry.status = 'failed';
    else if (outcome === 'no_usage') entry.status = 'settled';
    else {
      entry.status = 'settled';
      entry.inputTokens = outcome.inputTokens;
      entry.outputTokens = outcome.outputTokens;
      // A reported cost above the reservation is recorded as reported, so the ledger stays honest.
      entry.actualUsd = outcome.actualUsd;
    }
    this.write(entries);
  }
}

export interface MetaAskModelOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /** The Luminary's operating instructions, sent as the system message. */
  systemPrompt?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  ledger: SpendLedger;
  /** Injected for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rate = META_PRICING_USD_PER_MILLION[model];
  if (!rate) throw new SpendCapError(`No published price for model ${model}, so its spend cannot be capped.`);
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

function readUsage(body: unknown): { inputTokens: number; outputTokens: number } | null {
  const usage = (body as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } })?.usage;
  const input = usage?.prompt_tokens;
  const output = usage?.completion_tokens;
  if (typeof input !== 'number' || typeof output !== 'number' || input < 0 || output < 0) return null;
  return { inputTokens: input, outputTokens: output };
}

/** Build the Meta Model API reply source. Every call passes the ledger first. */
export function createMetaAskModel(options: MetaAskModelOptions): AskModel {
  const doFetch = options.fetch ?? fetch;
  const model = options.model ?? DEFAULT_META_MODEL;
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_META_MAX_OUTPUT_TOKENS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_META_TIMEOUT_MS;
  const url = `${(options.baseUrl ?? DEFAULT_META_BASE_URL).replace(/\/+$/, '')}/chat/completions`;
  // Fails fast for an unpriced model, before any request is made.
  costUsd(model, 0, 0);

  return async (prompt: string) => {
    const messages = [
      ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
      { role: 'user', content: prompt },
    ];
    const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const worstCase = costUsd(model, Math.ceil(inputChars / ESTIMATE_CHARS_PER_TOKEN) + 64, maxOutputTokens);
    const index = options.ledger.reserve(model, worstCase);

    let response: Response;
    try {
      response = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${options.apiKey}` },
        body: JSON.stringify({ model, messages, max_tokens: maxOutputTokens }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // The request may still have been billed, so the worst-case charge stays.
      options.ledger.settle(index, 'failed');
      throw new Error(`Meta model unreachable: ${error instanceof Error ? error.message : 'request failed'}.`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const usage = readUsage(body);
    options.ledger.settle(index, usage ? { ...usage, actualUsd: costUsd(model, usage.inputTokens, usage.outputTokens) } : response.ok ? 'no_usage' : 'failed');

    if (!response.ok) throw new Error(`Meta model returned HTTP ${response.status}.`);
    const choice = (body as { model?: unknown; choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0];
    const declared = (body as { model?: unknown })?.model;
    // Untrusted: governReply() decides whether this is a reply.
    return {
      modelId: typeof declared === 'string' && declared.trim() ? declared : model,
      content: choice?.message?.content,
    };
  };
}

/** Read the Meta model settings from the environment. Returns undefined when no key is set. */
export function parseMetaModelEnv(env: NodeJS.ProcessEnv): Omit<MetaAskModelOptions, 'fetch' | 'systemPrompt'> | undefined {
  const apiKey = env.LUMINARY_META_API_KEY?.trim();
  if (!apiKey) return undefined;
  const positive = (name: string, fallback: number, integer: boolean) => {
    const raw = env[name]?.trim();
    const value = raw ? Number(raw) : fallback;
    if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
      throw new Error(`${name} must be a positive ${integer ? 'integer' : 'number'}`);
    }
    return value;
  };
  const capUsd = positive('LUMINARY_META_SPEND_CAP_USD', DEFAULT_META_SPEND_CAP_USD, false);
  const maxCalls = positive('LUMINARY_META_MAX_CALLS', DEFAULT_META_MAX_CALLS, true);
  return {
    apiKey,
    model: env.LUMINARY_META_MODEL?.trim() || DEFAULT_META_MODEL,
    baseUrl: env.LUMINARY_META_BASE_URL?.trim() || DEFAULT_META_BASE_URL,
    maxOutputTokens: positive('LUMINARY_META_MAX_OUTPUT_TOKENS', DEFAULT_META_MAX_OUTPUT_TOKENS, true),
    timeoutMs: positive('LUMINARY_META_TIMEOUT_MS', DEFAULT_META_TIMEOUT_MS, true),
    ledger: new SpendLedger(env.LUMINARY_META_LEDGER_PATH?.trim() || DEFAULT_META_LEDGER_PATH, capUsd, maxCalls),
  };
}

/**
 * Read the live Meta reply source settings (P21). The key and the Architect's ceiling are both
 * required: without a ceiling the spend could not be bounded, so the gateway refuses to start.
 */
export function parseMetaLiveEnv(env: NodeJS.ProcessEnv): Omit<MetaAskModelOptions, 'fetch' | 'systemPrompt'> {
  const apiKey = env.LUMINARY_META_API_KEY?.trim();
  if (!apiKey) throw new Error('LUMINARY_REPLY_SOURCE=meta needs LUMINARY_META_API_KEY in .env');
  const rawCeiling = env.LUMINARY_META_CEILING_USD?.trim();
  const ceiling = rawCeiling ? Number(rawCeiling) : NaN;
  if (!Number.isFinite(ceiling) || ceiling <= 0) throw new Error('LUMINARY_REPLY_SOURCE=meta needs LUMINARY_META_CEILING_USD, the Architect\'s spending ceiling in dollars');
  const positiveInteger = (name: string, fallback: number) => {
    const raw = env[name]?.trim();
    const value = raw ? Number(raw) : fallback;
    if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
    return value;
  };
  return {
    apiKey,
    model: env.LUMINARY_META_MODEL?.trim() || DEFAULT_META_MODEL,
    baseUrl: env.LUMINARY_META_BASE_URL?.trim() || DEFAULT_META_BASE_URL,
    maxOutputTokens: positiveInteger('LUMINARY_META_MAX_OUTPUT_TOKENS', DEFAULT_META_LIVE_MAX_OUTPUT_TOKENS),
    timeoutMs: positiveInteger('LUMINARY_META_TIMEOUT_MS', DEFAULT_META_TIMEOUT_MS),
    ledger: new SpendLedger(env.LUMINARY_META_LEDGER_PATH?.trim() || DEFAULT_META_LEDGER_PATH, ceiling, Number.POSITIVE_INFINITY),
  };
}
