// IDS — Identify · Define · Suggest (STP-0002 P17; STP-0005 P2, plan rev16 F2, F2b, F2c, F3).
// The response returned to the sender of an incoherent message: what the message is saying
// (Identify), the incoherence the checks recorded (Define), and a possible point the sender
// could re-examine (Suggest). There is no Decide, Correct or Enforce layer: the response is
// offered, and the sender chooses what to do with it.
//
// The embedded model writes Identify and Suggest (an injected IdsWriter); it has no other
// role. Define is written here from what the checks recorded, so it states exactly what is
// and can never misstate a reading or invent a fact. Identify and Define are IS conditions,
// so only Suggest is screened, by the IDS PIM (ids-pim.ts). A Suggest with a finding is rewritten at most twice, then withheld. No part
// of the response may repeat the message's own text (no echo).
//
// Failures fail closed. If the embedded model is unavailable, times out or returns an
// unusable response, IDS may retry once for the whole response; after that the result is
// ids_error and nothing partial is returned (F2b). If the IDS PIM itself fails on a draft,
// that draft is withheld and Identify and Define return with a note (F2c). Neither uses up a
// revision loop or a Suggest rewrite.

import { thresholdFor, type IrgReading } from './irg.js';
import { IDS_PIM_RULESET_VERSION, screenIdsPim, type IdsPimFinding } from './ids-pim.js';
import type { PimFinding } from './pim.js';
import { pickSuggest, suggestOptions, SUGGEST_LIBRARY_VERSION, type SuggestOption } from './ids-suggest.js';

export interface IdsObservation {
  identify: string;
  define: string[];
  /** Empty when every Suggest draft was withheld; `suggestNote` then says why. */
  suggest: string[];
  suggestNote?: string;
}

export interface IdsInput {
  /** The incoherent message's text: an Architect message or a Luminary reply. */
  reply: string;
  pimFindings: PimFinding[];
  /** Null when a PIM catch (or the structural gate) sent the message to IDS before the IRG read it. */
  irg: IrgReading | null;
  /** Who wrote the message, so the response is addressed to its own writer. */
  from?: 'architect' | 'luminary';
}

export interface IdsWriteRequest extends IdsInput {
  /** True when this call is the one bounded service retry for this response. */
  retry: boolean;
  /** Set on a Suggest rewrite: the previous draft and the IDS PIM findings on it. */
  rewrite?: { previousSuggest: string[]; findings: IdsPimFinding[] };
  /** On the retry: why the previous answer could not be used. At temperature 0 the same prompt gives the same answer. */
  previousFailure?: string;
  /** Library mode: the approved Suggest lines the model may pick from, by id. */
  suggestOptions?: SuggestOption[];
}

/** The embedded model. Returns `unknown` so its payload is validated. */
export interface IdsWriter {
  write(request: IdsWriteRequest): Promise<unknown>;
}

export const SUGGEST_REWRITE_LIMIT = 2;
export const IDS_TIMEOUT_MS = 60_000;
export const IDS_RETRY_DELAY_MS = 2_000;
export const NO_SUGGESTION_PASSED = 'No suggestion passed its checks.';
export const NO_SUGGESTION_CHECKED = 'No suggestion could be checked.';

export interface IdsDraft {
  suggest: string[];
  findings: IdsPimFinding[];
  /** True only for the draft returned to the sender. Every other draft is "not shown as guidance". */
  shown: boolean;
  /** Set when the IDS PIM could not check this draft (F2c). */
  idsPimError?: string;
}

export interface IdsFailure {
  retry: boolean;
  reason: string;
}

export type IdsResult =
  | { ok: true; observation: IdsObservation; drafts: IdsDraft[]; idsPimVersion: string; failures: IdsFailure[]; suggestLibrary?: { version: string; picked: string[]; fellBack: boolean } }
  | { ok: false; message: string; failures: IdsFailure[] };

export interface RunIdsOptions {
  /**
   * 'library' (the default): the model picks Suggest from the approved lines (ids-suggest.ts).
   * 'model': the model writes Suggest, screened and rewritten by the IDS PIM (the earlier design).
   */
  suggest?: 'library' | 'model';
  timeoutMs?: number;
  retryDelayMs?: number;
  /** Injected for tests (F2c). Defaults to the IDS PIM. */
  screen?: (text: string) => IdsPimFinding[];
}

