import 'dotenv/config';
import { createGateway } from './app.js';
import { loadConfig } from './config.js';
import { MsalEntraAuth } from './entra-auth.js';
import { InMemorySessionStore, RedisSessionStore } from './session-store.js';
import { ReplayOperationsProvider } from './replay-operations-provider.js';
import { InMemoryEvidenceStore, RedisEvidenceStore } from './evidence-store.js';
import { createLocalGauge } from './luminary-pipeline/gauge-local.js';
import { createLocalIdsWriter } from './luminary-pipeline/ids-local.js';
import { ReviewRecord } from './governance-record/review.js';
import { rehearsalAskModel } from './luminary-rehearsal.js';
import { LuminaryExecutor } from './luminary-executor.js';
import { readFileSync } from 'node:fs';
import { createMetaAskModel, parseLiveSourceEnv } from './luminary-meta.js';
import { loadLuminaryKnowledge, systemPromptWithKnowledge } from './luminary-knowledge.js';

const config = loadConfig();
// A live reply source: Meta's Model API (STP-0002 P21) or Baseten's Muse Spark Open (P22). The key
// and the Architect's ceiling come from .env. The system message is the P15 Instructions followed by
// the P23 Knowledge Pack, the IDE's own Element descriptions.
const liveSource = config.luminaryReplySource === 'meta' || config.luminaryReplySource === 'baseten' ? config.luminaryReplySource : undefined;
const meta = liveSource ? parseLiveSourceEnv(liveSource, process.env) : undefined;
const knowledge = meta ? loadLuminaryKnowledge() : undefined;
const metaAskModel = meta && knowledge
  ? createMetaAskModel({ ...meta, systemPrompt: systemPromptWithKnowledge(readFileSync(new URL('../docs/VIBE_LUMINARY_INSTRUCTIONS_v0.1.md', import.meta.url), 'utf8'), knowledge) })
  : undefined;
// The review areas (STP-0005 P3): private, in the Architect's own profile unless set otherwise.
const record = await ReviewRecord.open({ dir: config.governanceRecordDir, backupDir: config.governanceBackupDir });
if (record.closed) console.warn(`Governance is closed until the Architect sees the review record check: ${record.problems.map((p) => p.detail).join(' ')}`);
const evidenceStore = config.redisUrl
  ? await RedisEvidenceStore.connect(config.redisUrl)
  : new InMemoryEvidenceStore();
const sessions = await (async () => {
  try {
    return config.redisUrl
      ? await RedisSessionStore.connect(config.redisUrl)
      : new InMemorySessionStore();
  } catch (error) {
    await evidenceStore.close?.();
    throw error;
  }
})();
let app;
try {
  app = await createGateway({
    config,
    sessions,
    entra: new MsalEntraAuth(config),
    operationsProvider: new ReplayOperationsProvider(),
    evidenceStore,
    // The IDS embedded model runs on the gauge's local runtime and model (STP-0005 P2).
    record,
    gauge: config.luminaryGauge
      ? { ...createLocalGauge(config.luminaryGauge), ids: createLocalIdsWriter({ endpoint: config.luminaryGauge.endpoint, model: config.luminaryGauge.model }) }
      : undefined,
    askModel: config.luminaryReplySource === 'rehearsal' ? rehearsalAskModel : metaAskModel,
    replySource: meta ? (liveSource === 'baseten' ? 'Muse Spark Open · Baseten' : `Meta · ${meta.model}`) : config.luminaryReplySource,
    spend: meta?.ledger,
    knowledge: knowledge ? { version: knowledge.version, sha256: knowledge.sha256, bytes: knowledge.bytes } : undefined,
    executor: config.luminaryExecutor ? new LuminaryExecutor({ repoRoot: process.cwd() }) : undefined,
  });
} catch (error) {
  await Promise.allSettled([sessions.close?.(), evidenceStore.close?.()]);
  throw error;
}

const server = app.listen(config.port, () => {
  console.log(`AEGIS Architect gateway listening at ${config.origin}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(async () => {
      await Promise.allSettled([sessions.close?.(), evidenceStore.close?.()]);
      process.exit(0);
    });
  });
}
