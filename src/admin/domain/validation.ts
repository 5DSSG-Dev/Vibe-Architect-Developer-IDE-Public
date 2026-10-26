import type {
  ComponentKind,
  OperationEvent,
  PodTopologySnapshot,
} from './contracts.ts';
import { isSanitizedMessageFlowProjection } from './messageFlow.ts';

export const SUPPORTED_ADMIN_SCHEMA_VERSION = '1.0.0';
export const MAX_OPERATION_SEQUENCE = 10_000_000;
export const MAX_SEQUENCE_JUMP = 10_000;

const GLOBAL_ID = /^(?:[A-Za-z][A-Za-z0-9_.-]*:)?[A-Za-z0-9][A-Za-z0-9_.:/-]{2,127}$/;
const COMPONENT_KINDS = new Set<ComponentKind>(['pod', 'orb', 'satellite', 'umbilical', 'portal']);
const PHASES = new Set<OperationEvent['phase']>(['observed', 'queued', 'running', 'completed', 'fell_short']);
const EVENT_STATUSES = new Set<OperationEvent['status']>(['nominal', 'degraded', 'contained', 'rejected', 'rolled_back']);
const SOURCE_BOUNDARIES = new Set(['replay_fixture', 'live']);
const CONTRACT_AXES = new Set(['valid', 'provisional', 'invalid', 'unknown']);
const ATTACHMENT_AXES = new Set(['attached', 'handshaking', 'detached', 'not_applicable', 'unknown']);
const ACTIVITY_AXES = new Set(['idle', 'observed', 'queued', 'running', 'completed', 'fell_short', 'unknown']);
const EVIDENCE_AXES = new Set(['verified', 'provisional', 'draft', 'missing']);
const HEALTH_AXES = new Set(['nominal', 'degraded', 'contained', 'rejected', 'rolled_back', 'unknown']);

export interface InvalidOperationEvidence {
  eventId?: string;
  sequence?: number;
  operationId?: string;
  routeRefs: string[];
  evidenceRefs: string[];
  issues: string[];
}

export class AdminRuntimeValidationError extends Error {
  public readonly issues: string[];
  public readonly invalidEvent?: InvalidOperationEvidence;

  constructor(message: string, issues: string[], invalidEvent?: InvalidOperationEvidence) {
    super(message);
    this.name = 'AdminRuntimeValidationError';
    this.issues = issues;
    this.invalidEvent = invalidEvent;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && GLOBAL_ID.test(value);
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: readonly string[], label: string, issues: string[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) issues.push(`${label}.${key} is not browser-allowlisted`);
  }
}

function validateEvidence(evidence: unknown, label: string, issues: string[]): void {
  if (!isRecord(evidence)) {
    issues.push(`${label}.evidence must be a sanitized object`);
    return;
  }
  rejectUnknownKeys(evidence, ['trustState', 'observedAt', 'sourceLabel', 'evidenceRefs', 'hashes'], `${label}.evidence`, issues);
  if (!['draft', 'provisional', 'verified'].includes(evidence.trustState as string)) issues.push(`${label}.evidence.trustState is invalid`);
  if (!validTime(evidence.observedAt)) issues.push(`${label}.evidence.observedAt is invalid`);
  if (typeof evidence.sourceLabel !== 'string' || evidence.sourceLabel.length > 80) issues.push(`${label}.evidence.sourceLabel is invalid`);
  if (!Array.isArray(evidence.evidenceRefs) || evidence.evidenceRefs.length > 32 || !evidence.evidenceRefs.every(validId)) {
    issues.push(`${label}.evidence.evidenceRefs is invalid`);
  }
  if (!Array.isArray(evidence.hashes) || evidence.hashes.length > 16
    || !evidence.hashes.every((hash) => typeof hash === 'string' && /^[A-F0-9]{64}$/.test(hash))) {
    issues.push(`${label}.evidence.hashes is invalid`);
  }
}

