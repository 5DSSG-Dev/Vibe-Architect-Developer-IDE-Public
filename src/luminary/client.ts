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
  stage: 'structural' | 'pim' | 'irg' | 'rbc' | 'ids' | 'prism';
}

export interface Shortfall {
  code: string;
  message: string;
  modelId?: string | null;
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
  summary: string;
  files: string[];
  diff: string;
  checks: CheckResult[];
  status: 'proposed' | 'accepted' | 'declined';
}

export interface LuminaryStatus {
  replySource: string;
  gauge: 'configured' | 'not_configured';
  codingTasks: 'on' | 'off' | 'local_only';
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
  assign: (key: string, task: { goal: string; allowedFiles: string[]; level: ExplanationLevel; mode: string }, signal?: AbortSignal) =>
    call<{ reply: GovernedReply; lineage?: LineageEntry[]; task: CodingTask }>('/api/luminary/tasks', key, { method: 'POST', body: task, signal }),
  accept: (key: string, id: string) => call<{ task: CodingTask }>(`/api/luminary/tasks/${encodeURIComponent(id)}/accept`, key, { method: 'POST', body: {} }),
  decline: (key: string, id: string) => call<{ task: CodingTask }>(`/api/luminary/tasks/${encodeURIComponent(id)}/decline`, key, { method: 'POST', body: {} }),
};

/** Plain words for each Shortfall code the gateway can return. */
export function describeShortfall(shortfall: Shortfall): string {
  switch (shortfall.code) {
    case 'upstream_error': return `No model answered. ${shortfall.message}`;
    case 'gauge_error': return 'The reply was held back because the gauge that checks every reply is not running.';
    case 'incoherent_after_ids': return 'The reply was held back: after two tries it still did not read as coherent.';
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