export const IDS_ERROR_MESSAGE = 'The message was not sent, and IDS could not respond.';

class IdsUnusable extends Error {}

/** A list of non-blank strings. A single string is read as a list of one; small models often drop the brackets. */
function readList(value: unknown): string[] | null {
  const items = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(items) || !items.every((item) => typeof item === 'string')) return null;
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

/** Why an untrusted writer payload is not a complete answer, or null when it is one. Names parts, never content. */
export function unusableReason(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'the response is not a JSON object';
  const record = raw as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof record.identify !== 'string') problems.push(record.identify === undefined ? 'identify is missing' : 'identify is not text');
  else if (record.identify.trim().length === 0) problems.push('identify is empty');
  const suggest = readList(record.suggest);
  if (record.suggest === undefined) problems.push('suggest is missing');
  else if (!suggest) problems.push('suggest is not a list of text');
  else if (suggest.length === 0) problems.push('suggest is empty');
  return problems.length > 0 ? problems.join(', ') : null;
}

/**
 * Define, from what the checks recorded: the pattern screen's findings, or every virtue the
 * gauge read below its threshold, or the structural check. No model writes it.
 */
export function defineFromChecks(input: Pick<IdsInput, 'pimFindings' | 'irg'>): string[] {
  if (input.pimFindings.length > 0) {
    return [...new Set(input.pimFindings.map((f) => `The pattern screen recorded ${f.category.replace(/_/g, ' ')}.`))];
  }
  if (input.irg && input.irg.belowThreshold.length > 0) {
    const irg = input.irg;
    return irg.belowThreshold.map((v) => `${v} reads ${irg.readings[v].toFixed(1)}, below the threshold of ${thresholdFor(irg.threshold, v)}.`);
  }
  return ['The structural check recorded the message as not well-formed.'];
}

/** Validate an untrusted writer payload. Returns null when it is not a complete answer. Define is filled in by runIds(). */
export function validateObservation(raw: unknown): IdsObservation | null {
  if (unusableReason(raw) !== null) return null;
  const record = raw as Record<string, unknown>;
  return { identify: (record.identify as string).trim(), define: [], suggest: readList(record.suggest)! };
}

function readSuggest(raw: unknown): string[] | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const items = readList((raw as Record<string, unknown>).suggest);
  return items && items.length > 0 ? items : null;
}