function validateStatus(status: unknown, label: string, issues: string[], sourceBoundary?: string): void {
  if (!isRecord(status)) {
    issues.push(`${label}.status must be an object`);
    return;
  }
  rejectUnknownKeys(status, ['contract', 'attachment', 'activity', 'evidence', 'health', 'sourceBoundary'], `${label}.status`, issues);
  if (!CONTRACT_AXES.has(status.contract as string)) issues.push(`${label}.status.contract is invalid`);
  if (!ATTACHMENT_AXES.has(status.attachment as string)) issues.push(`${label}.status.attachment is invalid`);
  if (!ACTIVITY_AXES.has(status.activity as string)) issues.push(`${label}.status.activity is invalid`);
  if (!EVIDENCE_AXES.has(status.evidence as string)) issues.push(`${label}.status.evidence is invalid`);
  if (!HEALTH_AXES.has(status.health as string)) issues.push(`${label}.status.health is invalid`);
  if (!SOURCE_BOUNDARIES.has(status.sourceBoundary as string)) issues.push(`${label}.status.sourceBoundary is invalid`);
  if (sourceBoundary && status.sourceBoundary !== sourceBoundary) issues.push(`${label}.status.sourceBoundary does not match snapshot`);
}

function componentKey(kind: ComponentKind, id: string): string {
  return `${kind}\u0000${id}`;
}

