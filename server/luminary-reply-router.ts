// The gateway surface that wires the AEGIS reply-governance gate (M1.a, P12) into a
// request path (P13). It is provider-agnostic: the model call is injected as `askModel`,
// so no provider is chosen or reached here — that stays M1.b / M2 / P1 / P2. Every
// candidate reply passes through governReply() before it can leave the gateway, so the
// honest floor (STP-0002 P5) is enforced at this boundary: a governed reply, or a NAMED
// Shortfall — never fallback prose posing as an answer.
//
// The endpoint's mount path and auth model are deliberately NOT decided here; this router
// is mounted by the caller (server/app.ts) once the Architect settles them.

import { createHash } from 'node:crypto';
import { SpendCapError } from './luminary-meta.js';
import { Router, type Request, type Response } from 'express';
import {
  governReply,
  type GovernanceOptions,
  type GovernedReply,
  type Shortfall,
  type ShortfallCode,
} from './luminary-governance.js';
import { MESSAGE_REVISION_LIMIT, type Anchor, type ArchitectEntry, type ArchitectState, type LuminaryState, type ReviewRecord } from './governance-record/review.js';
import { gateArchitectMessage, type ArchitectFlag } from './luminary-pipeline/architect-gate.js';
import { createCallLog, tagged, type CallCounts, type CallLog } from './luminary-pipeline/call-log.js';
import { composeRevisionPrompt, type IdqObservation } from './luminary-pipeline/idq.js';
import { runReplyPipeline, type Gauge, type LineageEntry, type PipelineShortfallCode, type ReplyPipelineOptions } from './luminary-pipeline/pipeline.js';
import { examineExchange, governNumericReply, type GovernanceRuntime, type GovernanceSession } from './luminary-bidirectional.js';

/**
 * Produces a candidate reply for a prompt. Its result is untrusted: it is handed straight
 * to governReply() and never shown unvalidated. It returns `unknown` on purpose so a
 * malformed provider payload is governed, not assumed well-formed. It may throw or reject;
 * the router turns that into an `upstream_error` Shortfall rather than a 500.
 */
export type AskModel = (prompt: string, control?: { signal?: AbortSignal }) => Promise<unknown>;

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
  /** The review areas (STP-0005 P3). With the pipeline, every message and reply is written here first. */
  record?: ReviewRecord;
  numeric?: { runtime?: GovernanceRuntime };
}

/** An upstream failure is itself a named Shortfall, keeping the honest floor total. */
export type ReplyShortfallCode =
  | ShortfallCode
  | PipelineShortfallCode
  | 'spend_ceiling'
  | 'returned_to_sender'
  | 'governance_closed'
  | 'governance_unavailable'
  | 'record_error'
  | 'revision_not_found'
  | 'saved_for_review';

export interface ReplyShortfall extends Omit<Shortfall, 'code'> {
  code: ReplyShortfallCode;
  /** On returned_to_sender: the check that flagged the Architect's message. */
  flaggedBy?: ArchitectFlag;
  /** On returned_to_sender: the IDQ response returned to the Architect. */
  observation?: IdqObservation;
}

/** The HTTP status each Shortfall maps to. 502 = the model path failed its contract. */
const SHORTFALL_STATUS: Record<ReplyShortfallCode, number> = {
  empty_reply: 502,
  malformed_reply: 502,
  oversized_reply: 502,
  missing_model_id: 502,
  upstream_error: 502,
  gauge_error: 502,
  idq_error: 502,
  incoherent_after_idq: 502,
  // The Architect's spending ceiling (P21) was reached: the gateway is working, it is refusing to spend.
  spend_ceiling: 503,
  // The Architect's own message was incoherent (STP-0005 P1): returned through IDQ, never sent on.
  returned_to_sender: 422,
  // The review record failed its check and the Architect has not yet seen it (STP-0005 P3).
  governance_closed: 503,
  governance_unavailable: 503,
  // The review record could not be written, so nothing crossed (fail closed).
  record_error: 503,
  revision_not_found: 400,
  saved_for_review: 409,
};

/** The gate's evidence for one turn: the Architect message's checks and the tagged call counts. */
/** Where this turn was written in the review record, and the anchors for the evidence archive. */
export interface TurnRecord {
  architectEntryId: string;
  state: ArchitectState;
  loop: number;
  anchors: Anchor[];
}

interface TurnEvidence {
  architectLineage?: LineageEntry[];
  calls?: CallCounts;
  record?: TurnRecord;
}

export type GovernedAskResult =
  | ({ ok: true; reply: GovernedReply; lineage?: LineageEntry[] } & TurnEvidence)
  | ({ ok: false; shortfall: ReplyShortfall; lineage?: LineageEntry[] } & TurnEvidence);

