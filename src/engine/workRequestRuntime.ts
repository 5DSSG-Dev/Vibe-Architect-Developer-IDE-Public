export type WorkImpactClass =
  | 'read_only'
  | 'reversible_local_change'
  | 'external_write'
  | 'deployment'
  | 'identity_security'
  | 'destructive';

export type WorkRequestState =
  | 'PROPOSED'
  | 'CONDUCTOR_APPROVED'
  | 'DISPATCHED'
  | 'ACTUATOR_EMPLOYED'
  | 'COMPLETED'
  | 'REFUSED'
  | 'SHORTFALL';

export interface DocumentSectionInput {
  heading: string;
  body: string;
}

export interface DocumentWorkPayload {
  title: string;
  purpose: string;
  sections: DocumentSectionInput[];
}

export interface WorkAuthority {
  requestedBy: string;
  approvedBy?: string;
  approvalRef?: string;
}

export interface WorkRequest {
  workRequestId: string;
  createdAt: string;
  intent: string;
  requestedCapability: 'document.markdown.compose' | string;
  scope: string[];
  impact: WorkImpactClass;
  authority: WorkAuthority;
  payload: DocumentWorkPayload;
}

export interface ActuatorManifest {
  actuatorId: string;
  name: string;
  hostSatelliteId: string;
  capability: 'document.markdown.compose';
  permittedActions: readonly ['artifact:create_in_memory'];
  outputMediaType: 'text/markdown';
  version: string;
}

export interface WorkArtifact {
  artifactId: string;
  fileName: string;
  mediaType: 'text/markdown';
  content: string;
  sha256: string;
  producedByActuatorId: string;
}

export type WorkLedgerStage =
  | 'WORK_REQUEST_CREATED'
  | 'CONDUCTOR_ANALYZED'
  | 'ORBITAL_DISPATCHED'
  | 'SATELLITE_ASSIGNED'
  | 'ACTUATOR_EMPLOYED'
  | 'ARTIFACT_PRODUCED'
  | 'ASSURANCE_VERIFIED'
  | 'ACTUATOR_STOOD_DOWN'
  | 'SATELLITE_RECEIVED_EVIDENCE'
  | 'ORBITAL_RETURNED_EVIDENCE'
  | 'CONDUCTOR_RECEIVED_EVIDENCE'
  | 'WORK_REQUEST_REFUSED'
  | 'SHORTFALL_RECORDED';

export interface WorkLedgerEntry {
  sequence: number;
  eventId: string;
  workRequestId: string;
  stage: WorkLedgerStage;
  actorId: string;
  observedAt: string;
  summary: string;
  evidence: Record<string, unknown>;
  previousHash: string | null;
  entryHash: string;
}

export interface WorkExecutionResult {
  state: WorkRequestState;
  workRequest: WorkRequest;
  conductorDecision: {
    coherent: boolean;
    reasons: string[];
  };
  dispatcherOrbId?: string;
  satelliteId?: string;
  actuatorId?: string;
  artifact?: WorkArtifact;
  ledger: WorkLedgerEntry[];
}

const WORK_STAGE_TRANSITIONS = new Map<WorkLedgerStage | null, ReadonlySet<WorkLedgerStage>>([
  [null, new Set(['WORK_REQUEST_CREATED'])],
  ['WORK_REQUEST_CREATED', new Set(['CONDUCTOR_ANALYZED'])],
  ['CONDUCTOR_ANALYZED', new Set(['ORBITAL_DISPATCHED', 'WORK_REQUEST_REFUSED', 'SHORTFALL_RECORDED'])],
  ['ORBITAL_DISPATCHED', new Set(['SATELLITE_ASSIGNED'])],
  ['SATELLITE_ASSIGNED', new Set(['ACTUATOR_EMPLOYED', 'SHORTFALL_RECORDED'])],
  ['ACTUATOR_EMPLOYED', new Set(['ARTIFACT_PRODUCED'])],
  ['ARTIFACT_PRODUCED', new Set(['ACTUATOR_STOOD_DOWN'])],
  ['ACTUATOR_STOOD_DOWN', new Set(['ASSURANCE_VERIFIED', 'SHORTFALL_RECORDED'])],
  ['ASSURANCE_VERIFIED', new Set(['SATELLITE_RECEIVED_EVIDENCE'])],
  ['SATELLITE_RECEIVED_EVIDENCE', new Set(['ORBITAL_RETURNED_EVIDENCE'])],
  ['ORBITAL_RETURNED_EVIDENCE', new Set(['CONDUCTOR_RECEIVED_EVIDENCE'])],
  ['CONDUCTOR_RECEIVED_EVIDENCE', new Set()],
  ['WORK_REQUEST_REFUSED', new Set()],
  ['SHORTFALL_RECORDED', new Set()],
]);

export const DISPATCHER_ORB_ID = 'orb-dispatcher';
export const CONSTRUCTOR_SATELLITE_ID = 'satellite-constructor-docs';

