# Security, privacy, and child-safety baseline

> This is an engineering implementation checklist, not legal advice or a substitute for privacy counsel.

## Shipping baseline

| Decision | Baseline |
| --- | --- |
| Primary data region | United States |
| Initial age gate | 13+ |
| All-ages mode | Disabled until parental-consent and legal workflow are approved |
| AI scope | English tutor chat and writing feedback only |
| AI safety | Moderation, rate limits, report/block controls, audit and human-escalation hook |
| Coach retention | User-manageable history, 90-day default configurable by policy |
| Data rights | Export, deletion request, session revocation and consent-version capture |
| Secrets | Server-side secret manager only |

## Identity and session requirements

1. Use OAuth 2.1 with PKCE for Google, Apple and Facebook mobile sign-in.
2. Keep access tokens short-lived (15 minutes default) and refresh tokens opaque, hashed at rest, rotated on use, and revocable per device.
3. Store mobile tokens only in encrypted platform storage; never local browser storage for a production native client.
4. Bind session records to a device identifier where allowed by policy; store only hashes of IP address and user agent.
5. Require a re-authentication or verified email challenge before export, destructive deletion, identity linking or high-risk profile changes.
6. Rate-limit registration, login, refresh, OAuth callback, coach and code-redemption routes independently.

## Content and AI controls

- All editorial records carry author/reviewer, version, status and provenance.
- Publishing requires a Reviewer or Admin role and creates an audit event.
- Audio assets must store license reference, provider, MIME type and publication status.
- The client must clearly identify AI-generated feedback where it is shown.
- The AI gateway applies system policy server-side, validates input/output, limits per-user requests, and records safety outcomes without logging secrets.
- A blocked request returns a safe explanation; it must not fabricate tutor feedback.
- Build a user report flow and an internal moderation/escalation queue before public B2C release.

## Child safety: required before all-ages activation

Do not set `LEXORA_PARENTAL_CONSENT_ENABLED=true` until all of the following are implemented and reviewed:

1. age gate that avoids collecting unnecessary date-of-birth detail;
2. verifiable parental consent provider and consent audit record;
3. guardian account and child-profile relationship model;
4. child-specific privacy notice, retention rules and deletion process;
5. restricted AI policy appropriate for children;
6. reporting/escalation and support operation;
7. COPPA, GDPR-K, applicable local law, store policy and counsel sign-off;
8. age-appropriate design testing and accessibility review.

## Data rights workflow

- `GET /v1/me/export` returns a portable export for the authenticated user.
- `DELETE /v1/me` records an auditable deletion request; a worker in production must verify identity, enforce legal holds, delete/anonymize dependent records, revoke sessions, and notify the requester.
- Coach conversations display retention information and support user delete/export controls.
- Analytics defaults to essential, pseudonymous events. Marketing or product analytics requires consent by region and policy.

## Security release gate

Before an external pilot:

- [ ] Threat model completed for identity, content, AI, payments and child flows.
- [ ] Secrets stored in approved secret manager; no keys in APK, git history, logs or crash reports.
- [ ] SAST/dependency scanning and container scanning enabled in CI.
- [ ] API schema validation, authorization tests, rate-limit tests and refresh-rotation tests pass.
- [ ] OAuth redirect URI allowlists reviewed per environment.
- [ ] TLS, HSTS, WAF and origin/CORS configuration verified.
- [ ] Postgres backup, restore and migration rollback runbook tested.
- [ ] Incident response owner, abuse response path and support contact are assigned.
- [ ] Privacy policy, terms and age policy are approved by qualified counsel.
