# Lexora production architecture

## Launch decision

Lexora launches as a **13+ enterprise-controlled Android pilot** in the US primary data region. The all-ages capability remains disabled behind `LEXORA_PARENTAL_CONSENT_ENABLED=false` until legal counsel, a verifiable-parent-consent provider, child-data workflows, and app-store review requirements are complete.

The pilot is intentionally structured to become a global B2C release after operational evidence, content quality review, social-auth configuration, and Play Billing decisions are complete.

## Client, API, and content boundaries

```text
Android client
  ├─ Native identity, deep-link, billing, push, secure storage and audio modules
  ├─ REST command client
  ├─ GraphQL read-model client
  ├─ encrypted token storage and offline learning cache
  └─ local SRS queue / conflict-aware sync

API edge
  ├─ OAuth 2.1 + PKCE identity adapters
  ├─ REST commands and privacy operations
  ├─ GraphQL persisted read queries
  ├─ rate limits, correlation IDs, audit events and abuse controls
  └─ provider-agnostic AI gateway adapter

Core platform
  ├─ PostgreSQL in production / SQLite only for local reference development
  ├─ Redis for distributed rate limits, cache and background jobs
  ├─ object storage + CDN for licensed audio and content assets
  ├─ Directus CMS for editorial workflow
  └─ observability, release controls and incident response
```

## Why hybrid REST + GraphQL

| Boundary | Protocol | Reason |
| --- | --- | --- |
| Login, token rotation, identity linking, account deletion | REST | Idempotency, explicit security boundaries and straightforward mobile failure modes. |
| Review grading, entitlement redemption, content publish | REST | Command semantics, auditability and exactly-once/idempotency support. |
| Dashboard, catalog, path, review read models | GraphQL | Small mobile payloads, schema-led selection and one round trip for a composed screen. |
| AI Tutor request | REST | Rate limiting, moderation, streaming evolution and provider isolation. |

`openapi/lexora-v1.yaml` and `graphql/schema.graphql` are the source contracts. No mobile endpoint should be invented outside those files.

## Current runnable reference service

`server/` is a functioning reference API, not a static mock:

- applies an actual relational schema;
- seeds original Lexora Editorial starter content;
- creates password fallback accounts with scrypt hashing;
- signs short-lived access tokens and rotates hashed refresh tokens;
- schedules reviews using a deterministic spaced-repetition state machine;
- exposes REST and GraphQL operations;
- persists review, entitlement, privacy, audit and coach records;
- rejects AI requests with `AI_GATEWAY_NOT_CONFIGURED` until a secret-backed gateway exists rather than inventing a reply.

Run it locally with:

```bash
npm run api
```

Local development uses `.local/lexora-platform.sqlite`. Production startup rejects SQLite and requires a managed PostgreSQL `DATABASE_URL` plus a secret-managed `LEXORA_JWT_SECRET`.

## Production deployment topology

1. **Dev** — disposable Postgres, Directus sandbox, test OAuth apps and synthetic content.
2. **Staging** — isolated Postgres, release-candidate Android app, staging OAuth callbacks, test tenant and synthetic payment events.
3. **Production** — managed Postgres with PITR, Redis, private AI gateway, Directus admin behind SSO/VPN, object storage, CDN, WAF and managed secrets.

Required operational controls:

- database backup and restore drills;
- migration gate before every deployment;
- immutable content versions and audit events;
- server-side secrets only;
- per-environment OAuth redirect URI allowlists;
- structured logs with request ID and no raw authentication tokens;
- crash, latency, AI safety, retention and entitlement dashboards;
- feature flags for social login, AI, all-ages, billing and content experiments.

## Configuration rules

- `.env.example` lists names only; do not commit values.
- `LEXORA_AI_GATEWAY_TOKEN`, OAuth client secrets, signing keys and billing secrets live in the deployment secret manager.
- Android receives only public identifiers, never a gateway token or provider secret.
- `CORS_ORIGINS` is an allowlist, never `*` in production.
- Password login is a controlled fallback. Global social login only becomes visible after the relevant real provider reports configured.

## Deliberately deferred until configuration exists

These cannot be truthfully enabled without external configuration:

- Google, Apple and Facebook identity flows;
- a hosted, moderated LLM provider;
- licensed dictionary/audio ingestion;
- Google Play Billing verification;
- parental consent and child-account activation;
- production CDN/object-storage URLs;
- enterprise SSO and MDM tenant provisioning.

The code and contract make these integrations explicit; they must not be replaced by demo responses in a production build.
