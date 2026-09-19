# CMS and editorial operating model

## Recommended CMS: Directus self-hosted

Directus is recommended for Lexora's first production content operation because it gives the editorial team role-based access, versioned records, REST/GraphQL APIs, assets, drafts and database ownership without coupling the Android client to a vendor-specific SaaS.

Directus should point to the same production PostgreSQL cluster through a restricted CMS database role. The mobile API remains the only public client boundary; Directus must not be exposed as a public anonymous content API.

## Roles

| Role | Can do | Cannot do |
| --- | --- | --- |
| **Editor** | Create and revise drafts, attach examples, collocations, word families, review prompts and asset metadata; submit review | Publish or modify audit history |
| **Reviewer** | Review content, request changes, approve and publish reviewed versions | Change deployment settings or bypass audit |
| **Admin** | Manage roles, path taxonomy, asset sources, access codes and workflow configuration | Edit away immutable audit events |

## Core collections

| Collection | Purpose | Required quality control |
| --- | --- | --- |
| `learning_paths` | Curriculum grouping, audience, domain and publication state | Reviewer approval |
| `words` | English-to-English lexical entry, context-first prompt and version | Editor + Reviewer + provenance |
| `content_reviews` | Draft review, comments and decision history | Immutable resolution record |
| `content_assets` | Audio, image and licensed media metadata | License reference, owner and status |
| `access_codes` | Enterprise pilot entitlement provisioning | Expiry, redemption cap and audit |
| `audit_events` | Publishing, administration and high-risk events | Append-only application access |

## Word publication checklist

1. Headword, part of speech, CEFR band and learning path are defined.
2. Definition is English-to-English, unambiguous at the target level and not copied from an unlicensed source.
3. Example is natural, safe for the age baseline, and demonstrates the intended sense.
4. Collocations and word family are accurate.
5. Context-first review prompt has one clear correct answer and plausible, non-deceptive distractors.
6. Provenance is set to `Lexora Editorial` or a valid licensed source reference.
7. Any audio has a documented license/provider and correct asset status.
8. Reviewer approves; the API increments `content_version`, publishes it, and emits an audit event.

## Content provenance policy

- Original editorial material is marked `Lexora Editorial`.
- Licensed sources record provider, contract/reference, allowed territory, attribution requirements and expiry where applicable.
- Open-license material records license, source URL, required attribution and adaptation status.
- AI may assist internal drafting only if editorial review verifies every learner-facing claim. AI-generated copy must never be auto-published.

## Ingestion path for licensed audio/dictionary data

```text
Licensed provider export/API
  → private ingestion worker
  → schema + license validation
  → quarantined asset/content record
  → Editor review
  → Reviewer approval
  → object storage / CDN publish
  → versioned mobile API response
```

No provider key, raw export, or asset should be included in the Android repository or APK unless the license explicitly permits bundled distribution.
