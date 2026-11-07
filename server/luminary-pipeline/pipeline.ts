// The live Luminary reply pipeline (STP-0002 P17), Luminary -> Architect direction:
//
//   structural gate (P12) -> PIM -> IRG -> RBC -- coherent --> Prism -> Architect
//                                 \             \- incoherent -> IDQ -> originator -> ...
//                                  \- PIM catch -----------------^
//
// Every pass is recorded in an append-only lineage returned with the outcome, so the loop is
// inspectable (Gate: Inspectability). The loop is bounded: after `maxIdqPasses` IDQ returns,
// a reply that still does not resonate becomes a named `incoherent_after_idq` Shortfall that
// carries the last observation and readings, and the incoherent text is withheld.
//
// The pipeline makes no model call of its own. The gauge (IRG scorer and optional IDQ
// observer) and the originator's re-form call are injected, so this runs against fakes now
// and the embedded gauge model arrives with M1.b.

import { governReply, type GovernanceOptions, type GovernedReply, type ShortfallCode } from '../luminary-governance.js';
import { runIdq, type IdqDraft, type IdqFailure, type IdqObservation, type IdqWriter, type RunIdqOptions } from './idq.js';
import { IRG_THRESHOLD, SEVEN_VIRTUES, readIrg, validateReadings, type IrgReading, type IrgScorer, type IrgThreshold, type Virtue, type VirtueReadings, type VirtueThresholds } from './irg.js';
import { screenPim, type PimFinding } from './pim.js';
import { routeRbc, type RbcRoute } from './rbc.js';

/** The separate, small gauge model (N13-N15), injected. */
export interface Gauge {
  read: IrgScorer;
  /** The IDQ embedded model (STP-0005 P2). When absent, IDQ fails closed as idq_error. */
  idq?: IdqWriter;
  /** Per-virtue thresholds selected for this gauge's scale (P18). When absent, IRG_THRESHOLD applies. */
  thresholds?: VirtueThresholds;
}

/** A gauge that is not wired yet. Fail-closed: every reply becomes a gauge_error Shortfall. */
export const GAUGE_NOT_CONFIGURED_MESSAGE = 'Luminary gauge model is not yet configured.';
export const notConfiguredGauge: Gauge = {
  read: async () => {
    throw new Error(GAUGE_NOT_CONFIGURED_MESSAGE);
  },
};

/** Returns the IDQ observation to the originator and resolves to its re-formed candidate. */
export type Reform = (observation: IdqObservation, previous: GovernedReply) => Promise<unknown>;

/** The loop bound (P17 decision 2). */
export const DEFAULT_MAX_IDQ_PASSES = 2;

export interface ReplyPipelineOptions {
  gauge: Gauge;
  /** Overrides the gauge's own thresholds. */
  threshold?: IrgThreshold;
  maxIdqPasses?: number;
  governance?: GovernanceOptions;
  /** IDQ timeout, retry delay and (for tests) the IDQ PIM screen. */
  idqOptions?: RunIdqOptions;
}

export type LineageEntry =
  | { pass: number; stage: 'structural'; ok: boolean; code?: ShortfallCode }
  | { pass: number; stage: 'pim'; findings: PimFinding[] }
  | { pass: number; stage: 'irg'; coherent: boolean; readings: VirtueReadings; belowThreshold: Virtue[]; threshold: IrgThreshold }
  | { pass: number; stage: 'rbc'; route: RbcRoute }
  | { pass: number; stage: 'idq'; observation: IdqObservation; drafts: IdqDraft[]; idqPimVersion: string; failures: IdqFailure[] }
  | { pass: number; stage: 'idq_error'; failures: IdqFailure[] }
  | { pass: number; stage: 'prism' };

export type PipelineShortfallCode = ShortfallCode | 'upstream_error' | 'gauge_error' | 'idq_error' | 'incoherent_after_idq';

export interface PipelineShortfall {
  code: PipelineShortfallCode;
  message: string;
  modelId: string | null;
  /** The last IDQ observation, on incoherent_after_idq. */
  observation?: IdqObservation;
  /** The last IRG readings, on incoherent_after_idq, or null when a PIM catch ended the loop. */
  readings?: VirtueReadings | null;
}

