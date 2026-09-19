# Lexora

**Think in English. Build it word by word.**

Lexora is evolving from an offline-first learning experience into a launch-ready language-learning platform: English-to-English content, context-first spaced repetition, secure account architecture, content operations, and a provider-agnostic AI Tutor gateway.

## What is in this repository

### Android learning experience

- Adaptive start: goal selection, sustainable daily rhythm and placement check.
- Today, Learn, Review, Coach and You experiences.
- Original Lexora Editorial starter content across Everyday, Work and Ideas.
- Context-first review with a persisted local learning state and custom icon system.
- Paper & Cobalt light theme plus Charcoal & Lime dark theme.
- No emoji in the product interface.
- Custom-drawn abstract open-book identity and Android launcher asset.

### Runnable platform reference API

The `server/` service is a functioning local backend reference, not static endpoint documentation:

- SQLite for local development and PostgreSQL adapter for production;
- relational schema for users, roles, content, SRS, sessions, entitlements, privacy requests, coach history and audits;
- scrypt password fallback, signed short-lived access tokens and refresh-token rotation;
- a real SRS state transition and review-event history;
- REST commands plus GraphQL read models;
- CMS roles: Editor, Reviewer and Admin;
- explicit safe failures for unconfigured social identity and AI providers instead of fake sign-in or generated replies.

The production contracts live in:

- `openapi/lexora-v1.yaml`
- `graphql/schema.graphql`
- `docs/production/`

## Run the learning UI

```bash
npm install
npm run dev
```

## Connect the UI to the local platform API

Start both processes during development:

```bash
npm run api
npm run dev
```

Vite proxies the browser-facing `/api/*` route to the local API at `http://127.0.0.1:8787`; the browser never needs to call `localhost` directly. Open **You** to create a real 13+ local account or sign in. The account form, signed session, logout endpoint, and secure-tutor request route use the running API rather than local simulated responses.

The reference client deliberately keeps access and refresh tokens **in memory only**. It does not put production credentials in `localStorage`. Before public mobile release, provide an organisation-approved native secure-storage implementation and token-refresh lifecycle.

For a deployed **web** build, configure a public HTTPS service origin with `VITE_LEXORA_API_BASE_URL` at build time or inject `window.__LEXORA_RUNTIME_CONFIG__.apiBaseUrl` at runtime. This value is an API address, never a secret. A build with no API origin intentionally leaves account and tutor actions unavailable rather than pretending they work.

The current debug APK is intentionally an offline shell and does not request Android network access. A production mobile build needs a reviewed native secure-storage implementation, a safe web-asset origin or native API bridge, strict API CORS/origin policy, certificate/network-security configuration, and organisation-controlled release signing before account features can be enabled on-device.

The service listens on `http://localhost:8787` and creates a real local development database at `.local/lexora-platform.sqlite`. The AI Tutor returns an explicit `503 AI_GATEWAY_NOT_CONFIGURED` until an approved secure gateway is configured server-side; it never fabricates a reply.

```bash
npm test
```

runs the backend contract and learning-engine tests.

Use `.env.example` only as a name-only configuration reference. Never commit or chat real API keys, OAuth client secrets, database passwords, signing keys or provider tokens.

## Build the Android APK

```bash
npm run apk:debug
```

The finished installable artifact is written to:

```text
artifacts/Lexora-1.0.0-debug.apk
```

It supports Android 6.0+ (API 23) and uses package id `com.lexora.learn`.

```bash
npm run apk:verify
```

verifies the built artifact's signatures.

> The current artifact is debug-signed for direct pilot testing. A store or enterprise production release must use an organisation-controlled release key and a managed build/release pipeline.

## Business launch baseline

The project defaults to a **13+ enterprise-controlled pilot** in a US primary data region, with a future B2C rollout path. All-ages mode remains disabled until verifiable parental consent, legal policy, moderation and child-safety workflows are approved.

See [Architecture](docs/production/ARCHITECTURE.md), [Security & Privacy](docs/production/SECURITY_AND_PRIVACY.md), [CMS](docs/production/CMS_CONTENT_MODEL.md), [OAuth setup](docs/production/OAUTH_SETUP.md), and [Release plan](docs/production/RELEASE_PLAN.md) before deploying.
