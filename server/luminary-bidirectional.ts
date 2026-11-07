import { createHash } from 'node:crypto';
import type { AskModel } from './luminary-reply-router.js';
import type { RouteOutcome } from './luminary-pipeline/marker-route.js';
import type { IdqObservation } from './luminary-pipeline/idq.js';
import { composeRevisionPrompt } from './luminary-pipeline/idq.js';
import type { LineageEntry, PipelineResult } from './luminary-pipeline/pipeline.js';
import { governReply, type GovernanceOptions } from './luminary-governance.js';

export type ExchangeDirection = 'inbound' | 'outbound';
export interface GovernanceSession {
  assertAvailable?(): void;
  evaluate(candidate: string, direction: ExchangeDirection): Promise<RouteOutcome>;
  invokeWriter(writer: AskModel, prompt: string): Promise<unknown>;
}
export interface GovernanceRuntime { createSession(): GovernanceSession }

const gates = ['pim', 'irg', 'ptag'] as const;
type NumericEntry = Extract<LineageEntry, { stage: 'numeric' }>;
type Examined =
  | { entry: NumericEntry; observation?: undefined }
  | { entry: NumericEntry; observation: IdqObservation; flaggedBy: typeof gates[number] };

/** Accept only exact candidate bytes and a complete, ordered release or terminal hold marker. */
export async function examineExchange(session: GovernanceSession, candidate: string,
  direction: ExchangeDirection, pass: number): Promise<Examined> {
  const outcome = await session.evaluate(candidate, direction);
  const candidateHash = createHash('sha256').update(candidate).digest('hex');
  const { entries } = outcome.marker;
  if (outcome.marker.candidateHash !== candidateHash || entries.length < 1 || entries.length > 3
    || !entries.every((entry, index) => entry.gate === gates[index])) throw new Error('invalid_governance_marker');
  const passed = entries.every(entry => entry.result === 1 && !entry.finding);
  if (outcome.destination === 'prism' && outcome.code?.[0] === 1 && outcome.code[1] === 1
    && entries.length === 3 && passed) {
    return { entry: { pass, stage: 'numeric', direction, candidateHash, code: [1, 1] } };
  }
  const stop = entries.at(-1)!;
  const kind = stop.finding?.kind;
  if (outcome.destination !== 'conscience' || outcome.code?.[0] !== entries.length + 1
    || outcome.code[1] !== 0 || stop.result !== 0 || (kind !== 'incoherence' && kind !== 'unsure')
    || !entries.slice(0, -1).every(entry => entry.result === 1 && !entry.finding)) {
    throw new Error('invalid_governance_marker');
  }
  // Keep private findings and provider text in the private decision log.
  const gate = stop.gate.toUpperCase();
  return {
    entry: { pass, stage: 'numeric', direction, candidateHash, code: outcome.code },
    flaggedBy: stop.gate,
    observation: {
      identify: `${gate} returned the message to Conscience.`,
      define: [`${gate} recorded ${kind === 'unsure' ? 'an uncertain result' : 'an incoherent result'} for this candidate.`],
      question: [kind === 'unsure'
        ? `What information would clarify the ${gate} result?`
        : `How could the message address the ${gate} finding while preserving its intent?`],
    },
  };
}

/** Each re-formed answer and the prompt that requests it stay in the original budget. */
export async function governNumericReply(session: GovernanceSession, candidate: unknown, prompt: string,
  ask: AskModel, maxRevisions: number, options?: GovernanceOptions): Promise<PipelineResult> {
  const lineage: LineageEntry[] = [];
  const passes: string[] = [];
  const held = (): PipelineResult => ({
    ok: false, lineage, passes, shortfall: {
      code: 'incoherent_after_idq',
      message: 'Conscience returned the reply for review. The reply was withheld.',
      modelId: null,
    },
  });
  try {
    for (let pass = 1; ; pass += 1) {
      const result = governReply(candidate, options);
      lineage.push({ pass, stage: 'structural', ok: result.ok, ...(!result.ok && { code: result.shortfall.code }) });
      if (!result.ok) return { ...result, lineage, passes };
      passes.push(result.reply.content);
      const outgoing = await examineExchange(session, result.reply.content, 'outbound', pass);
      lineage.push(outgoing.entry);
      if (!outgoing.observation) {
        session.assertAvailable?.();
        lineage.push({ pass, stage: 'prism' });
        return { ...result, lineage, passes };
      }
      if (pass > maxRevisions) return held();
      const reform = composeRevisionPrompt(prompt, result.reply.content, outgoing.observation);
      const incoming = await examineExchange(session, reform, 'inbound', pass + 1);
      lineage.push(incoming.entry);
      if (incoming.observation) return held();
      candidate = await session.invokeWriter(ask, reform);
    }
  } catch {
    return { ok: false, lineage, passes, shortfall: {
      code: 'gauge_error', message: 'Governance could not complete. The reply was withheld.', modelId: null,
    } };
  }
}