/**
 * `passes` holds every structurally valid candidate in full, in order, for the review record
 * (STP-0005 P3). It is never sent to the Architect.
 */
export type PipelineResult =
  | { ok: true; reply: GovernedReply; lineage: LineageEntry[]; passes: string[] }
  | { ok: false; shortfall: PipelineShortfall; lineage: LineageEntry[]; passes: string[] };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function gaugeReading(gauge: Gauge, content: string, threshold: IrgThreshold): Promise<IrgReading> {
  // Any scorer failure (not configured, thrown, or an invalid payload) is a gauge failure.
  const raw = await gauge.read(content, SEVEN_VIRTUES);
  return readIrg(validateReadings(raw), threshold);
}


/**
 * Run a candidate reply through the pipeline. `candidate` is untrusted (straight from the
 * model); `reform` returns an IDQ observation to the originator for a re-formed candidate.
 */
export async function runReplyPipeline(
  candidate: unknown,
  reform: Reform,
  options: ReplyPipelineOptions,
): Promise<PipelineResult> {
  const threshold = options.threshold ?? options.gauge.thresholds ?? IRG_THRESHOLD;
  const maxIdqPasses = options.maxIdqPasses ?? DEFAULT_MAX_IDQ_PASSES;
  const lineage: LineageEntry[] = [];
  const passes: string[] = [];

  for (let pass = 1; ; pass += 1) {
    const governed = governReply(candidate, options.governance);
    if (!governed.ok) {
      lineage.push({ pass, stage: 'structural', ok: false, code: governed.shortfall.code });
      return { ok: false, shortfall: governed.shortfall, lineage, passes };
    }
    lineage.push({ pass, stage: 'structural', ok: true });
    const reply = governed.reply;
    passes.push(reply.content);

    const pimFindings = screenPim(reply.content);
    lineage.push({ pass, stage: 'pim', findings: pimFindings });

    let irg: IrgReading | null = null;
    if (pimFindings.length === 0) {
      try {
        irg = await gaugeReading(options.gauge, reply.content, threshold);
      } catch (error) {
        return {
          ok: false,
          shortfall: { code: 'gauge_error', message: errorMessage(error, 'The gauge could not read the reply.'), modelId: reply.modelId },
          lineage,
          passes,
        };
      }
      lineage.push({ pass, stage: 'irg', coherent: irg.coherent, readings: irg.readings, belowThreshold: irg.belowThreshold, threshold: irg.threshold });

      const route = routeRbc(irg);
      lineage.push({ pass, stage: 'rbc', route });
      if (route === 'prism') {
        lineage.push({ pass, stage: 'prism' });
        return { ok: true, reply, lineage, passes };
      }
    }

    // IDQ fails closed (F2b): no partial response, and the Architect sees none of the reply's text.
    const ids = await runIdq({ reply: reply.content, pimFindings, irg }, options.gauge.idq, options.idqOptions);
    if (!ids.ok) {
      lineage.push({ pass, stage: 'idq_error', failures: ids.failures });
      return { ok: false, shortfall: { code: 'idq_error', message: ids.message, modelId: reply.modelId }, lineage, passes };
    }
    const observation = ids.observation;
    lineage.push({ pass, stage: 'idq', observation, drafts: ids.drafts, idqPimVersion: ids.idqPimVersion, failures: ids.failures });

    if (pass > maxIdqPasses) {
      return {
        ok: false,
        shortfall: {
          code: 'incoherent_after_idq',
          message: `The reply did not resonate after ${maxIdqPasses} IDQ pass(es); it is withheld.`,
          modelId: reply.modelId,
          observation,
          readings: irg ? irg.readings : null,
        },
        lineage,
        passes,
      };
    }

    try {
      candidate = await reform(observation, reply);
    } catch (error) {
      return {
        ok: false,
        shortfall: { code: 'upstream_error', message: errorMessage(error, 'The model path failed while re-forming the reply.'), modelId: reply.modelId },
        lineage,
        passes,
      };
    }
  }
}
