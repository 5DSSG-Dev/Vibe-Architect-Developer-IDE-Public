import 'dotenv/config';
import { createGateway } from './app.js';
import { loadConfig } from './config.js';
import { MsalEntraAuth } from './entra-auth.js';
import { InMemorySessionStore, RedisSessionStore } from './session-store.js';
import { ReplayOperationsProvider } from './replay-operations-provider.js';
import { InMemoryEvidenceStore, RedisEvidenceStore } from './evidence-store.js';
import { createLocalGauge } from './luminary-pipeline/gauge-local.js';
import { rehearsalAskModel } from './luminary-rehearsal.js';
import { LuminaryExecutor } from './luminary-executor.js';
import { readFileSync } from 'node:fs';
import { createMetaAskModel, parseMetaLiveEnv } from './luminary-meta.js';

const config = loadConfig();
// The live Meta reply source (STP-0002 P21): the key and the Architect's ceiling come from .env, and
// the P15 Instructions are the system message, as in the smoke test.
const meta = config.luminaryReplySource === 'meta' ? parseMetaLiveEnv(process.env) : undefined;
const metaAskModel = meta
  ? createMetaAskModel({ ...meta, systemPrompt: readFileSync(new URL('../docs/VIBE_LUMINARY_INSTRUCTIONS_v0.1.md', import.meta.url), 'utf8') })
  : undefined;
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
    gauge: config.luminaryGauge ? createLocalGauge(config.luminaryGauge) : undefined,
    askModel: config.luminaryReplySource === 'rehearsal' ? rehearsalAskModel : metaAskModel,
    replySource: meta ? `Meta · ${meta.model}` : config.luminaryReplySource,
    spend: meta?.ledger,
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
