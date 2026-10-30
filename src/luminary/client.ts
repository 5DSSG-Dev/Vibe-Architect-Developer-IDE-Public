// The IDE side of the Luminary gateway (STP-0002 P19). Every call goes to the gateway, which holds
// the model, the gauge and the executor; the browser holds no model key. The shared demo key is
// typed by the Architect once and kept for this browser session only.

import type { ExplanationLevel } from './blocks';

export const DEMO_KEY_HEADER = 'x-luminary-demo-key';
const DEMO_KEY_STORAGE = 'vibe-luminary-demo-key';
const LEVEL_STORAGE = 'vibe-luminary-explanation-level';

export interface GovernedReply {
  modelId: string;
  content: string;
}

export interface LineageEntry {
  pass: number;
  stage: 'structural' | 'pim' | 'irg' | 'rbc' | 'ids' | 'ids_error' | 'prism';
}

/** The IDS response returned to the sender of an incoherent message (STP-0005 P2). */
export interface IdsResponse {
  identify: string;
  define: string[];
  suggest: string[];
  suggestNote?: string;
}

export interface Shortfall {
  code: string;
  message: string;
  modelId?: string | null;
  /** On returned_to_sender: the check that flagged the message. */
  flaggedBy?: 'structural' | 'pim' | 'irg';
  /** On returned_to_sender: the IDS response. */
  observation?: IdsResponse;
}

const FLAGGED_BY: Record<NonNullable<Shortfall['flaggedBy']>, string> = {
  structural: 'the structural check',
  pim: 'the pattern screen (PIM)',
  irg: 'the Virtue gauge (IRG)',
};

/** The IDS response in plain lines: what the message is, what was found, and a possible point to re-examine. */
export function describeIdsResponse(shortfall: Shortfall): string {
  const lines = [`Your message was not sent to the Luminary. It was returned through IDS${shortfall.flaggedBy ? ` after ${FLAGGED_BY[shortfall.flaggedBy]}` : ''}.`];
  const ids = shortfall.observation;
  if (ids) {
    lines.push(`Identify: ${ids.identify}`);
    for (const item of ids.define) lines.push(`Define: ${item}`);
    for (const item of ids.suggest) lines.push(`Suggest: ${item}`);
    if (ids.suggestNote) lines.push(`Suggest: ${ids.suggestNote}`);
  }
  return lines.join('\n');
}

export interface CheckResult {
  name: string;
  ok: boolean;
  output: string;
}

export interface CodingTask {
  id: string;
  goal: string;
  allowedFiles: string[];
  modelId: string;
  branch: string;
  commit: string;
  summary: string;
  files: string[];
  /** The whole change; diffComplete is false only when it was too large to show whole. */
  diff: string;
  diffComplete: boolean;
  checks: CheckResult[];
  status: 'proposed' | 'accepted' | 'declined';
}

export interface LuminaryStatus {
  replySource: string;
  gauge: 'configured' | 'not_configured';
  codingTasks: 'on' | 'off' | 'local_only';
  /** The running total for a paid reply source (P21); absent for the stand-in. */
  spend?: { spentUsd: number; ceilingUsd: number; calls: number } | { unreadable: true };
  /** The Knowledge Pack the gateway sends with every question (P23); absent for the stand-in. */
  knowledge?: { version: string; sha256: string; bytes: number };
}

/** The running total in plain words, and whether it has reached the 80% warning. */
export function describeSpend(spend: NonNullable<LuminaryStatus['spend']>): { text: string; warn: boolean } {
  if ('unreadable' in spend) return { text: 'spend record unreadable, so no calls are made', warn: true };
  const { spentUsd, ceilingUsd } = spend;
  return { text: `$${spentUsd.toFixed(2)} of $${ceilingUsd.toFixed(2)} used`, warn: spentUsd >= ceilingUsd * 0.8 };
}

/** Every call resolves to one of these; nothing throws past the client except an abort. */
export type CallResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'key_required' | 'not_configured' | 'unreachable' | 'shortfall'; shortfall: Shortfall; reply?: GovernedReply; lineage?: LineageEntry[] };

