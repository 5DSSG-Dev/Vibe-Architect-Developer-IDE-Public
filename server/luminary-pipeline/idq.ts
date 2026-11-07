// IDQ — Identify · Define · Question (STP-0002 P17; STP-0005 P2, plan rev16 F2, F2b, F2c, F3).
// The response returned to the sender of an incoherent message: what the message is saying
// (Identify), the incoherence the checks recorded (Define), and a possible point the sender
// could re-examine (Question). There is no Decide, Correct or Enforce layer: the response is
// offered, and the sender chooses what to do with it.
//
// The embedded model writes all three parts (an injected IdqWriter); it has no other role.
// Identify and Define are IS conditions, so only Question is screened, by the IDQ PIM
// (idq-pim.ts). A Question with a finding is rewritten at most twice, then withheld. No part
// of the response may repeat the message's own text (no echo).
//
// Failures fail closed. If the embedded model is unavailable, times out or returns an
// unusable response, IDQ may retry once for the whole response; after that the result is
// idq_error and nothing partial is returned (F2b). If the IDQ PIM itself fails on a draft,
// that draft is withheld and Identify and Define return with a note (F2c). Neither uses up a
// revision loop or a Question rewrite.

import { thresholdFor, type IrgReading } from './irg.js';
import { IDQ_PIM_RULESET_VERSION, screenIdqPim, type IdqPimFinding } from './idq-pim.js';
import type { PimFinding } from './pim.js';

export interface IdqObservation {
  identify: string;
  define: string[];
  /** Empty when every Question draft was withheld; `questionNote` then says why. */
  question: string[];
  questionNote?: string;
}

export interface IdqInput {
  /** The incoherent message's text: an Architect message or a Luminary reply. */
  reply: string;
  pimFindings: PimFinding[];
  /** Null when a PIM catch (or the structural gate) sent the message to IDQ before the IRG read it. */
  irg: IrgReading | null;
}

export interface IdqWriteRequest extends IdqInput {
  /** True when this call is the one bounded service retry for this response. */
  retry: boolean;
  /** Set on a Question rewrite: the previous draft and the IDQ PIM findings on it. */
  rewrite?: { previousQuestion: string[]; findings: IdqPimFinding[] };
}

/** The embedded model. Returns `unknown` so its payload is validated. */
export interface IdqWriter {
  write(request: IdqWriteRequest): Promise<unknown>;
}

export const QUESTION_REWRITE_LIMIT = 2;
export const IDQ_TIMEOUT_MS = 60_000;
export const IDQ_RETRY_DELAY_MS = 2_000;
export const NO_QUESTION_PASSED = 'No question passed its checks.';
export const NO_QUESTION_CHECKED = 'No question could be checked.';

export interface IdqDraft {
  question: string[];
  findings: IdqPimFinding[];
  /** True only for the draft returned to the sender. Every other draft is "not shown as guidance". */
  shown: boolean;
  /** Set when the IDQ PIM could not check this draft (F2c). */
  idqPimError?: string;
}

export interface IdqFailure {
  retry: boolean;
  reason: string;
}

export type IdqResult =
  | { ok: true; observation: IdqObservation; drafts: IdqDraft[]; idqPimVersion: string; failures: IdqFailure[] }
  | { ok: false; message: string; failures: IdqFailure[] };

export interface RunIdqOptions {
  timeoutMs?: number;
  retryDelayMs?: number;
  /** Injected for tests (F2c). Defaults to the IDQ PIM. */
  screen?: (text: string) => IdqPimFinding[];
}

export const IDQ_ERROR_MESSAGE = 'The message was not sent, and IDQ could not respond.';

class IdqUnusable extends Error {}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const nonBlank = (items: string[]) => items.map((item) => item.trim()).filter((item) => item.length > 0);
const areQuestions = (items: string[]) => items.every((item) => /[?？]$/.test(item));

/** Define comes from recorded conditions, as in the preserved IDQ implementation. */
export function recordedDefinition(input: IdqInput): string[] {
  if (input.pimFindings.length > 0) {
    return input.pimFindings.map((finding) => `PIM recorded ${finding.category.replace(/_/g, ' ')} (${finding.patternId}).`);
  }
  if (input.irg) {
    return input.irg.belowThreshold.map((virtue) => `${virtue} reads ${input.irg!.readings[virtue]}, below the threshold of ${thresholdFor(input.irg!.threshold, virtue)}.`);
  }
  return ['The structural check recorded the message as not well-formed.'];
}

/** Validate an untrusted writer payload. Returns null when it is not a well-formed, complete observation. */
export function validateObservation(raw: unknown): IdqObservation | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.identify !== 'string' || record.identify.trim().length === 0) return null;
  if (!isStringArray(record.define) || !isStringArray(record.question)) return null;
  const define = nonBlank(record.define);
  const question = nonBlank(record.question);
  if (define.length === 0 || question.length === 0 || !areQuestions(question)) return null;
  return { identify: record.identify.trim(), define, question };
}

