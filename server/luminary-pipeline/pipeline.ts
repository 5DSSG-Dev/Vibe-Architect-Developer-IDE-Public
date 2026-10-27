// The live Luminary reply pipeline (STP-0002 P17), Luminary -> Architect direction:
//
//   structural gate (P12) -> PIM -> IRG -> RBC -- coherent --> Prism -> Architect
//                                 \             \- incoherent -> IDS -> originator -> ...
//                                  \- PIM catch -----------------^
//
// Every pass is recorded in an append-only lineage returned with the outcome, so the loop is
// inspectable (Gate: Inspectability). The loop is bounded: after `maxIdsPasses` IDS returns,
// a reply that still does not resonate becomes a named `incoherent_after_ids` Shortfall that
// carries the last observation and readings, and the incoherent text is withheld.
//
// The pipeline makes no model call of its own. The gauge (IRG scorer and optional IDS
// observer) and the originator's re-form call are injected, so this runs against fakes now
// and the embedded gauge model arrives with M1.b.

import { governReply, type GovernanceOptions, type GovernedReply, type ShortfallCode } from '../luminary-governance.js';
import { buildIdsObservation, validateObservation, type IdsInput, type IdsObservation, type IdsObserver } from './ids.js';
import { IRG_THRESHOLD, SEVEN_VIRTUES, readIrg, validateReadings, type IrgReading, type IrgScorer, type Virtue, type VirtueReadings } from './irg.js';
import { screenPim, type PimFinding } from './pim.js';
import { routeRbc, type RbcRoute } from './rbc.js';

/** The separate, small gauge model (N13-N15), injected. */
export interface Gauge {
  read: IrgScorer;
  /** Produces the IDS observation. When absent, it is assembled from the readings. */
  observe?: IdsObserver;
}

/** A gauge that is not wired yet. Fail-closed: every reply becomes a gauge_error Shortfall. */
export const GAUGE_NOT_CONFIGURED_MESSAGE = 'Luminary gauge model is not yet configured.';
export const notConfiguredGauge: Gauge = {
  read: async () => {
    throw new Error(GAUGE_NOT_CONFIGURED_MESSAGE);
  },
};

/** Returns the IDS observation to the originator and resolves to its re-formed candidate. */
export type Reform = (observation: IdsObservation, previous: GovernedReply) => Promise<unknown>;

/** The loop bound (P17 decision 2). */
export const DEFAULT_MAX_IDS_PASSES = 2;

export interface ReplyPipelineOptions {
  gauge: Gauge;
  threshold?: number;
  maxIdsPasses?: number;
  governance?: GovernanceOptions;
}

export type LineageEntry =
  | { pass: number; stage: 'structural'; ok: boolean; code?: ShortfallCode }
  | { pass: number; stage: 'pim'; findings: PimFinding[] }
  | { pass: number; stage: 'irg'; coherent: boolean; readings: VirtueReadings; belowThreshold: Virtue[]; threshold: number }
  | { pass: number; stage: 'rbc'; route: RbcRoute }
  | { pass: number; stage: 'ids'; observation: IdsObservation }
  | { pass: number; stage: 'prism' };

export type PipelineShortfallCode = ShortfallCode | 'upstream_error' | 'gauge_error' | 'incoherent_after_ids';

export interface PipelineShortfall {
  code: PipelineShortfallCode;
  message: string;
  modelId: string | null;
  /** The last IDS observation, on incoherent_after_ids. */
  observation?: IdsObservation;
  /** The last IRG readings, on incoherent_after_ids, or null when a PIM catch ended the loop. */
  readings?: VirtueReadings | null;
}

export type PipelineResult =
  | { ok: true; reply: GovernedReply; lineage: LineageEntry[] }
  | { ok: false; shortfall: PipelineShortfall; lineage: LineageEntry[] };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function gaugeReading(gauge: Gauge, content: string, threshold: number): Promise<IrgReading> {
  // Any scorer failure (not configured, thrown, or an invalid payload) is a gauge failure.
  const raw = await gauge.read(content, SEVEN_VIRTUES);
  return readIrg(validateReadings(raw), threshold);
}

async function observe(gauge: Gauge, input: IdsInput): Promise<IdsObservation> {
  if (!gauge.observe) return buildIdsObservation(input);
  const observation = validateObservation(await gauge.observe(input));
  if (!observation) throw new Error('Gauge observation is not a well-formed IDS observation.');
  return observation;
}

/**
 * Run a candidate reply through the pipeline. `candidate` is untrusted (straight from the
 * model); `reform` returns an IDS observation to the originator for a re-formed candidate.
 */
export async function runReplyPipeline(
  candidate: unknown,
  reform: Reform,
  options: ReplyPipelineOptions,
): Promise<PipelineResult> {
  const threshold = options.threshold ?? IRG_THRESHOLD;
  const maxIdsPasses = options.maxIdsPasses ?? DEFAULT_MAX_IDS_PASSES;
  const lineage: LineageEntry[] = [];

  for (let pass = 1; ; pass += 1) {
    const governed = governReply(candidate, options.governance);
    if (!governed.ok) {
      lineage.push({ pass, stage: 'structural', ok: false, code: governed.shortfall.code });
      return { ok: false, shortfall: governed.shortfall, lineage };
    }
    lineage.push({ pass, stage: 'structural', ok: true });
    const reply = governed.reply;

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
        };
      }
      lineage.push({ pass, stage: 'irg', coherent: irg.coherent, readings: irg.readings, belowThreshold: irg.belowThreshold, threshold: irg.threshold });

      const route = routeRbc(irg);
      lineage.push({ pass, stage: 'rbc', route });
      if (route === 'prism') {
        lineage.push({ pass, stage: 'prism' });
        return { ok: true, reply, lineage };
      }
    }

    let observation: IdsObservation;
    try {
      observation = await observe(options.gauge, { reply: reply.content, pimFindings, irg });
    } catch (error) {
      return {
        ok: false,
        shortfall: { code: 'gauge_error', message: errorMessage(error, 'The gauge could not produce an IDS observation.'), modelId: reply.modelId },
        lineage,
      };
    }
    lineage.push({ pass, stage: 'ids', observation });

    if (pass > maxIdsPasses) {
      return {
        ok: false,
        shortfall: {
          code: 'incoherent_after_ids',
          message: `The reply did not resonate after ${maxIdsPasses} IDS pass(es); it is withheld.`,
          modelId: reply.modelId,
          observation,
          readings: irg ? irg.readings : null,
        },
        lineage,
      };
    }

    try {
      candidate = await reform(observation, reply);
    } catch (error) {
      return {
        ok: false,
        shortfall: { code: 'upstream_error', message: errorMessage(error, 'The model path failed while re-forming the reply.'), modelId: reply.modelId },
        lineage,
      };
    }
  }
}
