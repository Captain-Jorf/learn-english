# Deployment reference

`compose.platform.example.yaml` is a local/staging topology reference for PostgreSQL, Redis, Directus and the Lexora API. It is **not** a substitute for production platform controls.

For production, use managed PostgreSQL with point-in-time recovery, managed Redis, private object storage/CDN, managed secret storage, a WAF/load balancer, TLS, isolated network boundaries, and backup/restore drills. Directus must be restricted to authorised editorial users; it is not the public mobile API.

Never place real passwords, API keys, OAuth secrets, signing material or database URLs in this directory or in a committed compose override.