function readQuestion(raw: unknown): string[] | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const question = (raw as Record<string, unknown>).question;
  if (!isStringArray(question)) return null;
  const items = nonBlank(question);
  return items.length > 0 && areQuestions(items) ? items : null;
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

const allText = (observation: Pick<IdqObservation, 'identify' | 'define' | 'question'>) =>
  [observation.identify, ...observation.define, ...observation.question].join('\n');

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`IDQ embedded model timed out after ${ms} ms.`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Run IDQ for one incoherent message. */
export async function runIdq(input: IdqInput, writer: IdqWriter | undefined, options: RunIdqOptions = {}): Promise<IdqResult> {
  const failures: IdqFailure[] = [];
  if (!writer) {
    failures.push({ retry: false, reason: 'The IDQ embedded model is not configured.' });
    return { ok: false, message: IDQ_ERROR_MESSAGE, failures };
  }
  const timeoutMs = options.timeoutMs ?? IDQ_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? IDQ_RETRY_DELAY_MS;
  const screen = options.screen ?? screenIdqPim;
  let retryUsed = false;

  // One model call, with the response's single service retry (F2b): the limit counts
  // responses, not calls, so once the retry is used any later failure ends the response.
  async function call<T>(rewrite: IdqWriteRequest['rewrite'], read: (raw: unknown) => T): Promise<T> {
    for (;;) {
      const retry = failures.length > 0 && !retryUsed ? (retryUsed = true) : false;
      try {
        const raw = await withTimeout(writer!.write({ ...input, retry, ...(rewrite ? { rewrite } : {}) }), timeoutMs);
        return read(raw);
      } catch (error) {
        failures.push({ retry, reason: error instanceof Error ? error.message : 'IDQ embedded model failed.' });
        if (retryUsed) throw error;
        await wait(retryDelayMs);
      }
    }
  }

  let observation: IdqObservation;
  try {
    observation = await call(undefined, (raw) => {
      const valid = validateObservation(raw);
      if (!valid) throw new IdqUnusable('IDQ embedded model returned an unusable response (missing or empty part).');
      if (echoes(allText(valid), input.reply)) throw new IdqUnusable('IDQ embedded model response repeats the message text (no echo).');
      return { ...valid, define: recordedDefinition(input) };
    });
  } catch {
    return { ok: false, message: IDQ_ERROR_MESSAGE, failures };
  }

  const drafts: IdqDraft[] = [];
  let question = observation.question;
  for (let rewrites = 0; ; rewrites += 1) {
    let findings: IdqPimFinding[];
    try {
      findings = screen(question.join('\n'));
    } catch (error) {
      // F2c: an unchecked draft is never shown; no rewrite is asked for.
      drafts.push({ question, findings: [], shown: false, idqPimError: error instanceof Error ? error.message : 'IDQ PIM failed.' });
      return { ok: true, observation: { ...observation, question: [], questionNote: NO_QUESTION_CHECKED }, drafts, idqPimVersion: IDQ_PIM_RULESET_VERSION, failures };
    }
    if (findings.length === 0) {
      drafts.push({ question, findings, shown: true });
      return { ok: true, observation: { ...observation, question }, drafts, idqPimVersion: IDQ_PIM_RULESET_VERSION, failures };
    }
    drafts.push({ question, findings, shown: false });
    if (rewrites >= QUESTION_REWRITE_LIMIT) {
      return { ok: true, observation: { ...observation, question: [], questionNote: NO_QUESTION_PASSED }, drafts, idqPimVersion: IDQ_PIM_RULESET_VERSION, failures };
    }
    const previousQuestion = question;
    try {
      question = await call({ previousQuestion, findings }, (raw) => {
        const next = readQuestion(raw);
        if (!next) throw new IdqUnusable('IDQ embedded model returned an unusable Question rewrite.');
        if (echoes(next.join('\n'), input.reply)) throw new IdqUnusable('IDQ embedded model rewrite repeats the message text (no echo).');
        return next;
      });
    } catch {
      return { ok: false, message: IDQ_ERROR_MESSAGE, failures };
    }
  }
}

/**
 * The prompt that returns an IDQ response to the Luminary as context for a re-formed reply.
 * The response is offered, not imposed: the Luminary may re-examine its reply, never comply.
 */
export function composeRevisionPrompt(originalPrompt: string, previousReply: string, observation: IdqObservation): string {
  const lines = [
    'Your previous reply was returned through IDQ. Its response follows.',
    `Identify: ${observation.identify}`,
    ...observation.define.map((item) => `Define: ${item}`),
    ...observation.question.map((item) => `Question: ${item}`),
    ...(observation.questionNote ? [`Question: ${observation.questionNote}`] : []),
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
