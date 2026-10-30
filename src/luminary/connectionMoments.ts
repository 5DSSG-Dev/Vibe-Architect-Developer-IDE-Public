// Connection moments in plain words (STP-0002 P24, revised in N43). The IDE already records every
// Umbilical moment (src/contracts/connectionEvents.ts); this turns each one into one plain sentence
// from a fixed wording table, inside the IDE, with no model call, so it costs nothing and cannot
// invent. Only the fields on the allow-list below are ever copied out of an event: the event's raw
// message, and anything not listed, never reach the screen or a question.

import type { ConnectionEvent, ConnectionEventKind } from '../contracts/connectionEvents';

/** The moments the runtime reliably produces today. 'suspended' has no producer and no meaning yet. */
export const EXPLAINED_KINDS = [
  'attempt-started', 'contract-resolved', 'resources-committed', 'refused',
  'active', 'degraded', 'severed', 'resources-released',
] as const satisfies readonly ConnectionEventKind[];

type ExplainedKind = (typeof EXPLAINED_KINDS)[number];

/** Routine steps of one handshake are grouped into one line; the rest stand on their own. */
const ROUTINE: ReadonlySet<ConnectionEventKind> = new Set(['attempt-started', 'contract-resolved', 'resources-committed', 'resources-released']);

/** Reason codes in plain words. An unknown code is named as such, never guessed at. */
const REASONS: Record<string, string> = {
  CONTRACT_REFUSED: 'its contract did not match one the CORE recognises',
  RESOURCE_SHORTFALL: 'the CORE did not have enough free resources for it',
  RESOURCE_SHORTFALL_WITH_ALTERNATIVES: 'the CORE did not have enough free resources for it',
  HANDSHAKE_REFUSED: 'its handshake did not complete',
  CAPABILITY_UNSATISFIED: 'it needs something the CORE cannot provide right now',
  HEALTH_CHECK_FAILED: 'a health check failed',
  FAULT_ISOLATION: 'it was isolated after a fault, so the fault could not spread',
  MUTUAL_DISCONNECT: 'it was disconnected on purpose',
};

/** Why the CORE may lack a capability it offers itself (src/engine/coreCapabilities.ts). */
const CAPABILITY_HINTS: Record<string, string> = {
  thread_pool: 'the CORE offers it only while it has a free thread',
  single_thread: 'the CORE offers it only while it has a free thread',
  cpu_time: 'the CORE offers it only while it has a free thread',
  multi_core: 'the CORE offers it only while it has at least 2 free threads',
  memory_heap: 'the CORE offers it only while it has free memory',
  high_memory: 'the CORE offers it only while it has at least 768 MB free',
};

interface Amount {
  memoryMB: number;
  threads: number;
}

/**
 * What the CORE ran short of, worked out from the event's requested and free figures. The runtime
 * gives one reason code for memory, thread, bandwidth and GPU refusals alike, so the dimension is
 * taken from the numbers, never assumed. Empty when no figure was short (for example a refused
 * reservation), and then no figures are shown at all.
 */
export interface Shortfall {
  dimension: 'memory' | 'threads' | 'bandwidth' | 'gpu';
  needed: number | boolean;
  free: number | boolean;
}

/** One moment, holding only allow-listed fields. */
export interface ConnectionMoment {
  eventId: string;
  attemptId: string;
  kind: ExplainedKind;
  time: string;
  orbId: string;
  orbName: string;
  portId: string;
  contract?: { id: string; version: string };
  profile?: { id: string; version?: string };
  reasonCode?: string;
  missingCapabilities?: string[];
  requested?: Amount;
  available?: Amount;
  shortfall?: Shortfall[];
  alternatives?: { profileId: string; profileVersion: string; memoryMB: number; threads: number }[];
}

function shortfallOf(event: ConnectionEvent): Shortfall[] {
  const requested = event.resources?.requested;
  const available = event.resources?.available;
  if (event.kind !== 'refused' || !requested || !available) return [];
  const short: Shortfall[] = [];
  if (requested.memoryMB > available.memoryMB) short.push({ dimension: 'memory', needed: requested.memoryMB, free: available.memoryMB });
  if (requested.threads > available.threads) short.push({ dimension: 'threads', needed: requested.threads, free: available.threads });
  if (requested.bandwidthPeak > available.bandwidthCredits) short.push({ dimension: 'bandwidth', needed: requested.bandwidthPeak, free: available.bandwidthCredits });
  if (requested.gpu && !available.gpu) short.push({ dimension: 'gpu', needed: true, free: false });
  return short;
}