/** The gauge with each call tagged: IRG reads as gauge, IDQ embedded-model calls as idq_model. */
function taggedGauge(gauge: Gauge, log: CallLog): Gauge {
  return {
    ...gauge,
    read: tagged(log, 'gauge', gauge.read),
    ...(gauge.idq ? { idq: { write: (request) => { log.record('idq_model', request.retry); return gauge.idq!.write(request); } } } : {}),
  };
}

/** The HTTP status for a Shortfall, shared with the coding-task route. */
export function shortfallStatus(code: ReplyShortfallCode): number {
  return SHORTFALL_STATUS[code];
}

/** How an Architect message relates to an earlier one (STP-0005 P3, plan rev16 F3, F5). */
export interface TurnLink {
  /** The returned message this one revises. */
  revisionOf?: string;
  /** True to resubmit an item saved for review: a new linked entry with a fresh two-revision count. */
  resubmit?: boolean;
}

/**
 * One governed model turn: the Architect gate, then ask, then the reply pipeline. Shared by
 * /ask and the coding-task route, so every message and every Luminary reply takes the same path.
 * With a review record, every Architect message and every Luminary reply is written in full,
 * and flushed to disk, before anything crosses or is reported as sent back.
 */
export function createGovernedAsk(askModel: AskModel, options: LuminaryReplyRouterOptions = {}) {
  return async (prompt: string, link: TurnLink = {}): Promise<GovernedAskResult> => {
    // A refusal by the spend ledger, on the first call or a revision, is named as the ceiling.
    let ceiling: SpendCapError | null = null;
    const log = createCallLog();
    const respond = tagged(log, 'luminary_response', askModel);
    const ask: AskModel = async (text, control) => {
      try {
        return await respond(text, control);
      } catch (error) {
        if (error instanceof SpendCapError) ceiling = error;
        throw error;
      }
    };
    const turnOptions = options.pipeline ? { ...options, pipeline: { ...options.pipeline, gauge: taggedGauge(options.pipeline.gauge, log) } } : options;
    const result = await governedTurn(ask, prompt, link, turnOptions, log);
    const reached = ceiling as SpendCapError | null;
    const calls = options.pipeline ? { calls: log.counts() } : {};
    if (!result.ok && reached) return { ok: false, shortfall: { code: 'spend_ceiling', message: reached.message, modelId: null }, lineage: result.lineage, architectLineage: result.architectLineage, record: result.record, ...calls };
    return { ...result, ...calls };
  };
}

const RETURNED_MESSAGE = 'Your message was not sent to the Luminary. It was returned through IDQ.';
const SAVED_MESSAGE = 'Your message was not sent to the Luminary. It was returned through IDQ and saved for your review after two revision loops.';

function recordFailure(error: unknown, architectLineage?: LineageEntry[], dispatched = false): GovernedAskResult {
  return {
    ok: false,
    shortfall: { code: 'record_error', message: `${dispatched ? 'The model path was invoked, but delivery is withheld because its review record could not be written. Provider usage may have occurred; do not assume a retry is free' : 'Nothing was sent to the Luminary: the review record could not be written'} (${error instanceof Error ? error.message : 'write failed'}).`, modelId: null },
    architectLineage,
  };
}

function luminaryState(result: { ok: boolean; shortfall?: { code: string } }): LuminaryState {
  if (result.ok) return 'delivered';
  switch (result.shortfall?.code) {
    case 'incoherent_after_idq': return 'saved_for_review';
    case 'gauge_error': return 'gauge_error';
    case 'idq_error': return 'idq_error';
    case 'upstream_error': return 'upstream_error';
    default: return 'not_delivered';
  }
}

