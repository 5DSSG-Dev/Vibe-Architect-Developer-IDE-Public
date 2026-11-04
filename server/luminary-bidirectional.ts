import { createHash } from 'node:crypto';
import { governReply } from './luminary-governance.js';
import type { AskModel, GovernedAskResult, ReplyShortfallCode } from './luminary-reply-router.js';
import type { LineageEntry } from './luminary-pipeline/pipeline.js';
import type { RouteOutcome } from './luminary-pipeline/marker-route.js';
import { SpendCapError } from './luminary-meta.js';

export type ExchangeDirection = 'inbound' | 'outbound';
export interface GovernanceSession {
  assertAvailable?(): void;
  evaluate(candidate: string, direction: ExchangeDirection): Promise<RouteOutcome>;
  invokeWriter(writer: AskModel, prompt: string): Promise<unknown>;
}
export interface GovernanceRuntime { createSession(): GovernanceSession }

/** Code-owned public result: private findings, model prose and withheld bytes never leave this boundary. */
function shortfall(code: ReplyShortfallCode, lineage: LineageEntry[]): GovernedAskResult {
  const message = code === 'governance_hold'
    ? 'The message is withheld by governance. Clarify or revise the message before submitting it again.'
    : code === 'governance_unavailable'
      ? 'The approved governance sources are unavailable; no message was delivered.'
      : 'The governance examination could not complete; no message was delivered.';
  return { ok: false, shortfall: { code, message, modelId: null }, lineage };
}

/** Validate the release marker, including all three gates, against these exact bytes. */
function admitted(outcome: RouteOutcome, candidate: string): boolean {
  return outcome.destination === 'prism' && outcome.code?.[0] === 1 && outcome.code[1] === 1
    && outcome.marker.candidateHash === createHash('sha256').update(candidate).digest('hex')
    && outcome.marker.entries.length === 3
    && ['pim', 'irg', 'ptag'].every((gate, index) => outcome.marker.entries[index].gate === gate
      && outcome.marker.entries[index].result === 1 && !outcome.marker.entries[index].finding);
}

/** Mandatory production ask/task seam. There is no legacy fallback and no silent inbound rewriting. */
export function createBidirectionalAsk(writer: AskModel, runtime?: GovernanceRuntime, limits = { promptBytes: 32_768, replyBytes: 32_768 }) {
  return async (prompt: string): Promise<GovernedAskResult> => {
    const lineage: LineageEntry[] = [];
    if (!runtime) return shortfall('governance_unavailable', lineage);
    try {
      if (typeof prompt !== 'string' || !prompt.trim() || Buffer.byteLength(prompt, 'utf8') > limits.promptBytes)
        return shortfall('governance_error', lineage);
      const session = runtime.createSession();
      const incoming = await session.evaluate(prompt, 'inbound');
      if (!admitted(incoming, prompt)) return shortfall(incoming.destination === 'conscience' ? 'governance_hold' : 'governance_error', lineage);
      lineage.push({ pass: 1, stage: 'numeric', direction: 'inbound', candidateHash: incoming.marker.candidateHash, code: [1, 1] });
      let raw: unknown;
      let writerFailed = false;
      let writerAborted = false;
      try { raw = await session.invokeWriter(async (text, control) => {
        try { return await writer(text, control); }
        catch (error) { writerFailed = true; writerAborted = control?.signal?.aborted ?? false; throw error; }
      }, prompt); }
      catch (error) { return shortfall(error instanceof SpendCapError ? 'spend_ceiling'
        : writerFailed && !writerAborted ? 'upstream_error' : 'governance_error', lineage); }
      const structural = governReply(raw, { maxContentBytes: limits.replyBytes });
      lineage.push({ pass: 1, stage: 'structural', ok: structural.ok, ...(!structural.ok ? { code: structural.shortfall.code } : {}) });
      if (!structural.ok) return { ok: false, shortfall: structural.shortfall, lineage };
      const outgoing = await session.evaluate(structural.reply.content, 'outbound');
      if (!admitted(outgoing, structural.reply.content))
        return shortfall(outgoing.destination === 'conscience' ? 'governance_hold' : 'governance_error', lineage);
      lineage.push({ pass: 1, stage: 'numeric', direction: 'outbound', candidateHash: outgoing.marker.candidateHash, code: [1, 1] });
      session.assertAvailable?.();
      lineage.push({ pass: 1, stage: 'prism' });
      return { ok: true, reply: structural.reply, lineage };
    } catch { return shortfall('governance_error', lineage); }
  };
}
