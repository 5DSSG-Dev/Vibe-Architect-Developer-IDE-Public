# Service Admin gateway

The gateway is the same-origin entry point for the Architect application and the protected Service Admin view.

## Routes

- `/` serves the existing Architect application.
- `/admin/operations` serves the Admin application shell. Its Three.js module is not imported until `/api/admin/session` confirms authorization.
- `/auth/entra/login`, `/auth/entra/callback`, and `POST /auth/logout` implement the server-side sign-in lifecycle.
- `/api/admin/session`, `/api/admin/operations/*`, and `/api/admin/evidence/*` enforce the `service.operations.read` app role independently.
- `POST /api/admin/evidence/relation-contracts` and `POST /api/admin/evidence/work-ledger-entries` append verified source evidence. Mutations additionally require the authenticated session's CSRF token and the configured same origin.
- `GET /api/admin/evidence/relation-contracts/:contractId`, `GET /api/admin/evidence/work-ledgers/:workRequestId`, `GET /api/admin/evidence/replay`, and `GET /api/admin/evidence/integrity` provide verified read/replay views with `Cache-Control: no-store`.
- All other application paths return `404`.

The included operations provider is explicitly replay-backed. It exposes only the sanitized `PodTopologySnapshot` and `OperationEvent` projections from `src/admin`; it does not connect to a live Pod or DataQuad.

## Microsoft Entra setup

1. Create a single-tenant Web app registration.
2. Register the callback URI `${APP_ORIGIN}/auth/entra/callback`.
3. Add an application role whose value is exactly `service.operations.read`, then assign it only to approved users or groups.
4. For local development, place the IDs and a development client secret in an untracked `.env` loader or the process environment. The gateway does not read secrets from browser variables.
5. For production, set `NODE_ENV=production`, use an exact HTTPS origin, and set `ENTRA_REDIRECT_URI` to exactly `${APP_ORIGIN}/auth/entra/callback`.
6. Configure the certificate thumbprint/private key, `REDIS_URL`, and `TRUST_PROXY`. Use a positive proxy hop count or an explicit proxy allowlist; unrestricted proxy trust is rejected.

Development and tests use bounded in-memory session and evidence stores. Production refuses to start without both the shared Redis-backed session store and the durable Redis evidence store. Evidence is written into immutable per-stream source and service-integrity hash chains; identical retries are idempotent and conflicting content is refused. The opaque session ID is rotated after Entra authentication. Browser cookies contain only that ID and are `Secure`, `HttpOnly`, `SameSite=Lax`, and `__Host-` scoped in production.

The design workspace separately keeps a bounded, verified local evidence archive for offline continuity. It stores Relation Contracts and sanitized Work Request receipts, not raw Work Request intent or artifact contents. Synchronizing that local archive into the protected Redis service requires an authenticated admin session and remains an explicit integration gate; the public workspace never bypasses the protected boundary.

The gateway applies a restrictive CSP, denies framing, disables content sniffing, suppresses referrer disclosure, and disables unneeded browser capabilities. The production CSP permits same-origin application chunks, the existing Google Fonts origins, and `'wasm-unsafe-eval'` for the shipped Meshopt and Basis WebAssembly decoders. The self-hosted Basis JavaScript wrapper uses closure-based Embind invokers and does not require plain `'unsafe-eval'`; embedded KTX2 bufferViews are parsed in memory without `connect-src blob:`. Production never permits inline scripts. Development additionally permits `'unsafe-inline'` for Vite's injected React Refresh module preamble; that allowance is selected only when `NODE_ENV=development`.

## Commands

- `npm run dev` runs the same-origin Express/Vite development gateway.
- `npm run test:gateway` runs focused route and authorization tests.
- `npm run build` checks both browser and gateway TypeScript before producing `dist`.
- `npm start` serves `dist`; production callers must set `NODE_ENV=production` and the required environment variables.
