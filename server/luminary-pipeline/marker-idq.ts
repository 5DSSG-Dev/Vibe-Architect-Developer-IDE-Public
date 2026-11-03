/** Unmounted Conscience rendering from the exact Marker RBC returned. */
import type { IdqObservation } from './idq.js';
import type { RouteOutcome } from './marker-route.js';

export function markerToIdq(outcome: RouteOutcome): IdqObservation | null {
  if (outcome.destination !== 'conscience' || !outcome.code || outcome.code[1] !== 0) return null;
  const stopped = outcome.marker.entries.at(-1);
  if (!stopped || stopped.result !== 0 || !stopped.finding) return null;
  const name = stopped.gate.toUpperCase();
  const { kind, reason, evidence } = stopped.finding;
  const identify = `${name} returned ${kind} for this message.`;
  const define = [`${name}: ${reason}${evidence ? ` Evidence: ${evidence}` : ''}`];
  const question = kind === 'unsure'
    ? [`What information would clarify the ${name} uncertainty?`]
    : kind === 'operational_error'
      ? [`What would let the ${name} examination complete?`]
      : [`How could the message address the ${name} finding while preserving its intended point?`];
  return { identify, define, question };
}
