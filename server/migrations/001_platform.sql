CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  data_region TEXT NOT NULL DEFAULT 'us',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'learner',
  age_band TEXT NOT NULL DEFAULT 'unknown',
  account_status TEXT NOT NULL DEFAULT 'active',
  privacy_policy_version TEXT,
  terms_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(provider, provider_subject)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  device_id TEXT,
  provider TEXT NOT NULL DEFAULT 'password',
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  replaced_by_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT
);

CREATE TABLE IF NOT EXISTS oauth_authorizations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  state_hash TEXT NOT NULL UNIQUE,
  code_verifier_hash TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content_version INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  path_id TEXT REFERENCES learning_paths(id),
  headword TEXT NOT NULL UNIQUE,
  phonetic TEXT,
  part_of_speech TEXT NOT NULL,
  cefr_level TEXT NOT NULL,
  domain TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT NOT NULL,
  collocations_json TEXT NOT NULL DEFAULT '[]',
  family_json TEXT NOT NULL DEFAULT '[]',
  review_prompt TEXT NOT NULL,
  review_options_json TEXT NOT NULL DEFAULT '[]',
  review_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content_version INTEGER NOT NULL DEFAULT 1,
  provenance TEXT NOT NULL DEFAULT 'Lexora Editorial',
  created_by TEXT,
  reviewed_by TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_reviews (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  reviewed_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS content_assets (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  duration_ms INTEGER,
  provider TEXT,
  license_reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS review_states (
  user_id TEXT NOT NULL REFERENCES users(id),
  word_id TEXT NOT NULL REFERENCES words(id),
  due_at TEXT NOT NULL,
  interval_days REAL NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  repetitions INTEGER NOT NULL DEFAULT 0,
  lapse_count INTEGER NOT NULL DEFAULT 0,
  last_outcome TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, word_id)
);

CREATE TABLE IF NOT EXISTS review_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  word_id TEXT NOT NULL REFERENCES words(id),
  outcome TEXT NOT NULL,
  prior_interval_days REAL NOT NULL,
  next_interval_days REAL NOT NULL,
  prior_ease_factor REAL NOT NULL,
  next_ease_factor REAL NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  focused_minutes INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'mobile'
);

CREATE TABLE IF NOT EXISTS coach_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retention_until TEXT
);

CREATE TABLE IF NOT EXISTS coach_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES coach_conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  safety_status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tenant_id TEXT REFERENCES tenants(id),
  source TEXT NOT NULL,
  plan_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_codes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  code_hash TEXT NOT NULL UNIQUE,
  plan_key TEXT NOT NULL,
  max_redemptions INTEGER NOT NULL DEFAULT 1,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_code_redemptions (
  id TEXT PRIMARY KEY,
  access_code_id TEXT NOT NULL REFERENCES access_codes(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  redeemed_at TEXT NOT NULL,
  UNIQUE(access_code_id, user_id)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  user_id TEXT REFERENCES users(id),
  event_name TEXT NOT NULL,
  properties_json TEXT NOT NULL DEFAULT '{}',
  consent_scope TEXT NOT NULL DEFAULT 'essential',
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL,
  processed_at TEXT,
  verification_reference TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  request_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_states_due ON review_states(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_words_status_domain ON words(status, domain);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user ON coach_conversations(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation ON coach_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_status ON entitlements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_type, target_id, occurred_at);
