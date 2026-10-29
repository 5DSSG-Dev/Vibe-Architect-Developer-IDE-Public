# Vibe Luminary — local settings

The Luminary's settings go in your own `.env` file (git-ignored), never in the repository.
This page replaces the Luminary part of the former `.env.example`, which the Architect removed on
2026-10-28 because it also listed Stellar settings. Only Luminary settings are described here.

| Setting | What it does | Unset means |
|---|---|---|
| `LUMINARY_DEMO_KEY` | Shared key the panel asks for once. | The Luminary is switched off (503). |
| `LUMINARY_REPLY_SOURCE=rehearsal` | Scripted stand-in replies, labelled `rehearsal-stand-in` and badged Rehearsal. | No model: every ask is an honest `upstream_error` Shortfall. |
| `LUMINARY_REPLY_SOURCE=meta` | The real Meta model (Muse Spark, STP-0002 P21). Needs `LUMINARY_META_API_KEY` and `LUMINARY_META_CEILING_USD`, or the gateway will not start. Every reply still passes the gate and the gauge. | — |
| `LUMINARY_META_API_KEY` | Your Meta Model API key. Put it in `.env` yourself; never paste it anywhere else. | Required with `meta`. |
| `LUMINARY_META_CEILING_USD` | Your overall spending ceiling in dollars, e.g. `50`. Counted from the spend ledger, so earlier calls count. A call that could pass it is refused as a `spend_ceiling` Shortfall. The panel shows the running total and turns amber at 80%. | Required with `meta`. |
| `LUMINARY_META_LEDGER_PATH` | Where the spend ledger lives. Point it at the smoke test's ledger so those calls count. | `.luminary/meta-spend.json` in the project folder. |
| `LUMINARY_META_MAX_OUTPUT_TOKENS` | The longest reply allowed. | 8000 with `meta`. |
| `LUMINARY_EXECUTOR=on` | Coding tasks: changes go to the Luminary's own `luminary/<id>` branch, type checks run (nothing it wrote is executed), only your Accept merges. Loopback only: the executor also refuses any request carrying a proxy or tunnel header, a public Host name or a non-local Origin, so never switch it on behind a tunnel. Your approval is written to `.luminary/ledger.jsonl` before any merge, and a broken ledger stops the executor. Every question, reply, accept and decline is also kept in the IDE's evidence record. | Coding tasks are off. |
| `LUMINARY_GAUGE_ENDPOINT`, `LUMINARY_GAUGE_MODEL` | The embedded gauge on a loopback runtime, e.g. `http://localhost:11434/v1` and `llama3.2:3b`. Set both or neither. | Every reply is withheld as `gauge_error`. |
| `LUMINARY_GAUGE_TIMEOUT_MS` | Gauge timeout, default 30000. | Default. |
| `LUMINARY_GAUGE_THRESHOLDS` | Required with the gauge. Your selected values (STP-0002, 2026-10-27): `{"Honesty":13.8,"Respect":29.3,"Attention":23.9,"Affection":16.3,"Loyalty":10.7,"Trust":11.9,"Communication":34.7}` | The gateway will not start with a gauge but no thresholds. |
| `LUMINARY_META_API_KEY` and the other `LUMINARY_META_*` settings | The Meta smoke test (P20), with its spend ledger and caps. Key only in `.env`. | No Meta model is called. |

A typical local run with the stand-in, your gauge, and coding tasks:

```
LUMINARY_DEMO_KEY=choose-a-key
LUMINARY_REPLY_SOURCE=rehearsal
LUMINARY_EXECUTOR=on
LUMINARY_GAUGE_ENDPOINT=http://localhost:11434/v1
LUMINARY_GAUGE_MODEL=llama3.2:3b
LUMINARY_GAUGE_THRESHOLDS={"Honesty":13.8,"Respect":29.3,"Attention":23.9,"Affection":16.3,"Loyalty":10.7,"Trust":11.9,"Communication":34.7}
```

Then `npm run dev` and open the IDE.
