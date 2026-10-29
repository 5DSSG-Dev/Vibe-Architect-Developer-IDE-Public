// Smoke test for the main Meta model (M1.b-2): sends ONE question through the real Luminary
// reply path (governance gate -> PIM -> IRG gauge -> RBC -> Prism | IDS) with Meta's Model API
// as the reply source and the embedded gauge on this PC reading every reply.
//
// Run on the Architect's PC from the repo folder:  npx tsx scripts/luminary-meta-smoke.ts ["question"]
//
// Needs LUMINARY_META_API_KEY in .env. Spend is capped by the ledger in server/luminary-meta.ts
// (defaults: 2 model calls, $0.25 in total, kept in .luminary/meta-spend.json across runs).
// The gauge is checked first, so nothing is spent if Ollama is not running. Never point an
// automated test loop at this script; the gateway tests use fakes.

import 'dotenv/config';
import express from 'express';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { parseLuminaryGauge } from '../server/config.js';
import { createMetaAskModel, parseMetaModelEnv } from '../server/luminary-meta.js';
import { createLuminaryReplyRouter } from '../server/luminary-reply-router.js';
import { createLocalGauge } from '../server/luminary-pipeline/gauge-local.js';

const DEFAULT_QUESTION = 'In two or three sentences, tell the Architect what you can help with in the Vibe Architect IDE.';

// The Architect's selected gauge (STP-0002, 2026-10-27), used when .env does not name one.
const ARCHITECT_GAUGE_ENV = {
  LUMINARY_GAUGE_ENDPOINT: 'http://localhost:11434/v1',
  LUMINARY_GAUGE_MODEL: 'llama3.2:3b',
  LUMINARY_GAUGE_THRESHOLDS: '{"Honesty":13.8,"Respect":29.3,"Attention":23.9,"Affection":16.3,"Loyalty":10.7,"Trust":11.9,"Communication":34.7}',
};

const meta = parseMetaModelEnv(process.env);
if (!meta) {
  console.error('LUMINARY_META_API_KEY is not set in .env, so nothing was sent.');
  process.exit(1);
}

const gaugeConfig = parseLuminaryGauge(process.env.LUMINARY_GAUGE_ENDPOINT ? process.env : { ...process.env, ...ARCHITECT_GAUGE_ENV })!;
const gauge = createLocalGauge(gaugeConfig);

console.log(`Gauge: ${gaugeConfig.model} at ${gaugeConfig.endpoint}`);
try {
  await gauge.read('A short check that the gauge is awake.', []);
} catch (error) {
  console.error(`The gauge is not answering (${(error as Error).message}). Start Ollama and try again. Nothing was sent to Meta.`);
  process.exit(1);
}

const before = meta.ledger.read();
console.log(`Meta model: ${meta.model}. Budget so far: ${before.calls} of ${before.maxCalls} calls, $${before.spentUsd.toFixed(4)} of $${before.capUsd.toFixed(2)}.`);

const systemPrompt = readFileSync(new URL('../docs/VIBE_LUMINARY_INSTRUCTIONS_v0.1.md', import.meta.url), 'utf8');
const askModel = createMetaAskModel({ ...meta, systemPrompt });

const app = express();
app.use(express.json());
app.use('/api/luminary', createLuminaryReplyRouter(askModel, { pipeline: { gauge } }));
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));

const question = process.argv[2]?.trim() || DEFAULT_QUESTION;
console.log(`\nQuestion: ${question}\n`);
const started = Date.now();
try {
  const { port } = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${port}/api/luminary/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: question }),
  });
  const result = await response.json() as { reply?: { modelId: string; content: string }; shortfall?: unknown; lineage?: Array<Record<string, unknown>> };
  console.log(`HTTP ${response.status} after ${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (result.reply) console.log(`\nReply from ${result.reply.modelId}:\n${result.reply.content}\n`);
  else console.log(`\nShortfall (reply withheld):\n${JSON.stringify(result.shortfall, null, 2)}\n`);
  for (const entry of result.lineage ?? []) {
    if (entry.stage === 'irg') {
      const readings = Object.entries(entry.readings as Record<string, number>).map(([v, r]) => `${v} ${r.toFixed(1)}`).join(', ');
      console.log(`Pass ${entry.pass} gauge: ${entry.coherent ? 'coherent' : `below threshold on ${(entry.belowThreshold as string[]).join(', ')}`} (${readings})`);
    } else if (entry.stage !== 'ids') {
      console.log(`Pass ${entry.pass} ${entry.stage}: ${JSON.stringify(Object.fromEntries(Object.entries(entry).filter(([k]) => k !== 'pass' && k !== 'stage')))}`);
    } else {
      console.log(`Pass ${entry.pass} ids: observation returned to the model for a re-formed reply`);
    }
  }
} finally {
  server.close();
  const after = meta.ledger.read();
  console.log(`\nBudget now: ${after.calls} of ${after.maxCalls} calls, $${after.spentUsd.toFixed(4)} of $${after.capUsd.toFixed(2)}.`);
  for (const e of after.entries.slice(before.entries.length)) {
    console.log(`  call: ${e.status}, tokens in ${e.inputTokens ?? '?'} / out ${e.outputTokens ?? '?'}, charged $${(e.actualUsd ?? e.reservedUsd).toFixed(4)}${e.actualUsd === null ? ' (worst case, no usage reported)' : ''}`);
  }
}