export function readDemoKey(): string {
  try {
    return sessionStorage.getItem(DEMO_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveDemoKey(key: string): void {
  try {
    sessionStorage.setItem(DEMO_KEY_STORAGE, key);
  } catch {
    // Private windows may refuse storage; the key then lasts only while the panel is open.
  }
}

export function readLevel(): ExplanationLevel {
  try {
    const stored = localStorage.getItem(LEVEL_STORAGE);
    return stored === 'guided' || stored === 'technical' ? stored : 'plain';
  } catch {
    return 'plain';
  }
}

export function saveLevel(level: ExplanationLevel | null): void {
  try {
    if (level === null) localStorage.removeItem(LEVEL_STORAGE);
    else localStorage.setItem(LEVEL_STORAGE, level);
  } catch {
    // Without storage the level still applies for this visit.
  }
}

async function call<T>(path: string, key: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<CallResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json', [DEMO_KEY_HEADER]: key },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    return { ok: false, kind: 'unreachable', shortfall: { code: 'unreachable', message: 'The IDE gateway could not be reached.' } };
  }
  let body: Record<string, unknown> = {};
  try {
    body = await response.json();
  } catch {
    // A non-JSON answer is reported below as a Shortfall, never shown as a reply.
  }
  if (response.status === 401) return { ok: false, kind: 'key_required', shortfall: { code: 'demo_key_required', message: 'The Luminary needs the demo key.' } };
  if (response.status === 503 && body.error === 'luminary_not_configured') {
    return { ok: false, kind: 'not_configured', shortfall: { code: 'luminary_not_configured', message: 'The Luminary is switched off on this gateway (no demo key is set).' } };
  }
  if (!response.ok) {
    const shortfall = (body.shortfall as Shortfall | undefined) ?? { code: String(body.error ?? response.status), message: `The gateway answered ${response.status}.` };
    return { ok: false, kind: 'shortfall', shortfall, reply: body.reply as GovernedReply | undefined, lineage: body.lineage as LineageEntry[] | undefined };
  }
  return { ok: true, value: body as T };
}

export const luminaryApi = {
  status: (key: string) => call<LuminaryStatus>('/api/luminary/status', key),
  ask: (key: string, prompt: string, signal?: AbortSignal) =>
    call<{ reply: GovernedReply; lineage?: LineageEntry[] }>('/api/luminary/ask', key, { method: 'POST', body: { prompt }, signal }),
  assign: (key: string, task: { goal: string; allowedFiles: string[]; level: ExplanationLevel; mode: string; context: { label: string; text: string }[] }, signal?: AbortSignal) =>
    call<{ reply: GovernedReply; lineage?: LineageEntry[]; task: CodingTask }>('/api/luminary/tasks', key, { method: 'POST', body: task, signal }),
  accept: (key: string, id: string) => call<{ task: CodingTask }>(`/api/luminary/tasks/${encodeURIComponent(id)}/accept`, key, { method: 'POST', body: {} }),
  decline: (key: string, id: string) => call<{ task: CodingTask }>(`/api/luminary/tasks/${encodeURIComponent(id)}/decline`, key, { method: 'POST', body: {} }),
};

/** Plain words for each Shortfall code the gateway can return. */
export function describeShortfall(shortfall: Shortfall): string {
  switch (shortfall.code) {
    case 'upstream_error': return `No model answered. ${shortfall.message}`;
    case 'spend_ceiling': return shortfall.message;
    case 'returned_to_sender': return describeIdsResponse(shortfall);
    case 'gauge_error': return 'Nothing was sent, because the gauge that checks every message is not running.';
    case 'ids_error': return 'The message was not sent, and IDS could not respond.';
    case 'incoherent_after_ids': return 'The reply was returned through IDS twice and still did not read as coherent, so it is not shown.';
    case 'empty_reply': return 'The model sent an empty reply, so nothing is shown.';
    case 'malformed_reply': return 'The model sent a reply the IDE could not read, so nothing is shown.';
    case 'oversized_reply': return 'The reply was too long to show safely.';
    case 'missing_model_id': return 'The reply did not say which model wrote it, so it is not shown.';
    case 'fence': return shortfall.message;
    case 'no_change': return `The Luminary did not propose a usable change. ${shortfall.message}`;
    case 'merge_conflict': return `The change could not join the project, and nothing was changed. ${shortfall.message}`;
    default: return shortfall.message;
  }
}
