# Release plan: Enterprise pilot to B2C

## Phase 0 — contract and environment readiness

- Freeze `openapi/lexora-v1.yaml` and `graphql/schema.graphql` with the backend owner.
- Provision Dev, Staging and Production with separate database, secrets, OAuth apps and object-storage buckets.
- Configure Directus, editorial roles, content review workflow and first licensed/original content source.
- Create the Android signing/release-key process outside this repository.
- Complete threat model and legal review of age, privacy, AI and content licensing.

**Exit gate:** no mock provider or fake auth path remains visible in the release client.

## Phase 1 — internal engineering validation

- Build signed Android Internal App Sharing artifact.
- Exercise register/login, token rotation, revocation, GraphQL catalog, SRS grading, offline-sync conflict handling and data export.
- Run API contract tests against Staging.
- Test rate limiting, AI gateway timeout/failure, moderation and PII-redaction paths.
- Test CMS draft/review/publish with audit history.

**Exit gate:** observability and rollback work; all blocking security tests pass.

## Phase 2 — controlled enterprise pilot

- Distribute through Android Enterprise / managed Google Play or organization MDM.
- Provision pilot users through Admin invite plus time-limited access code.
- Keep all-ages feature flag disabled; enforce 13+ baseline.
- Monitor crash-free sessions, activation, D1/D7 retention, review completion, AI safety events, cost/user and support tickets.
- Conduct weekly editorial and operations review.

**Exit gate:** agreed quality metrics, no unresolved severe security/privacy/content issue, and a documented pilot retrospective.

## Phase 3 — Google Play B2C preparation

- Complete Google/Apple/Facebook provider production configuration.
- Add Google Play Billing and server-side purchase verification only after commercial model approval.
- Publish approved Privacy Policy, Terms, deletion/contact process and content attribution where needed.
- Complete Play Console Data safety, target audience and store listing review.
- Enable staged rollout and feature flags by cohort.

## Phase 4 — gradual public rollout

- Start at a small percentage of eligible users/regions.
- Use reversible feature flags for AI, social providers, content packs and billing.
- Maintain an on-call rotation, incident response channel and customer support escalation path.
- Expand only after technical, editorial, safety and business metrics hold.

## Minimum pilot telemetry

| Area | Signals |
| --- | --- |
| Reliability | crash-free users, API p95/p99, request error rate, sync failure rate |
| Learning | onboarding completion, review completion, time-to-first-mastered word, D1/D7 retention |
| Content | draft-to-publish time, reviewer rejections, asset license completeness |
| AI | requests/user, blocked request rate, latency, provider failure rate, reported output rate |
| Security | login/refresh anomaly, rate-limit trigger, revoked-token reuse, admin audit coverage |
| Commercial readiness | invited vs activated seats, access-code conversion, support cost/user |