const isExplained = (kind: ConnectionEventKind): kind is ExplainedKind => (EXPLAINED_KINDS as readonly string[]).includes(kind);

/**
 * Copy an event's allow-listed fields. Returns null for a moment the Luminary does not explain yet
 * (today, only 'suspended').
 */
export function toMoment(event: ConnectionEvent, nameOf: (orbId: string) => string | undefined = () => undefined): ConnectionMoment | null {
  if (!isExplained(event.kind)) return null;
  const contractId = event.resolvedContractId ?? event.presentedContract?.id;
  const contractVersion = event.resolvedContractVersion ?? event.presentedContract?.version;
  const requested = event.resources?.requested;
  const available = event.resources?.available;
  const shortfall = shortfallOf(event);
  return {
    eventId: event.eventId,
    attemptId: event.attemptId,
    kind: event.kind,
    time: event.timestamp,
    orbId: event.orbId,
    orbName: nameOf(event.orbId) ?? (event.orbId || 'An Orb'),
    portId: event.portId,
    ...(contractId && contractVersion ? { contract: { id: contractId, version: contractVersion } } : {}),
    ...(event.profileId ? { profile: { id: event.profileId, ...(event.profileVersion ? { version: event.profileVersion } : {}) } } : {}),
    ...(event.reasonCode ? { reasonCode: event.reasonCode } : {}),
    ...(event.missingCapabilities?.length ? { missingCapabilities: [...event.missingCapabilities] } : {}),
    ...(requested ? { requested: { memoryMB: requested.memoryMB, threads: requested.threads } } : {}),
    ...(available ? { available: { memoryMB: available.memoryMB, threads: available.threads } } : {}),
    ...(shortfall.length ? { shortfall } : {}),
    ...(event.alternatives?.length
      ? { alternatives: event.alternatives.map(({ profileId, profileVersion, memoryMB, threads }) => ({ profileId, profileVersion, memoryMB, threads })) }
      : {}),
  };
}

const shortText = (entry: Shortfall) => {
  if (entry.dimension === 'gpu') return 'the GPU, which is switched off';
  if (entry.dimension === 'memory') return `${entry.needed} MB of memory (${entry.free} MB free)`;
  if (entry.dimension === 'threads') return `${entry.needed} thread${entry.needed === 1 ? '' : 's'} (${entry.free} free)`;
  return `${entry.needed} bandwidth credits at peak (${entry.free} free)`;
};

const amount = ({ memoryMB, threads }: Amount) => `${memoryMB} MB and ${threads} thread${threads === 1 ? '' : 's'}`;
const port = (moment: ConnectionMoment) => (moment.portId ? ` on port ${moment.portId}` : '');
const reason = (code: string | undefined) => (code ? REASONS[code] ?? `of a reason the IDE has no plain words for yet (${code})` : undefined);

/** The part of a sentence that says what happened, without the Orb's name. */
function phrase(moment: ConnectionMoment, recovered = false): string {
  switch (moment.kind) {
    case 'attempt-started':
      return `started its handshake with the CORE${port(moment)}`;
    case 'contract-resolved':
      return moment.contract ? `was matched to contract ${moment.contract.id} v${moment.contract.version}` : 'was matched to its contract';
    case 'resources-committed':
      return moment.requested ? `was given ${amount(moment.requested)}` : 'was given its resources';
    case 'resources-released':
      return 'gave its resources back to the CORE';
    case 'active':
      return recovered ? `has recovered and is active again${port(moment)}` : `is connected and active${port(moment)}`;
    case 'degraded':
      return `is weakened${port(moment)}: ${reason(moment.reasonCode) ?? 'its connection is not fully healthy'}`;
    case 'severed':
      return `was cut off${port(moment)}${moment.reasonCode ? `: ${reason(moment.reasonCode)}` : ''}`;
    case 'refused': {
      let text = `was refused${port(moment)}${moment.reasonCode ? `: ${reason(moment.reasonCode)}` : ''}`;
      if (moment.missingCapabilities?.length) {
        text += `. It needs ${joinPhrases(moment.missingCapabilities.map((capability) => {
          const hint = CAPABILITY_HINTS[capability];
          return `${capability.replace(/_/g, ' ')}${hint ? ` (${hint})` : ''}`;
        }))}`;
      }
      // Only the figures that were actually short are given, so a GPU or bandwidth refusal never
      // reads as a memory or thread problem. At step 5 (capabilities) the budget's figures are not
      // the reason, and a refused reservation has no short figure; both show none.
      if (moment.reasonCode !== 'CAPABILITY_UNSATISFIED' && moment.shortfall?.length) text += `. It needs ${joinPhrases(moment.shortfall.map(shortText))}`;
      if (moment.alternatives?.length) {
        const offered = moment.alternatives.map((alt) => `${alt.profileId} v${alt.profileVersion} (${amount(alt)})`).join(', ');
        text += `. The CORE offered a profile that fits instead: ${offered}`;
      }
      return text;
    }
  }
}