const ABOVE = /\b(?:above|over|exceed(?:s|ed|ing)?|meet(?:s|ing)?|met|pass(?:es|ed)?|within)\b/i;
const NEGATED_ABOVE = /\b(?:not|never|n't)\s+(?:\w+\s+)?(?:above|over|exceed(?:s|ed|ing)?|meet(?:s|ing)?|met|pass(?:es|ed)?|within)\b/i;

/**
 * True when a sentence names a virtue the gauge read below its threshold and says that it
 * was above, met or passed it. Define states what is, so a misstated reading makes the
 * response unusable rather than shown.
 */
export function misstatesReadings(text: string, irg: IrgReading | null): boolean {
  if (!irg || irg.belowThreshold.length === 0) return false;
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    if (!/threshold/i.test(sentence) || !ABOVE.test(sentence) || NEGATED_ABOVE.test(sentence)) continue;
    if (irg.belowThreshold.some((virtue) => new RegExp(`\\b${virtue}\\b`, 'i').test(sentence))) return true;
  }
  return false;
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const ECHO_WORDS = 6;
const ECHO_MIN_CHARS = 12;

/**
 * No echo: true when `text` repeats the message — the whole message (when it is at least a
 * dozen characters), or any run of six consecutive words from it.
 */
export function echoes(text: string, message: string): boolean {
  const haystack = normalize(text);
  const needle = normalize(message);
  if (needle.length >= ECHO_MIN_CHARS && haystack.includes(needle)) return true;
  const words = needle.split(' ').filter(Boolean);
  for (let i = 0; i + ECHO_WORDS <= words.length; i += 1) {
    if (haystack.includes(words.slice(i, i + ECHO_WORDS).join(' '))) return true;
  }
  return false;
}

const allText = (observation: Pick<IdsObservation, 'identify' | 'define' | 'suggest'>) =>
  [observation.identify, ...observation.define, ...observation.suggest].join('\n');

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`IDS embedded model timed out after ${ms} ms.`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Run IDS for one incoherent message. */
export async function runIds(input: IdsInput, writer: IdsWriter | undefined, options: RunIdsOptions = {}): Promise<IdsResult> {
  const failures: IdsFailure[] = [];
  if (!writer) {
    failures.push({ retry: false, reason: 'The IDS embedded model is not configured.' });
    return { ok: false, message: IDS_ERROR_MESSAGE, failures };
  }
  const timeoutMs = options.timeoutMs ?? IDS_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? IDS_RETRY_DELAY_MS;
  const screen = options.screen ?? screenIdsPim;
  let retryUsed = false;

  // One model call, with the response's single service retry (F2b): the limit counts
  // responses, not calls, so once the retry is used any later failure ends the response.
  async function call<T>(rewrite: IdsWriteRequest['rewrite'], read: (raw: unknown) => T, extra: Partial<IdsWriteRequest> = {}): Promise<T> {
    for (;;) {
      const retry = failures.length > 0 && !retryUsed ? (retryUsed = true) : false;
      const previousFailure = retry ? failures[failures.length - 1].reason : undefined;
      try {
        const raw = await withTimeout(writer!.write({ ...input, ...extra, retry, ...(rewrite ? { rewrite } : {}), ...(previousFailure ? { previousFailure } : {}) }), timeoutMs);
        return read(raw);
      } catch (error) {
        failures.push({ retry, reason: error instanceof Error ? error.message : 'IDS embedded model failed.' });
        if (retryUsed) throw error;
        await wait(retryDelayMs);
      }
    }
  }

  if ((options.suggest ?? 'library') === 'library') return runLibrary(input, call, screen, failures);

  let observation: IdsObservation;
  try {
    observation = await call(undefined, (raw) => {
      const reason = unusableReason(raw);
      if (reason) throw new IdsUnusable(`IDS embedded model returned an unusable response (${reason}).`);
      const valid = { ...validateObservation(raw)!, define: defineFromChecks(input) };
      if (echoes(allText(valid), input.reply)) throw new IdsUnusable('IDS embedded model response repeats the message text (no echo).');
      if (misstatesReadings(allText(valid), input.irg)) throw new IdsUnusable('IDS embedded model response misstates a gauge reading (says a reading below its threshold was above it).');
      return valid;
    });
  } catch {
    return { ok: false, message: IDS_ERROR_MESSAGE, failures };
  }

  const drafts: IdsDraft[] = [];
  let suggest = observation.suggest;
  for (let rewrites = 0; ; rewrites += 1) {
    let findings: IdsPimFinding[];
    try {
      findings = screen(suggest.join('\n'));
    } catch (error) {
      // F2c: an unchecked draft is never shown; no rewrite is asked for.
      drafts.push({ suggest, findings: [], shown: false, idsPimError: error instanceof Error ? error.message : 'IDS PIM failed.' });
      return { ok: true, observation: { ...observation, suggest: [], suggestNote: NO_SUGGESTION_CHECKED }, drafts, idsPimVersion: IDS_PIM_RULESET_VERSION, failures };
    }
    if (findings.length === 0) {
      drafts.push({ suggest, findings, shown: true });
      return { ok: true, observation: { ...observation, suggest }, drafts, idsPimVersion: IDS_PIM_RULESET_VERSION, failures };
    }
    drafts.push({ suggest, findings, shown: false });
    if (rewrites >= SUGGEST_REWRITE_LIMIT) {
      return { ok: true, observation: { ...observation, suggest: [], suggestNote: NO_SUGGESTION_PASSED }, drafts, idsPimVersion: IDS_PIM_RULESET_VERSION, failures };
    }
    const previousSuggest = suggest;
    try {
      suggest = await call({ previousSuggest, findings }, (raw) => {
        const next = readSuggest(raw);
        if (!next) throw new IdsUnusable('IDS embedded model returned an unusable Suggest rewrite.');
        if (echoes(next.join('\n'), input.reply)) throw new IdsUnusable('IDS embedded model rewrite repeats the message text (no echo).');
        return next;
      });
    } catch {
      return { ok: false, message: IDS_ERROR_MESSAGE, failures };
    }
  }
}

type Call = <T>(rewrite: IdsWriteRequest['rewrite'], read: (raw: unknown) => T, extra?: Partial<IdsWriteRequest>) => Promise<T>;

/**
 * Library mode: the model writes Identify and picks Suggest lines by id; Define comes from the
 * checks. No Suggest text is model-written, so there is nothing to rewrite. The IDS PIM still
 * screens the shown lines as a guard against a bad library edit; a flagged line is withheld.
 */
async function runLibrary(input: IdsInput, call: Call, screen: (text: string) => IdsPimFinding[], failures: IdsFailure[]): Promise<IdsResult> {
  const offered = suggestOptions(input);
  let answer: { identify: string; lines: string[]; picked: string[]; fellBack: boolean };
  try {
    answer = await call(undefined, (raw) => {
      const record = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      if (!record) throw new IdsUnusable('IDS embedded model returned an unusable response (the response is not a JSON object).');
      if (typeof record.identify !== 'string' || record.identify.trim().length === 0) {
        throw new IdsUnusable(`IDS embedded model returned an unusable response (identify is ${record.identify === undefined ? 'missing' : 'empty or not text'}).`);
      }
      const identify = record.identify.trim();
      if (echoes(identify, input.reply)) throw new IdsUnusable('IDS embedded model response repeats the message text (no echo).');
      if (misstatesReadings(identify, input.irg)) throw new IdsUnusable('IDS embedded model response misstates a gauge reading (says a reading below its threshold was above it).');
      return { identify, ...pickSuggest(offered, record.pick) };
    }, { suggestOptions: offered });
  } catch {
    return { ok: false, message: IDS_ERROR_MESSAGE, failures };
  }
  const define = defineFromChecks(input);
  const suggestLibrary = { version: SUGGEST_LIBRARY_VERSION, picked: answer.picked, fellBack: answer.fellBack };
  let findings: IdsPimFinding[];
  try {
    findings = screen(answer.lines.join('\n'));
  } catch (error) {
    const drafts = [{ suggest: answer.lines, findings: [], shown: false, idsPimError: error instanceof Error ? error.message : 'IDS PIM failed.' }];
    return { ok: true, observation: { identify: answer.identify, define, suggest: [], suggestNote: NO_SUGGESTION_CHECKED }, drafts, idsPimVersion: IDS_PIM_RULESET_VERSION, failures, suggestLibrary };
  }
  const shown = findings.length === 0;
  const observation: IdsObservation = shown
    ? { identify: answer.identify, define, suggest: answer.lines }
    : { identify: answer.identify, define, suggest: [], suggestNote: NO_SUGGESTION_PASSED };
  return { ok: true, observation, drafts: [{ suggest: answer.lines, findings, shown }], idsPimVersion: IDS_PIM_RULESET_VERSION, failures, suggestLibrary };
}

/**
 * The prompt that returns an IDS response to the Luminary as context for a re-formed reply.
 * The response is offered, not imposed: the Luminary may re-examine its reply, never comply.
 */
export function composeRevisionPrompt(originalPrompt: string, previousReply: string, observation: IdsObservation): string {
  const lines = [
    'Your previous reply was returned through IDS. Its response follows.',
    `Identify: ${observation.identify}`,
    ...observation.define.map((item) => `Define: ${item}`),
    ...observation.suggest.map((item) => `Suggest: ${item}`),
    ...(observation.suggestNote ? [`Suggest: ${observation.suggestNote}`] : []),
    '',
    'Previous reply:',
    previousReply,
    '',
    'Original prompt:',
    originalPrompt,
    '',
    'You may re-examine your reply to the original prompt with this response in mind.',
  ];
  return lines.join('\n');
}
