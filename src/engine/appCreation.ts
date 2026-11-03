import type { CreationLedgerEntry } from './creationLedger';
import { createBuildPlan } from './appBuildPlan';
import { resolveOrbManifest } from '../contracts/orbManifest';
import { createInitialCoreManifest, ensureElementCodeFrame, type ApothecaryItem, type CoreManifest } from './relationEngine';
import { executeUmbilicalHandshake, severConnection } from './connectionRuntime';
import { getAvailableCoreResources, getCoreRuntimeCapabilities } from './coreCapabilities';

export const APP_TYPES = ['Web App', 'Database', 'Desktop App', 'Mobile App', 'Browser Extension', 'API / Service', 'Library / Package', 'Automation', 'Other'] as const;
export const CRYSTAL_FILES = ['AEGIS_POD_CRYSTAL.glb', 'CORE_CRYSTAL_CAGED.glb', 'CORE_CRYSTAL_CAGED2.glb', 'crystals.glb'] as const;
export interface AppProposal {
  name: string; appType: string; purpose: string; crystalModel: string;
  elements: { id: string; parentId: string | null; reason: string }[];
  gaps: string[];
}
export interface DecisionChoice { question: string; options: string[]; recommended?: string }
export interface CreationAnswer { message: string; questions: string[]; decisionChoices: DecisionChoice[]; suggestions: string[]; proposal: AppProposal | null }
function text(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw Error('Luminary returned an invalid or oversized text field.');
  return value.trim();
}
function texts(value: unknown, max = 8): string[] {
  if (!Array.isArray(value) || value.length > max) throw Error('Luminary returned an invalid list.');
  return value.map(v => text(v, 700));
}
function canConnectOrb(item: ApothecaryItem): boolean {
  const resolution = resolveOrbManifest(ensureElementCodeFrame(item).umbilicalContractRef);
  return Boolean(resolution.ok && resolution.manifest?.orbId === item.id && resolution.manifest?.orbVersion === item.version);
}
export function validateProposal(raw: unknown, catalog: ApothecaryItem[]): AppProposal {
  if (!raw || typeof raw !== 'object') throw Error('The app proposal is missing.');
  const p = raw as AppProposal;
  const name = text(p.name, 80), purpose = text(p.purpose);
  if (!(APP_TYPES as readonly string[]).includes(p.appType) || !(CRYSTAL_FILES as readonly string[]).includes(p.crystalModel)) throw Error('The app type or crystal is unavailable.');
  if (!Array.isArray(p.elements) || p.elements.length > 32) throw Error('Choose at most 32 Elements in one starting architecture.');
  const byId = new Map(catalog.map(item => [item.id, item]));
  const selected = new Map<string, ApothecaryItem>();
  const elements = p.elements.map(entry => {
    if (!entry || typeof entry !== 'object') throw Error('Invalid Element selection.');
    const id = text(entry.id, 160), item = byId.get(id);
    if (!item || !['Orbs', 'Satellites', 'Actuators'].includes(item.category) || selected.has(id)) throw Error('A proposed Element is unavailable or duplicated.');
    if (item.category === 'Orbs' && !canConnectOrb(item)) throw Error(`${item.name} needs a registered Orb contract before it can be included.`);
    selected.set(id, item);
    if (entry.parentId !== null && typeof entry.parentId !== 'string') throw Error('Invalid parent relationship.');
    return { id, parentId: entry.parentId, reason: text(entry.reason, 700) };
  });
  const orbs = elements.filter(e => selected.get(e.id)!.category === 'Orbs');
  if (orbs.length === 0 || orbs.length > 8) throw Error('A starting app needs between one and eight Orbs.');
  for (const e of elements) {
    const category = selected.get(e.id)!.category;
    if (category === 'Orbs' && e.parentId !== null) throw Error('Orbs connect directly to the CORE.');
    if (category !== 'Orbs' && (!e.parentId || selected.get(e.parentId)?.category !== (category === 'Satellites' ? 'Orbs' : 'Satellites'))) throw Error('Satellites need a selected Orb; Actuators need a selected Satellite.');
  }
  return { name, purpose, appType: p.appType, crystalModel: p.crystalModel, elements, gaps: texts(p.gaps) };
}
export function parseCreationAnswer(raw: string, catalog: ApothecaryItem[]): CreationAnswer {
  if (raw.length > 24_000) throw Error('The proposal is too large. Ask for a smaller starting architecture.');
  const body = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let p: CreationAnswer;
  try { p = JSON.parse(body); } catch { throw Error('Luminary did not return a readable proposal. Your workspace is unchanged; try again.'); }
  if (!p || typeof p !== 'object') throw Error('Luminary returned an invalid proposal.');
  // Some live replies wrap question text in an object despite the requested string array.
  const rawQuestions = p.questions;
  if (!Array.isArray(rawQuestions)) throw Error('Luminary returned an invalid question list.');
  const questions = texts(rawQuestions.map(value => value && typeof value === 'object'
    ? (value as { question?: unknown; text?: unknown; prompt?: unknown }).question
      ?? (value as { text?: unknown }).text ?? (value as { prompt?: unknown }).prompt
    : value), 8);
  const rawChoices = (p as CreationAnswer).decisionChoices;
  if (rawChoices !== undefined && (!Array.isArray(rawChoices) || rawChoices.length > questions.length)) throw Error('Luminary returned invalid question choices.');
  const decisionChoices = (rawChoices ?? []).map(choice => {
    if (!choice || typeof choice !== 'object') throw Error('Luminary returned invalid question choices.');
    const question = text(choice.question, 700), options = texts(choice.options, 4);
    if (!questions.includes(question) || options.length < 2 || new Set(options).size !== options.length || (choice.recommended !== undefined && !options.includes(choice.recommended))) throw Error('Luminary returned choices that do not match its open questions.');
    return { question, options, ...(choice.recommended ? { recommended: choice.recommended } : {}) };
  });
  if (new Set(decisionChoices.map(choice => choice.question)).size !== decisionChoices.length) throw Error('Luminary repeated a question choice.');
  return { message: text(p.message), questions, decisionChoices, suggestions: texts(p.suggestions, 4), proposal: p.proposal === null ? null : validateProposal(p.proposal, catalog) };
}
export function createBlankApp(): CoreManifest {
  const base = createInitialCoreManifest();
  return { ...base, coreId: `app-${crypto.randomUUID()}`, name: 'Untitled App', version: '0.1.0', appCreation: 'draft',
    activeDaemons: { steward: false, advocate: false, temporal: false, conductor: false }, contracts: [], portals: [],
    sockets: base.sockets.map(({ connectedItem, attachedSatellites, contractId, resolvedProfileId, resolvedProfileVersion, ...socket }) => ({ ...socket, state: 'Vacant' })) };
}
/** Only call after Architect acceptance. Every Orb traverses the existing runtime handshake. */
export function connectAppProposal(raw: AppProposal, blank: CoreManifest, catalog: ApothecaryItem[], decisions = ''): { manifest: CoreManifest; catalog: ApothecaryItem[] } {
  const p = validateProposal(raw, catalog);
  if (blank.appCreation !== 'draft' || blank.contracts.length || blank.sockets.some(s => s.connectedItem)) throw Error('Start a new, empty app before applying an architecture.');
  const chosen = new Map(p.elements.map(e => [e.id, ensureElementCodeFrame({ ...catalog.find(i => i.id === e.id)! })]));
  for (const e of p.elements) {
    const item = chosen.get(e.id)!;
    if (item.category === 'Orbs') item.satellites = p.elements.filter(c => c.parentId === e.id).map(c => c.id);
    if (item.category === 'Satellites') item.actuators = p.elements.filter(c => c.parentId === e.id).map(c => c.id);
  }
  let manifest: CoreManifest = { ...blank, name: p.name, appCreation: 'ready', appBuildPlan: createBuildPlan(p, decisions), sockets: blank.sockets.map(s => ({ ...s })), contracts: [],
    appConfiguration: { appType: p.appType, purpose: p.purpose, crystalModel: p.crystalModel, updatedAt: new Date().toISOString() } };
  const issued: string[] = [];
  try {
    for (const item of chosen.values()) {
      if (item.category !== 'Orbs') continue;
      const socket = manifest.sockets.find(s => s.state === 'Vacant');
      if (!socket) throw Error('There are no free CORE ports.');
      const contract = executeUmbilicalHandshake(item, socket, { availableCapabilities: getCoreRuntimeCapabilities(manifest), availableResources: getAvailableCoreResources(manifest), coreManifest: manifest });
      issued.push(contract.contractId);
      if (contract.handshakeStatus !== 'SUCCESS') throw Error(`${item.name}: ${contract.failureReason ?? 'connection refused'}`);
      manifest = { ...manifest, contracts: [...manifest.contracts, contract], sockets: manifest.sockets.map(s => s.id !== socket.id ? s : { ...s, state: 'Active', connectedItem: item,
        attachedSatellites: p.elements.filter(e => e.parentId === item.id).map(e => chosen.get(e.id)!), contractId: contract.contractId, resolvedProfileId: contract.resolvedProfileId, resolvedProfileVersion: contract.resolvedProfileVersion }) };
    }
    return { manifest, catalog: catalog.map(item => chosen.get(item.id) ?? item) };
  } catch (error) {
    for (const id of issued) { try { severConnection(id, 'App proposal connection rolled back', { initiatorConsent: true, receptorConsent: true }); } catch { /* A refused handshake may not have a lifecycle entry. */ } }
    throw error;
  }
}
export function creationPrompt(turns: { role: string; text: string }[], catalog: ApothecaryItem[], ledger: CreationLedgerEntry[] = []): string {
  const available = catalog
    .filter(item => ['Orbs', 'Satellites', 'Actuators'].includes(item.category) && (item.category !== 'Orbs' || canConnectOrb(item)))
    .map(item => ({ id: item.id, name: item.name, category: item.category, description: item.description.slice(0, 100) }));
  const instructions = [
    'ROLE: Luminary, an application-planning companion. Return only one compact JSON object, no markdown or explanations outside JSON. Keep model reasoning short; do not print reasoning.',
    'Respect the Architect and preserve the exact purpose of all agreed requirements. The ledger is authoritative: every distinct requirement must appear once in the final purpose, Element reason, or a concrete build gap; never silently omit, invent, or double-count a requirement.',
    'QUESTIONS: Ask all essential design questions that remain unresolved together in one batch of at most 8 focused questions. Questions are strings, not objects. For each question supply decisionChoices with 2-4 short options and a recommended option when sound. Recognize explicit answers and acceptance of recommended defaults. Do not re-ask resolved choices. Use sensible defaults for ordinary implementation details (empty states, sorting ties, pagination, timestamps, form placement) without asking. If essential decisions are unanswered, proposal=null; After the Architect answers the batch, present the proposal unless a new essential blocker makes another decision necessary.',
    'SCOPE: Do not claim an Element, generated app, or runtime behavior has already been built, connected, verified, or accepted. Build gaps list only essential work necessary to satisfy the Architect explicit requirements; each names the required missing capability, affected Elements, concrete create/edit action in the Apothecary and what to verify. Keep unrequested enhancements in suggestions, not gaps. When discussing gaps preserve the existing proposal unless the Architect requests a change.',
    'PROPOSAL: Use only the provided catalog IDs. Pick 1-8 Orbs and at most 32 Elements; Orbs have parentId=null, Satellites reference selected Orbs, Actuators selected Satellites. Acceptance connects architecture, but code generation and deployment happen separately. Make each Element reason concise and specific. List all required implementation work still missing as concrete ToDo gaps, never inventing unavailable catalog IDs. Keep names, purposes and gaps succinct; include enough detail to preserve every requirement.',
    'SUGGESTIONS: Include 0-3 distinct optional enhancements as short, user-facing phrases (3-8 words, <=70 characters each), never repeating already requested features. The interface shows suggestions separately, so do not echo them in message.',
    'RESPONSE SCHEMA: {"message":"brief response to Architect","questions":["an unanswered essential question"],"decisionChoices":[{"question":"exact text matching question","options":["A","B"],"recommended":"A"}],"suggestions":["optional idea"],"proposal":null}. When ready, questions=[], decisionChoices=[], proposal={"name":"short name","appType":"allowed type","purpose":"agreed purpose","crystalModel":"allowed filename","elements":[{"id":"catalog ID","parentId":null,"reason":"brief reason"}],"gaps":["concrete work and verification"]}. Keep every field present and return parseable JSON only.',
  ];
  return [
    ...instructions,
    'ALLOWED APP TYPES: ' + JSON.stringify(APP_TYPES),
    'ALLOWED CORE CRYSTALS: ' + JSON.stringify(CRYSTAL_FILES),
    'CATALOG: ' + JSON.stringify(available),
    'Architect requirement-and-decision ledger (ordered; all entries count): ' + JSON.stringify(ledger),
    'COMPLETE CONVERSATION (later Architect messages may clarify earlier ones): ' + JSON.stringify(turns)
  ].join('\n\n');
}