async function governedTurn(askModel: AskModel, prompt: string, link: TurnLink, options: LuminaryReplyRouterOptions, log: CallLog): Promise<GovernedAskResult> {
  const record = options.pipeline ? options.record : undefined;
  const runtime = options.numeric?.runtime;
  if (options.numeric && (!runtime || !record)) {
    return { ok: false, shortfall: { code: 'governance_unavailable', message: 'The approved governance runtime or review record is unavailable.', modelId: null } };
  }
  if (record?.closed) {
    return { ok: false, shortfall: { code: 'governance_closed', message: 'Governance is closed until you have seen the review record check. Nothing was sent.', modelId: null } };
  }

  // The message limit (F3): a revision of a returned message counts up to two; an item saved
  // for review is only ever resubmitted deliberately, as a new entry with a fresh count (F5).
  let loop = 0;
  let resubmittedFrom: string | undefined;
  if (record && link.revisionOf) {
    const parent = record.findArchitect(link.revisionOf);
    if (!parent) return { ok: false, shortfall: { code: 'revision_not_found', message: 'The message being revised is not in the review record.', modelId: null } };
    if (parent.state === 'saved_for_review') {
      if (!link.resubmit) return { ok: false, shortfall: { code: 'saved_for_review', message: 'That message is saved for review. Resubmitting it starts a new entry with a fresh count.', modelId: null } };
      resubmittedFrom = parent.id;
    } else if (parent.state === 'returned') {
      loop = parent.loop + 1;
    }
  }

  // Governance in both directions (STP-0005 P1): the Architect's message is checked before the
  // Luminary response path is called at all. An incoherent message goes back through IDQ.
  let architectLineage: LineageEntry[] | undefined;
  let turnRecord: TurnRecord | undefined;
  let session: GovernanceSession | undefined;
  const inboundPipeline = options.pipeline;
  if (inboundPipeline) {
    const gate = await (async (): ReturnType<typeof gateArchitectMessage> => {
      if (runtime) {
        try {
          session = runtime.createSession();
          const result = await examineExchange(session, prompt, 'inbound', 1);
          return result.observation
            ? { outcome: 'returned', flaggedBy: result.flaggedBy, observation: result.observation, lineage: [result.entry] }
            : { outcome: 'coherent', lineage: [result.entry] };
        } catch {
          return { outcome: 'gauge_error', message: 'Governance could not complete. Nothing was sent to the Luminary.', lineage: [] };
        }
      }
      return gateArchitectMessage(prompt, {
        gauge: inboundPipeline.gauge,
        threshold: inboundPipeline.threshold,
        maxContentBytes: (inboundPipeline.governance ?? options.governance)?.maxContentBytes,
        idqOptions: inboundPipeline.idqOptions,
      });
    })();
    architectLineage = gate.lineage;
    const state: ArchitectState = gate.outcome === 'coherent'
      ? 'sent'
      : gate.outcome === 'returned'
        ? (loop >= MESSAGE_REVISION_LIMIT ? 'saved_for_review' : 'returned')
        : gate.outcome;

    if (record) {
      const entry: ArchitectEntry = {
        kind: 'architect_message',
        id: record.newId(),
        message: prompt,
        loop,
        ...(link.revisionOf && !resubmittedFrom ? { revisionOf: link.revisionOf } : {}),
        ...(resubmittedFrom ? { resubmittedFrom } : {}),
        state,
        ...(gate.outcome === 'returned' ? { flaggedBy: gate.flaggedBy, observation: gate.observation } : {}),
        lineage: gate.lineage,
        calls: log.counts(),
      };
      try {
        turnRecord = { architectEntryId: entry.id, state, loop, anchors: [await record.appendArchitect(entry)] };
      } catch (error) {
        return recordFailure(error, architectLineage);
      }
    }

    if (gate.outcome === 'gauge_error' || gate.outcome === 'idq_error') {
      return { ok: false, shortfall: { code: gate.outcome, message: gate.message, modelId: null }, architectLineage, record: turnRecord };
    }
    if (gate.outcome === 'returned') {
      return {
        ok: false,
        shortfall: {
          code: 'returned_to_sender',
          message: state === 'saved_for_review' ? SAVED_MESSAGE : RETURNED_MESSAGE,
          modelId: null,
          flaggedBy: gate.flaggedBy,
          observation: gate.observation,
        },
        architectLineage,
        record: turnRecord,
      };
    }
  }

  let candidate: unknown;
  try {
    candidate = session ? await session.invokeWriter(askModel, prompt) : await askModel(prompt);
  } catch (error) {
    // An upstream failure never becomes a real-looking answer; it is a named Shortfall.
    const upstream: GovernedAskResult = {
      ok: false,
      shortfall: {
        code: 'upstream_error',
        message: !session && error instanceof Error ? error.message : 'The model path did not produce a deliverable reply.',
        modelId: null,
      },
      architectLineage,
      record: turnRecord,
    };
    if (record && turnRecord) {
      try {
        turnRecord.anchors.push(await record.appendLuminary({ kind: 'luminary_reply', id: record.newId(), architectEntryId: turnRecord.architectEntryId, modelId: null, passes: [], state: 'upstream_error', shortfallCode: 'upstream_error', lineage: [], calls: log.counts() }));
      } catch (recordError) {
        return recordFailure(recordError, architectLineage, true);
      }
    }
    return upstream;
  }

  if (options.pipeline) {
    const pipeline = { ...options.pipeline, governance: options.pipeline.governance ?? options.governance };
    const result = session
      ? await governNumericReply(session, candidate, prompt, askModel, pipeline.maxIdqPasses ?? 2, pipeline.governance)
      : await runReplyPipeline(
      candidate,
      (observation, previous) => askModel(composeRevisionPrompt(prompt, previous.content, observation)),
      pipeline,
    );
    // Every reply is written in full before anything is delivered. If the write fails, nothing is.
    if (record && turnRecord) {
      try {
        turnRecord.anchors.push(await record.appendLuminary({
          kind: 'luminary_reply',
          id: record.newId(),
          architectEntryId: turnRecord.architectEntryId,
          modelId: result.ok ? result.reply.modelId : result.shortfall.modelId,
          passes: result.passes,
          state: luminaryState(result),
          ...(result.ok ? {} : { shortfallCode: result.shortfall.code }),
          lineage: result.lineage,
          calls: { ...log.counts(), architect_delivery: result.ok ? 1 : 0 },
        }));
      } catch (error) {
        return recordFailure(error, architectLineage, true);
      }
    }
    if (result.ok) {
      try { session?.assertAvailable?.(); } catch {
        return { ok: false, shortfall: { code: 'governance_unavailable', message: 'Governance authority changed before delivery. The reply was withheld.', modelId: null }, architectLineage, record: turnRecord };
      }
      log.record('architect_delivery');
    }
    return result.ok
      ? { ok: true, reply: result.reply, lineage: result.lineage, architectLineage, record: turnRecord }
      : { ok: false, shortfall: result.shortfall, lineage: result.lineage, architectLineage, record: turnRecord };
  }

  const governed = governReply(candidate, options.governance);
  if (governed.ok) log.record('architect_delivery');
  return governed.ok ? { ok: true, reply: governed.reply } : { ok: false, shortfall: governed.shortfall };
}

