// The gateway surface that wires the AEGIS reply-governance gate (M1.a, P12) into a
// request path (P13). It is provider-agnostic: the model call is injected as `askModel`,
// so no provider is chosen or reached here — that stays M1.b / M2 / P1 / P2. Every
// candidate reply passes through governReply() before it can leave the gateway, so the
// honest floor (STP-0002 P5) is enforced at this boundary: a governed reply, or a NAMED
// Shortfall — never fallback prose posing as an answer.
//
// The endpoint's mount path and auth model are deliberately NOT decided here; this router
// is mounted by the caller (server/app.ts) once the Architect settles them.

import { Router, type Request, type Response } from 'express';
import {
  governReply,
  type GovernanceOptions,
  type GovernedReply,
  type Shortfall,
  type ShortfallCode,
} from './luminary-governance.js';
import { composeRevisionPrompt } from './luminary-pipeline/ids.js';
import { runReplyPipeline, type LineageEntry, type PipelineShortfallCode, type ReplyPipelineOptions } from './luminary-pipeline/pipeline.js';

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
export type ReplyShortfallCode = ShortfallCode | PipelineShortfallCode;

export interface ReplyShortfall extends Omit<Shortfall, 'code'> {
  code: ReplyShortfallCode;
}

/** The HTTP status each Shortfall maps to. 502 = the model path failed its contract. */
const SHORTFALL_STATUS: Record<ReplyShortfallCode, number> = {
  empty_reply: 502,
  malformed_reply: 502,
  oversized_reply: 502,
  missing_model_id: 502,
  upstream_error: 502,
  gauge_error: 502,
  incoherent_after_ids: 502,
};

export type GovernedAskResult =
  | { ok: true; reply: GovernedReply; lineage?: LineageEntry[] }
  | { ok: false; shortfall: ReplyShortfall; lineage?: LineageEntry[] };

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
      };
    }

    if (options.pipeline) {
      const pipeline = { ...options.pipeline, governance: options.pipeline.governance ?? options.governance };
      const result = await runReplyPipeline(
        candidate,
        (observation, previous) => askModel(composeRevisionPrompt(prompt, previous.content, observation)),
        pipeline,
      );
      return result.ok ? { ok: true, reply: result.reply, lineage: result.lineage } : { ok: false, shortfall: result.shortfall, lineage: result.lineage };
    }

    const governed = governReply(candidate, options.governance);
    return governed.ok ? { ok: true, reply: governed.reply } : { ok: false, shortfall: governed.shortfall };
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
      res.status(SHORTFALL_STATUS[result.shortfall.code]).json({ error: 'luminary_shortfall', shortfall: result.shortfall, ...(result.lineage ? { lineage: result.lineage } : {}) });
      return;
    }
    res.status(200).json({ reply: result.reply, ...(result.lineage ? { lineage: result.lineage } : {}) });
  });

  return router;
}