const joinPhrases = (parts: string[]) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

/** One line in the conversation: one sentence about one or more moments of the same handshake. */
export interface MomentLine {
  id: string;
  attemptId: string;
  orbName: string;
  routine: boolean;
  text: string;
  moments: ConnectionMoment[];
}

/**
 * Turn moments (oldest first) into lines. Consecutive routine steps of the same handshake share one
 * line; a refusal, a weakening, a cut-off or an active connection stands on its own.
 */
export function momentLines(moments: readonly ConnectionMoment[]): MomentLine[] {
  const lines: MomentLine[] = [];
  const weakened = new Set<string>();
  for (const moment of moments) {
    const last = lines[lines.length - 1];
    if (ROUTINE.has(moment.kind) && last?.routine && last.attemptId === moment.attemptId) {
      last.moments.push(moment);
      continue;
    }
    lines.push({ id: moment.eventId, attemptId: moment.attemptId, orbName: moment.orbName, routine: ROUTINE.has(moment.kind), text: '', moments: [moment] });
  }
  for (const line of lines) {
    const parts = line.moments.map((moment) => {
      const recovered = moment.kind === 'active' && weakened.has(moment.attemptId);
      if (moment.kind === 'degraded') weakened.add(moment.attemptId);
      if (moment.kind === 'active') weakened.delete(moment.attemptId);
      return phrase(moment, recovered);
    });
    line.text = `${line.orbName} ${joinPhrases(parts)}.`;
  }
  return lines;
}

/** The plain text an 'Ask why' chip adds to a question: the sentence plus allow-listed facts only. */
export function describeForQuestion(line: MomentLine): string {
  const facts = line.moments.map((moment) => {
    const parts = [`moment: ${moment.kind}`, `time: ${moment.time}`, `Orb: ${moment.orbName} (${moment.orbId})`];
    if (moment.portId) parts.push(`port: ${moment.portId}`);
    if (moment.contract) parts.push(`contract: ${moment.contract.id} v${moment.contract.version}`);
    if (moment.profile) parts.push(`Umbilical profile: ${moment.profile.id}${moment.profile.version ? ` v${moment.profile.version}` : ''}`);
    if (moment.reasonCode) parts.push(`reason: ${reason(moment.reasonCode)} (${moment.reasonCode})`);
    if (moment.missingCapabilities) parts.push(`missing: ${moment.missingCapabilities.join(', ')}`);
    if (moment.kind === 'refused') {
      if (moment.reasonCode !== 'CAPABILITY_UNSATISFIED' && moment.shortfall?.length) parts.push(`ran short of: ${moment.shortfall.map(shortText).join('; ')}`);
    } else {
      if (moment.requested) parts.push(`asked for: ${amount(moment.requested)}`);
      if (moment.available) parts.push(`free: ${amount(moment.available)}`);
    }
    if (moment.alternatives?.length) parts.push(`offered instead: ${moment.alternatives.map((alt) => `${alt.profileId} v${alt.profileVersion} (${amount(alt)})`).join(', ')}`);
    return `- ${parts.join('; ')}`;
  });
  return `A connection moment from the IDE's record:\n${line.text}\n${facts.join('\n')}`;
}