/** The lineage and gate evidence a response carries, when the pipeline produced them. */
export function evidence(result: GovernedAskResult): Record<string, unknown> {
  return {
    ...(result.lineage ? { lineage: result.lineage } : {}),
    ...(result.architectLineage ? { architectLineage: result.architectLineage } : {}),
    ...(result.calls ? { calls: result.calls } : {}),
    ...(result.record ? { record: result.record } : {}),
  };
}

function readLink(body: unknown): TurnLink {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return {};
  const { revisionOf, resubmit } = body as Record<string, unknown>;
  return {
    ...(typeof revisionOf === 'string' && revisionOf.trim() ? { revisionOf: revisionOf.trim() } : {}),
    ...(resubmit === true ? { resubmit: true } : {}),
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
  // Bounded session-local deduplication. Never evict admitted IDs and silently replay them.
  const dispatches=new Map<string,{hash:string;result:ReturnType<typeof governedAsk>}>();

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

    const requestId=req.body?.requestId;
    if(requestId!==undefined && (typeof requestId!=='string'||!/^[0-9a-f-]{36}$/.test(requestId))){res.status(400).json({error:'invalid_request_id'});return;}
    const link=readLink(req.body),fingerprint=createHash('sha256').update(JSON.stringify({prompt,link})).digest('hex');
    let dispatch=requestId?dispatches.get(requestId):undefined;
    if(dispatch && dispatch.hash!==fingerprint){res.status(409).json({error:'request_id_conflict'});return;}
    if(requestId&&!dispatch){
      const previouslyAdmitted=options.record?.architect.entries.some(row=>{if(row.entry.kind!=='note')return false;try{const note=JSON.parse(row.entry.text);return note.kind==='planning_dispatch'&&note.requestId===requestId;}catch{return false;}});
      if(previouslyAdmitted){res.status(409).json({error:'request_outcome_unknown',message:'This request was admitted before this gateway session. No new call was made. Review its original record before retrying.'});return;}
      if(dispatches.size>=256){res.status(409).json({error:'dispatch_capacity',message:'This gateway reached its tracked request limit. No new request was sent.'});return;}
      const result=Promise.resolve().then(async()=>{if(options.record)await options.record.architect.append({kind:'note',id:requestId,text:JSON.stringify({kind:'planning_dispatch',requestId,promptSha256:createHash('sha256').update(prompt).digest('hex')})});return governedAsk(prompt,link);});
      dispatch={hash:fingerprint,result};dispatches.set(requestId,dispatch);
    }
    if(requestId)res.setHeader('X-Luminary-Request-Id',requestId);
    const result = await (dispatch?dispatch.result:governedAsk(prompt,link));
    if (!result.ok) {
      res.status(SHORTFALL_STATUS[result.shortfall.code]).json({ error: 'luminary_shortfall', shortfall: result.shortfall, ...evidence(result) });
      return;
    }
    res.status(200).json({ reply: result.reply, ...evidence(result) });
  });

  return router;
}
