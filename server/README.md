# Lexora Platform API reference

This service is the runnable backend reference for the production contracts in `../openapi` and `../graphql`.

## Local run

```bash
npm install
npm run api
```

It listens on `http://localhost:8787` and creates an actual SQLite development database at `.local/lexora-platform.sqlite`.

- `GET /healthz` checks the service.
- `GET /v1/catalog/words` reads published original starter content.
- `POST /v1/auth/register` creates an account and a signed session.
- `GET /v1/reviews/next` and `POST /v1/reviews/{wordId}/grade` exercise the persisted SRS engine.
- `POST /graphql` serves the read model.

Run automated service tests with:

```bash
npm test
```

## Production constraints

This is a reference implementation and contract base, not a claim that a cloud production environment is already deployed. In production:

- set `NODE_ENV=production`;
- provide a managed PostgreSQL `DATABASE_URL`;
- set a high-entropy `LEXORA_JWT_SECRET` via a secret manager;
- run distributed rate limiting/background jobs with Redis;
- configure a real AI gateway and OAuth provider adapters;
- run Directus and object storage separately;
- use a process manager/container platform and deploy migrations safely.

See `../docs/production/ARCHITECTURE.md` before deploying.