export const DOCS_BUILDER_ACTUATOR: ActuatorManifest = Object.freeze({
  actuatorId: 'actuator-docs-builder-v1',
  name: 'Docs Builder Actuator',
  hostSatelliteId: CONSTRUCTOR_SATELLITE_ID,
  capability: 'document.markdown.compose',
  permittedActions: ['artifact:create_in_memory'] as const,
  outputMediaType: 'text/markdown',
  version: '1.0.0'
});

const MUTATING_IMPACTS = new Set<WorkImpactClass>([
  'reversible_local_change',
  'external_write',
  'deployment',
  'identity_security',
  'destructive'
]);

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function safeFileStem(value: string): string {
  const stem = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return stem || 'work-request-artifact';
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto SHA-256 is unavailable in this runtime.');
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createWorkRequest(input: Omit<WorkRequest, 'workRequestId' | 'createdAt'>): WorkRequest {
  const sections = input.payload.sections.map((section, index) => ({
    heading: requireText(section.heading, `payload.sections[${index}].heading`),
    body: requireText(section.body, `payload.sections[${index}].body`)
  }));
  if (sections.length === 0) throw new Error('payload.sections requires at least one section.');

  return {
    ...input,
    workRequestId: globalThis.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    intent: requireText(input.intent, 'intent'),
    requestedCapability: requireText(input.requestedCapability, 'requestedCapability'),
    scope: input.scope.map((item, index) => requireText(item, `scope[${index}]`)),
    authority: {
      requestedBy: requireText(input.authority.requestedBy, 'authority.requestedBy'),
      approvedBy: input.authority.approvedBy?.trim() || undefined,
      approvalRef: input.authority.approvalRef?.trim() || undefined
    },
    payload: {
      title: requireText(input.payload.title, 'payload.title'),
      purpose: requireText(input.payload.purpose, 'payload.purpose'),
      sections
    }
  };
}

function analyzeByConductor(request: WorkRequest): { coherent: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!request.scope.includes('workspace:artifact:markdown')) {
    reasons.push('Work Request scope does not permit Markdown artifact creation.');
  }
  if (MUTATING_IMPACTS.has(request.impact)) {
    if (!request.authority.approvedBy || !request.authority.approvalRef) {
      reasons.push('A mutating Work Request requires explicit approval attribution.');
    }
  }
  if (request.impact !== 'read_only' && request.impact !== 'reversible_local_change') {
    reasons.push(`Docs Builder cannot accept impact class ${request.impact}.`);
  }
  return { coherent: reasons.length === 0, reasons };
}

function composeMarkdown(payload: DocumentWorkPayload, request: WorkRequest): string {
  const sections = payload.sections
    .map((section) => `## ${section.heading}\n\n${section.body}`)
    .join('\n\n');
  return [
    `# ${payload.title}`,
    '',
    `> Purpose: ${payload.purpose}`,
    '',
    `Work Request: \`${request.workRequestId}\``,
    '',
    sections,
    ''
  ].join('\n');
}

async function createLedgerAppender(workRequestId: string) {
  const entries: WorkLedgerEntry[] = [];
  return {
    entries,
    append: async (
      stage: WorkLedgerStage,
      actorId: string,
      summary: string,
      evidence: Record<string, unknown> = {}
    ) => {
      const body = {
        sequence: entries.length + 1,
        eventId: globalThis.crypto.randomUUID(),
        workRequestId,
        stage,
        actorId,
        observedAt: new Date().toISOString(),
        summary,
        evidence,
        previousHash: entries.length > 0 ? entries[entries.length - 1].entryHash : null
      };
      const entry: WorkLedgerEntry = {
        ...body,
        entryHash: await sha256Hex(canonicalJson(body))
      };
      entries.push(entry);
      return entry;
    }
  };
}

export async function verifyWorkLedger(entries: readonly WorkLedgerEntry[]): Promise<boolean> {
  let previousHash: string | null = null;
  let previousStage: WorkLedgerStage | null = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (
      entry.sequence !== index + 1
      || entry.previousHash !== previousHash
      || !WORK_STAGE_TRANSITIONS.get(previousStage)?.has(entry.stage)
    ) return false;
    const { entryHash, ...body } = entry;
    if (await sha256Hex(canonicalJson(body)) !== entryHash) return false;
    previousHash = entryHash;
    previousStage = entry.stage;
  }
  return true;
}

