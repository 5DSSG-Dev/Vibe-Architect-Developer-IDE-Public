// The gateway surface that wires the AEGIS reply-governance gate (M1.a, P12) into a
// request path (P13). It is provider-agnostic: the model call is injected as `askModel`,
// so no provider is chosen or reached here — that stays M1.b / M2 / P1 / P2. Every
// candidate reply passes through governReply() before it can leave the gateway, so the
// honest floor (STP-0002 P5) is enforced at this boundary: a governed reply, or a NAMED
// Shortfall — never fallback prose posing as an answer.
//
// The endpoint's mount path and auth model are deliberately NOT decided here; this router
// is mounted by the caller (server/app.ts) once the Architect settles them.

import { SpendCapError } from './luminary-meta.js';
import { Router, type Request, type Response } from 'express';
import {
  governReply,
  type GovernanceOptions,
  type GovernedReply,
  type Shortfall,
  type ShortfallCode,
} from './luminary-governance.js';
import { gateArchitectMessage, type ArchitectFlag } from './luminary-pipeline/architect-gate.js';
import { createCallLog, tagged, type CallCounts, type CallLog } from './luminary-pipeline/call-log.js';
import { composeRevisionPrompt, type IdsObservation } from './luminary-pipeline/ids.js';
import { runReplyPipeline, type Gauge, type LineageEntry, type PipelineShortfallCode, type ReplyPipelineOptions } from './luminary-pipeline/pipeline.js';

/**
 * Produces a candidate reply for a prompt. Its result is untrusted: it is handed straight
 * to governReply() and never shown unvalidated. It returns `unknown` on purpose so a
 * malformed provider payload is governed, not assumed well-formed. It may throw or reject;
 * the router turns that into an `upstream_error` Shortfall rather than a 500.
 */
export type AskModel = (prompt: string) => Promise<unknown>;

/** The error a not-yet-wired model path throws; the router turns it into upstream_error. */
export const MODEL_NOT_CONFIGURED_MESSAGE = 'Luminary model path is not yet configured.';

/**
 * The honest placeholder reply source used until a real model is wired (M1.b, depends on M2).
 * It never fabricates a reply: it throws, so the governed endpoint returns a named
 * upstream_error Shortfall. Mounting it spends no provider credits.
 */
export const notConfiguredAskModel: AskModel = async () => {
  throw new Error(MODEL_NOT_CONFIGURED_MESSAGE);
};

/** The request body the endpoint accepts. */
export interface LuminaryAskRequest {
  prompt: string;
}

export interface LuminaryReplyRouterOptions {
  /** Forwarded to governReply() (e.g. the reply byte ceiling). */
  governance?: GovernanceOptions;
  /**
   * The live reply pipeline (STP-0002 P17). When set, every structurally valid reply is read
   * by PIM -> IRG -> RBC before it can leave, and responses carry the pass lineage.
   */
  pipeline?: ReplyPipelineOptions;
}

/** An upstream failure is itself a named Shortfall, keeping the honest floor total. */
export type ReplyShortfallCode = ShortfallCode | PipelineShortfallCode | 'spend_ceiling' | 'returned_to_sender';

export interface ReplyShortfall extends Omit<Shortfall, 'code'> {
  code: ReplyShortfallCode;
  /** On returned_to_sender: the check that flagged the Architect's message. */
  flaggedBy?: ArchitectFlag;
  /** On returned_to_sender: the IDS response returned to the Architect. */
  observation?: IdsObservation;
}

/** The HTTP status each Shortfall maps to. 502 = the model path failed its contract. */
const SHORTFALL_STATUS: Record<ReplyShortfallCode, number> = {
  empty_reply: 502,
  malformed_reply: 502,
  oversized_reply: 502,
  missing_model_id: 502,
  upstream_error: 502,
  gauge_error: 502,
  ids_error: 502,
  incoherent_after_ids: 502,
  // The Architect's spending ceiling (P21) was reached: the gateway is working, it is refusing to spend.
  spend_ceiling: 503,
  // The Architect's own message was incoherent (STP-0005 P1): returned through IDS, never sent on.
  returned_to_sender: 422,
};

/** The gate's evidence for one turn: the Architect message's checks and the tagged call counts. */
interface TurnEvidence {
  architectLineage?: LineageEntry[];
  calls?: CallCounts;
}

export type GovernedAskResult =
  | ({ ok: true; reply: GovernedReply; lineage?: LineageEntry[] } & TurnEvidence)
  | ({ ok: false; shortfall: ReplyShortfall; lineage?: LineageEntry[] } & TurnEvidence);

/** The gauge with each call tagged: IRG reads as gauge, IDS embedded-model calls as ids_model. */
function taggedGauge(gauge: Gauge, log: CallLog): Gauge {
  return {
    ...gauge,
    read: tagged(log, 'gauge', gauge.read),
    ...(gauge.ids ? { ids: { write: (request) => { log.record('ids_model', request.retry); return gauge.ids!.write(request); } } } : {}),
  };
}

/** The HTTP status for a Shortfall, shared with the coding-task route. */
export function shortfallStatus(code: ReplyShortfallCode): number {
  return SHORTFALL_STATUS[code];
}