export function validatePodTopologySnapshot(candidate: unknown): PodTopologySnapshot {
  const issues: string[] = [];
  if (!isRecord(candidate)) {
    throw new AdminRuntimeValidationError('Invalid operations snapshot', ['snapshot must be an object']);
  }
  if (candidate.schemaVersion !== SUPPORTED_ADMIN_SCHEMA_VERSION) issues.push('snapshot schemaVersion is unsupported');
  if (!validTime(candidate.capturedAt)) issues.push('snapshot capturedAt must be a parseable timestamp');
  if (!SOURCE_BOUNDARIES.has(candidate.sourceBoundary as string)) issues.push('snapshot sourceBoundary is invalid');
  if (!isRecord(candidate.pod)) issues.push('snapshot pod is required');
  if (!Array.isArray(candidate.orbs)) issues.push('snapshot orbs must be an array');
  if (!Array.isArray(candidate.umbilicals)) issues.push('snapshot umbilicals must be an array');
  if (!Array.isArray(candidate.satellites)) issues.push('snapshot satellites must be an array');
  if (!Array.isArray(candidate.portals)) issues.push('snapshot portals must be an array');
  for (const key of ['orbs', 'umbilicals', 'satellites', 'portals'] as const) {
    if (Array.isArray(candidate[key]) && !(candidate[key] as unknown[]).every(isRecord)) {
      issues.push(`snapshot ${key} entries must be objects`);
    }
  }
  if (issues.length) throw new AdminRuntimeValidationError('Invalid operations snapshot', issues);

  const snapshot = candidate as unknown as PodTopologySnapshot;
  const seenIds = new Set<string>();
  const register = (kind: ComponentKind, id: unknown, label: string): id is string => {
    if (!validId(id)) {
      issues.push(`${label} has an invalid global ID`);
      return false;
    }
    if (seenIds.has(id)) issues.push(`${label} reuses global ID ${id}`);
    seenIds.add(id);
    return true;
  };

  if (snapshot.pod.canonical !== true) issues.push('pod projection must remain canonical');
  rejectUnknownKeys(snapshot.pod as unknown as Record<string, unknown>, [
    'canonical', 'schema_version', 'pod_id', 'peer_id', 'displayName', 'runtime', 'tensors',
    'orbIds', 'orbAttachments', 'evidence', 'status',
  ], 'pod', issues);
  if ('core_id' in (snapshot.pod as unknown as Record<string, unknown>)) issues.push('core_id is forbidden; preserve pod_id');
  register('pod', snapshot.pod.pod_id, 'pod');
  if (!validId(snapshot.pod.peer_id)) issues.push('pod peer_id is invalid');
  validateStatus(snapshot.pod.status, 'pod', issues, snapshot.sourceBoundary);
  validateEvidence(snapshot.pod.evidence, 'pod', issues);
  const tensorNames = Object.keys(snapshot.pod.tensors ?? {});
  if (tensorNames.join(',') !== 'PEER,PCT,NCT,SPINE') issues.push('pod tensors must preserve PEER, PCT, NCT, SPINE');

  const orbById = new Map(snapshot.orbs.map((orb) => [orb.orb_id, orb]));
  const umbilicalById = new Map(snapshot.umbilicals.map((umbilical) => [umbilical.umbilical_id, umbilical]));

  snapshot.orbs.forEach((orb, index) => {
    rejectUnknownKeys(orb as unknown as Record<string, unknown>, [
      'canonical', 'schema_version', 'orb_id', 'orb_version', 'pod_id', 'abilityName', 'purpose',
      'runtime', 'capabilities', 'umbilicalIds', 'evidence', 'status',
    ], `orbs[${index}]`, issues);
    register('orb', orb.orb_id, `orbs[${index}]`);
    if (orb.canonical !== true) issues.push(`orbs[${index}] must remain canonical`);
    if (orb.pod_id !== snapshot.pod.pod_id) issues.push(`orbs[${index}] has the wrong pod_id`);
    if (!Array.isArray(orb.umbilicalIds) || !orb.umbilicalIds.every(validId)) {
      issues.push(`orbs[${index}].umbilicalIds is invalid`);
    }
    validateStatus(orb.status, `orbs[${index}]`, issues, snapshot.sourceBoundary);
    validateEvidence(orb.evidence, `orbs[${index}]`, issues);
  });
  snapshot.umbilicals.forEach((umbilical, index) => {
    rejectUnknownKeys(umbilical as unknown as Record<string, unknown>, [
      'canonical', 'schema_version', 'umbilical_id', 'pod_id', 'orb_id', 'attachmentPoint',
      'runtime', 'orbVersionPin', 'evidence', 'status',
    ], `umbilicals[${index}]`, issues);
    register('umbilical', umbilical.umbilical_id, `umbilicals[${index}]`);
    if (umbilical.canonical !== true) issues.push(`umbilicals[${index}] must remain canonical`);
    if (umbilical.pod_id !== snapshot.pod.pod_id || !orbById.has(umbilical.orb_id)) {
      issues.push(`umbilicals[${index}] is outside the declared Pod/Orb relation`);
    }
    const declaredUmbilicals = orbById.get(umbilical.orb_id)?.umbilicalIds;
    if (!Array.isArray(declaredUmbilicals) || !declaredUmbilicals.includes(umbilical.umbilical_id)) {
      issues.push(`umbilicals[${index}] is not declared by its Orb`);
    }
    validateStatus(umbilical.status, `umbilicals[${index}]`, issues, snapshot.sourceBoundary);
    validateEvidence(umbilical.evidence, `umbilicals[${index}]`, issues);
  });
  snapshot.satellites.forEach((satellite, index) => {
    rejectUnknownKeys(satellite as unknown as Record<string, unknown>, [
      'canonical', 'projectionKind', 'satellite_id', 'parent_orb_id', 'pod_id', 'name',
      'capability', 'evidence', 'status',
    ], `satellites[${index}]`, issues);
    register('satellite', satellite.satellite_id, `satellites[${index}]`);
    if (satellite.canonical !== false || !['fixture_satellite', 'conceptual_satellite'].includes(satellite.projectionKind)) {
      issues.push(`satellites[${index}] must be explicitly noncanonical`);
    }
    if (satellite.pod_id !== snapshot.pod.pod_id || !orbById.has(satellite.parent_orb_id)) {
      issues.push(`satellites[${index}] requires a declared parent Orb in this Pod`);
    }
    validateStatus(satellite.status, `satellites[${index}]`, issues, snapshot.sourceBoundary);
    validateEvidence(satellite.evidence, `satellites[${index}]`, issues);
  });
  snapshot.portals.forEach((portal, index) => {
    rejectUnknownKeys(portal as unknown as Record<string, unknown>, [
      'canonical', 'projectionKind', 'schema_version', 'portal_id', 'pod_id', 'name', 'mode',
      'enabled', 'scope', 'boundary', 'tender', 'evidence', 'status',
    ], `portals[${index}]`, issues);
    register('portal', portal.portal_id, `portals[${index}]`);
    if (portal.canonical !== false || portal.projectionKind !== 'conceptual_portal') {
      issues.push(`portals[${index}] must be explicitly conceptual and noncanonical`);
    }
    if (portal.pod_id !== snapshot.pod.pod_id) issues.push(`portals[${index}] has the wrong pod_id`);
    if (portal.tender) {
      if (!isRecord(portal.tender)) {
        issues.push(`portals[${index}].tender must be an object`);
      } else {
        rejectUnknownKeys(portal.tender as unknown as Record<string, unknown>, [
          'canonical', 'projectionKind', 'tender_id', 'portal_id', 'safeguards', 'evidence', 'status',
        ], `portals[${index}].tender`, issues);
      }
      if (portal.tender.canonical !== false || portal.tender.projectionKind !== 'conceptual_tender') {
        issues.push(`portals[${index}].tender must be explicitly conceptual and noncanonical`);
      }
      if (portal.tender.portal_id !== portal.portal_id) issues.push(`portals[${index}].tender has the wrong portal_id`);
      register('portal', portal.tender.tender_id, `portals[${index}].tender`);
      validateStatus(portal.tender.status, `portals[${index}].tender`, issues, snapshot.sourceBoundary);
      validateEvidence(portal.tender.evidence, `portals[${index}].tender`, issues);
    }
    validateStatus(portal.status, `portals[${index}]`, issues, snapshot.sourceBoundary);
    validateEvidence(portal.evidence, `portals[${index}]`, issues);
  });

  const orbAttachments = Array.isArray(snapshot.pod.orbAttachments) ? snapshot.pod.orbAttachments : [];
  if (!Array.isArray(snapshot.pod.orbAttachments) || !snapshot.pod.orbAttachments.every(isRecord)) {
    issues.push('pod orbAttachments must be an object array');
  }
  for (const attachment of orbAttachments) {
    const orb = orbById.get(attachment.orb_id);
    const umbilical = umbilicalById.get(attachment.umbilical_id);
    if (!orb) issues.push(`pod attachment references undeclared Orb ${attachment.orb_id}`);
    if (!umbilical || umbilical.orb_id !== attachment.orb_id || umbilical.pod_id !== snapshot.pod.pod_id) {
      issues.push(`pod attachment does not resolve its Orb/Umbilical relation ${attachment.orb_id}`);
    }
    if (orb && (!Array.isArray(orb.umbilicalIds) || !orb.umbilicalIds.includes(attachment.umbilical_id))) {
      issues.push(`Orb ${attachment.orb_id} does not declare attachment Umbilical ${attachment.umbilical_id}`);
    }
    if (attachment.orb_version_pin && attachment.orb_version_pin !== orb?.orb_version) {
      issues.push(`pod version pin does not match Orb ${attachment.orb_id}`);
    }
    if (umbilical?.orbVersionPin && umbilical.orbVersionPin !== orb?.orb_version) {
      issues.push(`Umbilical version pin does not match Orb ${attachment.orb_id}`);
    }
    if (attachment.orb_version_pin && umbilical?.orbVersionPin
      && attachment.orb_version_pin !== umbilical.orbVersionPin) {
      issues.push(`pod and Umbilical version pins disagree for Orb ${attachment.orb_id}`);
    }
  }
  const podOrbIds = Array.isArray(snapshot.pod.orbIds) ? snapshot.pod.orbIds : [];
  if (!Array.isArray(snapshot.pod.orbIds) || !snapshot.pod.orbIds.every(validId)) issues.push('pod orbIds must contain global IDs');
  if (podOrbIds.length !== orbById.size) issues.push('pod orbIds and Orb declarations do not form a one-to-one set');
  if (podOrbIds.some((orbId) => !orbById.has(orbId))) issues.push('pod orbIds reference undeclared Orbs');
  if (orbAttachments.length !== orbById.size) issues.push('pod attachments and Orb declarations do not form a one-to-one set');
  for (const orb of snapshot.orbs) {
    if (!orbAttachments.some((attachment) => attachment.orb_id === orb.orb_id)) {
      issues.push(`Orb ${orb.orb_id} lacks a Pod attachment`);
    }
  }
  for (const umbilical of snapshot.umbilicals) {
    if (!orbAttachments.some((attachment) => attachment.umbilical_id === umbilical.umbilical_id)) {
      issues.push(`Umbilical ${umbilical.umbilical_id} lacks a Pod attachment`);
    }
  }
  if (issues.length) throw new AdminRuntimeValidationError('Invalid operations snapshot', issues);
  return snapshot;
}

