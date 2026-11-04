import { productionFiles } from './applicationProduction.js';
import type { CoreManifest, ApothecaryItem } from './relationEngine';
import { generateApplication } from './applicationGenerator.js';
import { parseProductionAnswer, productionContext, validateProductionContext, type ProductionAnswer, type ProductionContext } from './applicationProduction.js';

/** Data-only CORE program. Opening or importing it never runs source. */
export interface CoreApplication {
  version: 1;
  generationId: string;
  sourceDigest: string;
  contextHash: string;
  context: ProductionContext;
  answer: ProductionAnswer;
}
export async function applicationHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
export function validateCoreApplication(raw: unknown): CoreApplication {
  const app = raw as CoreApplication;
  if (!app || app.version !== 1 || typeof app.generationId !== 'string' || !/^[0-9a-f-]{36}$/.test(app.generationId)
    || typeof app.sourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(app.sourceDigest)
    || typeof app.contextHash !== 'string' || !/^[a-f0-9]{64}$/.test(app.contextHash)
    || JSON.stringify(raw).length > 300000) throw Error('Invalid saved CORE application.');
  const context = validateProductionContext(app.context);
  const answer = parseProductionAnswer(JSON.stringify(app.answer), context);
  return { version: 1, generationId: app.generationId, sourceDigest: app.sourceDigest, contextHash: app.contextHash, context, answer };
}
export async function verifyCoreApplication(raw: unknown, current: ProductionContext): Promise<CoreApplication> {
  const app = validateCoreApplication(raw);
  if (JSON.stringify(validateProductionContext(current)) !== JSON.stringify(app.context)) throw Error('The architecture changed. Generate, review and save a new CORE program.');
  const files = productionFiles(app.answer);
  const digest = await applicationHash(Object.keys(files).sort().map(path => [path, files[path]]));
  if (digest !== app.sourceDigest || await applicationHash(app.context) !== app.contextHash) throw Error('The saved CORE program does not match its generation evidence.');
  return app;
}
export function acceptedCoreContext(core: CoreManifest, catalog: ApothecaryItem[]): ProductionContext {
  if (core.appCreation !== 'ready' || !core.appBuildPlan) throw Error('Explicitly accept the architecture before saving or restoring a CORE app.');
  for (const socket of core.sockets) if (socket.connectedItem && !core.contracts.some(c => c.contractId === socket.contractId && c.handshakeStatus === 'SUCCESS' && c.sourceItemId === socket.connectedItem!.id && c.targetSocketId === socket.id)) {
    throw Error('Restore the accepted Orb contract before saving or restoring a CORE app.');
  }
  return productionContext(core, catalog);
}
export async function saveCoreApplication(core: CoreManifest, catalog: ApothecaryItem[], receipt: {
  id: string; digest: string; contextHash: string; answer: ProductionAnswer;
}): Promise<CoreApplication> {
  const context = acceptedCoreContext(core, catalog);
  if (await applicationHash(context) !== receipt.contextHash) throw Error('The architecture changed. Generate and review again before saving to CORE.');
  return verifyCoreApplication({ version: 1, generationId: receipt.id, sourceDigest: receipt.digest, contextHash: receipt.contextHash, context, answer: receipt.answer }, context);
}