/**
 * One governed model turn: ask, then the structural gate and (when configured) the reply pipeline.
 * Shared by /ask and the coding-task route, so every Luminary reply takes the same path.
 */
export function createGovernedAsk(askModel: AskModel, options: LuminaryReplyRouterOptions = {}) {
  return async (prompt: string): Promise<GovernedAskResult> => {
    // A refusal by the spend ledger, on the first call or a revision, is named as the ceiling.
    let ceiling: SpendCapError | null = null;
    const log = createCallLog();
    const respond = tagged(log, 'luminary_response', askModel);
    const ask: AskModel = async (text) => {
      try {
        return await respond(text);
      } catch (error) {
        if (error instanceof SpendCapError) ceiling = error;
        throw error;
      }
    };
    const turnOptions = options.pipeline ? { ...options, pipeline: { ...options.pipeline, gauge: taggedGauge(options.pipeline.gauge, log) } } : options;
    const result = await governedTurn(ask, prompt, turnOptions);
    if (result.ok) log.record('architect_delivery');
    const reached = ceiling as SpendCapError | null;
    if (!result.ok && reached) return { ok: false, shortfall: { code: 'spend_ceiling', message: reached.message, modelId: null }, lineage: result.lineage, architectLineage: result.architectLineage, ...(options.pipeline ? { calls: log.counts() } : {}) };
    return options.pipeline ? { ...result, calls: log.counts() } : result;
  };
}

async function governedTurn(askModel: AskModel, prompt: string, options: LuminaryReplyRouterOptions): Promise<GovernedAskResult> {
  // Governance in both directions (STP-0005 P1): the Architect's message is checked before the
  // Luminary response path is called at all. An incoherent message goes back through IDS.
  let architectLineage: LineageEntry[] | undefined;
  if (options.pipeline) {
    const gate = await gateArchitectMessage(prompt, {
      gauge: options.pipeline.gauge,
      threshold: options.pipeline.threshold,
      maxContentBytes: (options.pipeline.governance ?? options.governance)?.maxContentBytes,
      idsOptions: options.pipeline.idsOptions,
    });
    architectLineage = gate.lineage;
    if (gate.outcome === 'gauge_error' || gate.outcome === 'ids_error') {
      return { ok: false, shortfall: { code: gate.outcome, message: gate.message, modelId: null }, architectLineage };
    }
    if (gate.outcome === 'returned') {
      return {
        ok: false,
        shortfall: {
          code: 'returned_to_sender',
          message: 'Your message was not sent to the Luminary. It was returned through IDS.',
          modelId: null,
          flaggedBy: gate.flaggedBy,
          observation: gate.observation,
        },
        architectLineage,
      };
    }
  }

  let candidate: unknown;
  try {
    candidate = await askModel(prompt);
  } catch (error) {
    // An upstream failure never becomes a real-looking answer; it is a named Shortfall.
    return {
      ok: false,
      shortfall: {
        code: 'upstream_error',
        message: error instanceof Error ? error.message : 'The model path failed before a reply was produced.',
        modelId: null,
      },
      architectLineage,
    };
  }

  if (options.pipeline) {
    const pipeline = { ...options.pipeline, governance: options.pipeline.governance ?? options.governance };
    const result = await runReplyPipeline(
      candidate,
      (observation, previous) => askModel(composeRevisionPrompt(prompt, previous.content, observation)),
      pipeline,
    );
    return result.ok ? { ok: true, reply: result.reply, lineage: result.lineage, architectLineage } : { ok: false, shortfall: result.shortfall, lineage: result.lineage, architectLineage };
  }

  const governed = governReply(candidate, options.governance);
  return governed.ok ? { ok: true, reply: governed.reply } : { ok: false, shortfall: governed.shortfall };
}

/** The lineage and gate evidence a response carries, when the pipeline produced them. */
export function evidence(result: GovernedAskResult): Record<string, unknown> {
  return {
    ...(result.lineage ? { lineage: result.lineage } : {}),
    ...(result.architectLineage ? { architectLineage: result.architectLineage } : {}),
    ...(result.calls ? { calls: result.calls } : {}),
  };
}

function readPrompt(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const raw = (body as Record<string, unknown>).prompt;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Build the Luminary reply router. `askModel` is the only reply source; everything it
 * returns is governed before it leaves the gateway.
 */
export function createLuminaryReplyRouter(
  askModel: AskModel,
  options: LuminaryReplyRouterOptions = {},
): Router {
  const router = Router();
  const governedAsk = createGovernedAsk(askModel, options);

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post('/ask', async (req: Request, res: Response) => {
    const prompt = readPrompt(req.body);
    if (prompt === null) {
      res.status(400).json({ error: 'malformed_request', detail: 'Body must be { prompt: non-empty string }.' });
      return;
    }

    const result = await governedAsk(prompt);
    if (!result.ok) {
      res.status(SHORTFALL_STATUS[result.shortfall.code]).json({ error: 'luminary_shortfall', shortfall: result.shortfall, ...evidence(result) });
      return;
    }
    res.status(200).json({ reply: result.reply, ...evidence(result) });
  });

  return router;
}
