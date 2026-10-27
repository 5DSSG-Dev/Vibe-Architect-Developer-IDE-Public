import 'dotenv/config';
import { createGateway } from './app.js';
import { loadConfig } from './config.js';
import { MsalEntraAuth } from './entra-auth.js';
import { InMemorySessionStore, RedisSessionStore } from './session-store.js';
import { ReplayOperationsProvider } from './replay-operations-provider.js';
import { InMemoryEvidenceStore, RedisEvidenceStore } from './evidence-store.js';
import { createLocalGauge } from './luminary-pipeline/gauge-local.js';

const config = loadConfig();
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
