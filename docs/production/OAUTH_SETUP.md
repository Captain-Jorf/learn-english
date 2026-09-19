# OAuth setup checklist for real mobile sign-in

Social login is intentionally **not displayed as working** until these steps are completed in each environment. Do not put provider secrets inside an APK, JavaScript bundle, source file, issue, or chat message.

## Common requirements

- Use separate OAuth applications for Dev, Staging and Production.
- Use OAuth 2.1 authorization code flow with PKCE.
- Keep provider client secrets only in the API secret manager.
- Register precise HTTPS callback URLs for the API and Android App Links/deep links for the client handoff.
- Verify state, nonce, PKCE verifier and issuer/audience claims server-side.
- Maintain identity-linking rules for users who sign in with multiple providers using the same verified email.
- Record provider subject, not raw provider tokens, in `auth_identities`.
- Provide account unlink/deletion controls where permitted by the provider policy.

## Google

1. Create Android OAuth client with release signing certificate SHA-1/SHA-256 and application id `com.lexora.learn`.
2. Create server/web client for the API callback flow.
3. Register Development, Staging and Production redirect URIs.
4. Configure consent screen, privacy policy URL, terms URL and permitted scopes.
5. Put only the server client id and callback URI in environment configuration; keep the secret in the secret manager.
6. Validate `iss`, `aud`, `azp`, nonce, expiration and signature on returned ID tokens.

## Sign in with Apple

1. Enroll in Apple Developer Program and create the App ID/service ID.
2. Enable Sign in with Apple, configure return URLs and email relay domains.
3. Generate client-secret JWT server-side with Apple team ID, key ID and private key in secret management.
4. Support the one-time name/email payload and persist only the consented profile fields.
5. Test credential revocation notification and account deletion flow.

## Facebook Login

1. Create an app with the correct platform, production mode, privacy policy and deletion callback.
2. Register Android package name/key hashes and server callback origin.
3. Request only minimum permissions (`email`, `public_profile` unless counsel approves more).
4. Validate access tokens server-side using Facebook's debug-token endpoint and obtain the provider subject securely.
5. Complete Meta app review before requesting any non-basic permission.

## Android deep-link contract

Use verified Android App Links for production, not an unverified custom scheme alone:

```text
https://app.lexora.example/auth/callback
```

The API callback exchanges the provider code, creates/links a Lexora identity, then hands a short-lived, single-use authorization result to the verified app link. The Android app exchanges that result with the API for its normal Lexora session. Raw third-party tokens never pass through JavaScript or remain in the URL.

## Provider readiness endpoint

`GET /v1/auth/providers` exposes only readiness metadata. It is the source of truth for whether a sign-in button can be enabled in the client. A missing configuration must lead to a disabled/hidden provider choice, never to a mock login.
