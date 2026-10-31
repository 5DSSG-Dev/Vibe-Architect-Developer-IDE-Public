// The IDS writer on Meta's Model API (Tracey's choice, 2026-10-31). The local llama3.2:3b wrote
// Suggest lines that guessed at feelings and invented facts, and a larger local model was too slow
// on the Architect's PC. The Virtue gauge stays local; only a message that did not pass its checks
// is sent here, to be described. The prompt is the same one the local writer uses, and runIds()
// still validates, echo-checks and screens whatever comes back. Every call passes its own spend
// ledger first, apart from the Luminary's, and the key is never logged or echoed.

import { createMetaAskModel, DEFAULT_META_BASE_URL, SpendLedger, type MetaAskModelOptions } from '../luminary-meta.js';
import type { AskModel } from '../luminary-reply-router.js';
import { buildIdsPrompt } from './ids-local.js';
import type { IdsWriter } from './ids.js';

export const IDS_META_MODEL = 'muse-spark-1.3';
export const IDS_META_LEDGER_PATH = '.luminary/ids-meta-spend.json';
export const IDS_META_CEILING_USD = 2;
export const IDS_META_MAX_CALLS = 1_000;
/**
 * Room for the model's reasoning, which bills as output, plus the short JSON answer. The first
 * live run (2026-10-31) spent all of 1,500 tokens reasoning and returned no answer on both tries;
 * at the published rate 6,000 output tokens cost under three cents. The IDQRA trial, with three
 * parts to write, ran out at 6,000 on three of seven first tries; 12,000 costs about five cents.
 */
export const IDS_META_MAX_OUTPUT_TOKENS = 12_000;

export type MetaIdsWriterOptions = Omit<MetaAskModelOptions, 'systemPrompt' | 'providerName'>;

/** Small models often wrap JSON in a code fence. */
function readJson(content: string): unknown {
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('IDS writer response is not JSON.');
  }
}

export function createMetaIdsWriter(options: MetaIdsWriterOptions): IdsWriter {
  // One client per system prompt (library mode and model mode differ), sharing one ledger.
  const clients = new Map<string, AskModel>();
  const allowance = options.maxOutputTokens ?? IDS_META_MAX_OUTPUT_TOKENS;
  return {
    write: async (request) => {
      const { system, user } = buildIdsPrompt(request);
      let ask = clients.get(system);
      if (!ask) {
        ask = createMetaAskModel({ ...options, maxOutputTokens: allowance, systemPrompt: system, providerName: 'IDS writer (Meta model)' });
        clients.set(system, ask);
      }
      const answer = (await ask(user)) as { content?: unknown; finishReason?: unknown };
      if (typeof answer?.content !== 'string' || !answer.content.trim()) {
        throw new Error(
          answer?.finishReason === 'length'
            ? `IDS writer used its whole output allowance (${allowance} tokens) before answering.`
            : 'IDS writer response has no message content.',
        );
      }
      return readJson(answer.content);
    },
  };
}

/**
 * Read the Meta IDS writer's settings. Returns undefined unless IDS_WRITER=meta. The key is the
 * Meta Model API key already in .env (IDS_META_API_KEY overrides it); the ceiling and call cap
 * have defaults, since one IDS call costs about a tenth of a cent.
 */
export function parseMetaIdsEnv(env: NodeJS.ProcessEnv): MetaIdsWriterOptions | undefined {
  if (env.IDS_WRITER?.trim() !== 'meta') return undefined;
  const apiKey = env.IDS_META_API_KEY?.trim() || env.LUMINARY_META_API_KEY?.trim();
  if (!apiKey) throw new Error('IDS_WRITER=meta needs LUMINARY_META_API_KEY (or IDS_META_API_KEY) in .env');
  const positive = (name: string, fallback: number, integer: boolean) => {
    const raw = env[name]?.trim();
    const value = raw ? Number(raw) : fallback;
    if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
      throw new Error(`${name} must be a positive ${integer ? 'integer' : 'number'}`);
    }
    return value;
  };
  return {
    apiKey,
    model: env.IDS_META_MODEL?.trim() || IDS_META_MODEL,
    baseUrl: env.LUMINARY_META_BASE_URL?.trim() || DEFAULT_META_BASE_URL,
    maxOutputTokens: positive('IDS_META_MAX_OUTPUT_TOKENS', IDS_META_MAX_OUTPUT_TOKENS, true),
    ledger: new SpendLedger(
      env.IDS_META_LEDGER_PATH?.trim() || IDS_META_LEDGER_PATH,
      positive('IDS_META_CEILING_USD', IDS_META_CEILING_USD, false),
      positive('IDS_META_MAX_CALLS', IDS_META_MAX_CALLS, true),
    ),
  };
}