function eventEvidence(candidate: Record<string, unknown>, issues: string[]): InvalidOperationEvidence {
  return {
    eventId: typeof candidate.eventId === 'string' ? candidate.eventId : undefined,
    sequence: typeof candidate.sequence === 'number' ? candidate.sequence : undefined,
    operationId: typeof candidate.operationId === 'string' ? candidate.operationId : undefined,
    routeRefs: Array.isArray(candidate.routeRefs)
      ? candidate.routeRefs.filter((item): item is string => typeof item === 'string').slice(0, 256)
      : [],
    evidenceRefs: Array.isArray(candidate.evidenceRefs)
      ? candidate.evidenceRefs.filter((item): item is string => typeof item === 'string').slice(0, 256)
      : [],
    issues,
  };
}

export function validateOperationEvent(candidate: unknown, snapshot: PodTopologySnapshot): OperationEvent {
  const issues: string[] = [];
  if (!isRecord(candidate)) {
    throw new AdminRuntimeValidationError('Invalid operation event', ['event must be an object']);
  }
  rejectUnknownKeys(candidate, [
    'schemaVersion', 'eventId', 'sequence', 'observedAt', 'operationId', 'podId', 'componentRef',
    'phase', 'status', 'route', 'routeRefs', 'evidenceRefs', 'redactedSummary',
    'messageFlow',
  ], 'event', issues);
  if (candidate.schemaVersion !== SUPPORTED_ADMIN_SCHEMA_VERSION) issues.push('event schemaVersion is unsupported');
  if (!validId(candidate.eventId)) issues.push('eventId is invalid');
  if (!Number.isSafeInteger(candidate.sequence) || (candidate.sequence as number) <= 0 || (candidate.sequence as number) > MAX_OPERATION_SEQUENCE) {
    issues.push('sequence must be a positive bounded safe integer');
  }
  if (!validTime(candidate.observedAt)) issues.push('observedAt must be a parseable timestamp');
  if (!validId(candidate.operationId)) issues.push('operationId is invalid');
  if (candidate.podId !== snapshot.pod.pod_id) issues.push('event podId does not match the active Pod');
  if (!PHASES.has(candidate.phase as OperationEvent['phase'])) issues.push('event phase is invalid');
  if (!EVENT_STATUSES.has(candidate.status as OperationEvent['status'])) issues.push('event status is invalid');
  if (!isRecord(candidate.componentRef)) issues.push('componentRef is required');
  else rejectUnknownKeys(candidate.componentRef, ['kind', 'id', 'parentId'], 'event.componentRef', issues);
  if (!isRecord(candidate.route)) issues.push('route is required');
  else rejectUnknownKeys(candidate.route, ['routeId', 'orderedRefs'], 'event.route', issues);
  if (!Array.isArray(candidate.routeRefs)
    || candidate.routeRefs.length > 64
    || !(candidate.routeRefs as unknown[]).every(validId)) {
    issues.push('routeRefs must contain at most 64 global IDs');
  }
  if (!Array.isArray(candidate.evidenceRefs)
    || candidate.evidenceRefs.length > 256
    || !(candidate.evidenceRefs as unknown[]).every(validId)) {
    issues.push('evidenceRefs must contain at most 256 global IDs');
  }
  if (candidate.redactedSummary !== undefined
    && (typeof candidate.redactedSummary !== 'string' || candidate.redactedSummary.length > 512)) {
    issues.push('redactedSummary must be a bounded string');
  }
  if (candidate.messageFlow !== undefined && !isSanitizedMessageFlowProjection(candidate.messageFlow)) {
    issues.push('messageFlow is outside the sanitized service-flow contract');
  }
  if (issues.length) {
    throw new AdminRuntimeValidationError('Invalid operation event', issues, eventEvidence(candidate, issues));
  }

  const event = candidate as unknown as OperationEvent;
  const componentIds = new Map<string, { kind: ComponentKind; parentId?: string }>();
  componentIds.set(componentKey('pod', snapshot.pod.pod_id), { kind: 'pod' });
  snapshot.orbs.forEach((orb) => componentIds.set(componentKey('orb', orb.orb_id), { kind: 'orb' }));
  snapshot.umbilicals.forEach((umbilical) => componentIds.set(componentKey('umbilical', umbilical.umbilical_id), { kind: 'umbilical', parentId: umbilical.orb_id }));
  snapshot.satellites.forEach((satellite) => componentIds.set(componentKey('satellite', satellite.satellite_id), { kind: 'satellite', parentId: satellite.parent_orb_id }));
  snapshot.portals.forEach((portal) => componentIds.set(componentKey('portal', portal.portal_id), { kind: 'portal' }));

  if (!COMPONENT_KINDS.has(event.componentRef.kind) || !validId(event.componentRef.id)) {
    issues.push('componentRef kind or ID is invalid');
  } else {
    const component = componentIds.get(componentKey(event.componentRef.kind, event.componentRef.id));
    if (!component) issues.push('componentRef is not a member of the active Pod topology');
    if (event.componentRef.kind === 'satellite' && component?.parentId !== event.componentRef.parentId) {
      issues.push('Satellite componentRef parentId does not match its declared parent Orb');
    }
  }

  if (!validId(event.route.routeId)) issues.push('routeId is invalid');
  if (!Array.isArray(event.route.orderedRefs)
    || event.route.orderedRefs.length === 0
    || event.route.orderedRefs.length > 64
    || !event.route.orderedRefs.every(isRecord)) {
    issues.push('route orderedRefs must contain 1 to 64 members');
  } else {
    event.route.orderedRefs.forEach((reference, index) => {
      rejectUnknownKeys(reference as unknown as Record<string, unknown>, ['kind', 'id'], `event.route.orderedRefs[${index}]`, issues);
      if (!COMPONENT_KINDS.has(reference.kind) || !validId(reference.id)) {
        issues.push(`route member ${index} has an invalid kind or ID`);
      } else if (!componentIds.has(componentKey(reference.kind, reference.id))) {
        issues.push(`route member ${index} is not in the active Pod topology`);
      }
    });
    const first = event.route.orderedRefs[0];
    if (first.kind !== 'pod' || first.id !== snapshot.pod.pod_id) issues.push('route must originate at the active Pod');
    if (!event.route.orderedRefs.some((reference) => (
      reference.kind === event.componentRef.kind && reference.id === event.componentRef.id
    ))) issues.push('route does not include the event component');

    for (let index = 1; index < event.route.orderedRefs.length; index += 1) {
      const previous = event.route.orderedRefs[index - 1];
      const current = event.route.orderedRefs[index];
      const transition = `${previous.kind}>${current.kind}`;
      const allowed = new Set(['pod>umbilical', 'umbilical>orb', 'orb>satellite', 'satellite>orb', 'orb>umbilical', 'umbilical>pod', 'pod>portal', 'portal>pod']);
      if (!allowed.has(transition)) issues.push(`route transition ${index - 1}->${index} is invalid`);
      if (transition === 'pod>umbilical') {
        const relation = snapshot.umbilicals.find((item) => item.umbilical_id === current.id);
        if (relation?.pod_id !== previous.id) issues.push(`route transition ${index - 1}->${index} violates Pod ownership`);
      }
      if (transition === 'umbilical>orb') {
        const relation = snapshot.umbilicals.find((item) => item.umbilical_id === previous.id);
        if (relation?.orb_id !== current.id) issues.push(`route transition ${index - 1}->${index} violates Umbilical ownership`);
      }
      if (transition === 'orb>umbilical') {
        const relation = snapshot.umbilicals.find((item) => item.umbilical_id === current.id);
        if (relation?.orb_id !== previous.id) issues.push(`route transition ${index - 1}->${index} violates Umbilical ownership`);
      }
      if (transition === 'orb>satellite') {
        const satellite = snapshot.satellites.find((item) => item.satellite_id === current.id);
        if (satellite?.parent_orb_id !== previous.id) issues.push(`route transition ${index - 1}->${index} violates Satellite parentage`);
      }
      if (transition === 'satellite>orb') {
        const satellite = snapshot.satellites.find((item) => item.satellite_id === previous.id);
        if (satellite?.parent_orb_id !== current.id) issues.push(`route transition ${index - 1}->${index} violates Satellite parentage`);
      }
      if (transition === 'umbilical>pod') {
        const relation = snapshot.umbilicals.find((item) => item.umbilical_id === previous.id);
        if (relation?.pod_id !== current.id) issues.push(`route transition ${index - 1}->${index} violates Pod ownership`);
      }
      if (transition === 'pod>portal') {
        const portal = snapshot.portals.find((item) => item.portal_id === current.id);
        if (portal?.pod_id !== previous.id) issues.push(`route transition ${index - 1}->${index} violates Portal ownership`);
      }
      if (transition === 'portal>pod') {
        const portal = snapshot.portals.find((item) => item.portal_id === previous.id);
        if (portal?.pod_id !== current.id) issues.push(`route transition ${index - 1}->${index} violates Portal ownership`);
      }
    }
  }

  const orderedIds = event.route.orderedRefs.map((reference) => reference.id);
  if (orderedIds.length !== event.routeRefs.length || orderedIds.some((id, index) => id !== event.routeRefs[index])) {
    issues.push('routeRefs must exactly preserve route orderedRefs');
  }
  if (issues.length) {
    throw new AdminRuntimeValidationError('Invalid operation event', issues, eventEvidence(candidate, issues));
  }
  return event;
}