export async function executeWorkRequest(
  request: WorkRequest,
  actuator: ActuatorManifest = DOCS_BUILDER_ACTUATOR
): Promise<WorkExecutionResult> {
  const ledger = await createLedgerAppender(request.workRequestId);
  await ledger.append('WORK_REQUEST_CREATED', request.authority.requestedBy, 'Work Request recorded.', {
    capability: request.requestedCapability,
    impact: request.impact
  });

  const conductorDecision = analyzeByConductor(request);
  await ledger.append('CONDUCTOR_ANALYZED', 'conductor', conductorDecision.coherent
    ? 'Work Request is coherent for bounded execution.'
    : 'Work Request is not coherent for execution.', { reasons: conductorDecision.reasons });

  if (!conductorDecision.coherent) {
    await ledger.append('WORK_REQUEST_REFUSED', 'conductor', 'Execution refused; no Actuator was employed.');
    return { state: 'REFUSED', workRequest: request, conductorDecision, ledger: ledger.entries };
  }

  if (request.requestedCapability !== actuator.capability) {
    await ledger.append('SHORTFALL_RECORDED', DISPATCHER_ORB_ID, 'No registered Satellite/Actuator route provides the requested capability.', {
      requestedCapability: request.requestedCapability
    });
    return {
      state: 'SHORTFALL',
      workRequest: request,
      conductorDecision,
      dispatcherOrbId: DISPATCHER_ORB_ID,
      ledger: ledger.entries
    };
  }

  await ledger.append('ORBITAL_DISPATCHED', DISPATCHER_ORB_ID, 'Conductor routed the Work Request to the Dispatcher Orb.');
  await ledger.append('SATELLITE_ASSIGNED', CONSTRUCTOR_SATELLITE_ID, 'Dispatcher Orb assigned the Constructor Satellite.');

  if (actuator.hostSatelliteId !== CONSTRUCTOR_SATELLITE_ID) {
    await ledger.append('SHORTFALL_RECORDED', CONSTRUCTOR_SATELLITE_ID, 'Actuator host relation does not match the assigned Satellite.', {
      actuatorId: actuator.actuatorId,
      declaredHostSatelliteId: actuator.hostSatelliteId
    });
    return {
      state: 'SHORTFALL',
      workRequest: request,
      conductorDecision,
      dispatcherOrbId: DISPATCHER_ORB_ID,
      satelliteId: CONSTRUCTOR_SATELLITE_ID,
      ledger: ledger.entries
    };
  }

  await ledger.append('ACTUATOR_EMPLOYED', actuator.actuatorId, 'Constructor Satellite employed the Docs Builder Actuator.', {
    permittedActions: actuator.permittedActions
  });

  const content = composeMarkdown(request.payload, request);
  const artifactHash = await sha256Hex(content);
  const artifact: WorkArtifact = {
    artifactId: `artifact-${request.workRequestId}`,
    fileName: `${safeFileStem(request.payload.title)}.md`,
    mediaType: actuator.outputMediaType,
    content,
    sha256: artifactHash,
    producedByActuatorId: actuator.actuatorId
  };
  await ledger.append('ARTIFACT_PRODUCED', actuator.actuatorId, 'Docs Builder produced a bounded in-memory Markdown artifact.', {
    artifactId: artifact.artifactId,
    fileName: artifact.fileName,
    sha256: artifact.sha256
  });
  await ledger.append('ACTUATOR_STOOD_DOWN', actuator.actuatorId, 'Docs Builder Actuator completed its bounded function and stood down.', {
    retainedExternalAccess: false,
    retainedWorkspaceWriteAccess: false
  });

  const assurancePassed = artifact.content.length > 0
    && artifact.mediaType === 'text/markdown'
    && artifact.fileName.endsWith('.md')
    && await sha256Hex(artifact.content) === artifact.sha256;
  if (!assurancePassed) {
    await ledger.append('SHORTFALL_RECORDED', 'assurance', 'Artifact verification failed.', {
      artifactId: artifact.artifactId
    });
    return {
      state: 'SHORTFALL',
      workRequest: request,
      conductorDecision,
      dispatcherOrbId: DISPATCHER_ORB_ID,
      satelliteId: CONSTRUCTOR_SATELLITE_ID,
      actuatorId: actuator.actuatorId,
      artifact,
      ledger: ledger.entries
    };
  }

  await ledger.append('ASSURANCE_VERIFIED', 'assurance', 'Artifact digest, type, and declared output were independently verified.', {
    artifactId: artifact.artifactId,
    sha256: artifact.sha256
  });
  await ledger.append('SATELLITE_RECEIVED_EVIDENCE', CONSTRUCTOR_SATELLITE_ID, 'Constructor Satellite received the verified Actuator evidence.', {
    actuatorId: actuator.actuatorId,
    artifactId: artifact.artifactId
  });
  await ledger.append('ORBITAL_RETURNED_EVIDENCE', DISPATCHER_ORB_ID, 'Constructor Satellite returned evidence to the Dispatcher Orb.', {
    satelliteId: CONSTRUCTOR_SATELLITE_ID,
    artifactId: artifact.artifactId
  });
  await ledger.append('CONDUCTOR_RECEIVED_EVIDENCE', 'conductor', 'Dispatcher Orb returned the completed evidence packet to the Conductor.', {
    dispatcherOrbId: DISPATCHER_ORB_ID,
    artifactId: artifact.artifactId,
    artifactSha256: artifact.sha256
  });

  return {
    state: 'COMPLETED',
    workRequest: request,
    conductorDecision,
    dispatcherOrbId: DISPATCHER_ORB_ID,
    satelliteId: CONSTRUCTOR_SATELLITE_ID,
    actuatorId: actuator.actuatorId,
    artifact,
    ledger: ledger.entries
  };
}
