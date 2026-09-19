import { resolve } from 'node:path';

function boolean(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function csv(value, fallback = []) {
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function loadConfig(env = process.env) {
  const environment = env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const databaseUrl = env.DATABASE_URL || `sqlite:${resolve('.local/lexora-platform.sqlite')}`;
  const jwtSecret = env.LEXORA_JWT_SECRET || (isProduction ? '' : 'development-only-change-before-production');

  if (!jwtSecret) throw new Error('LEXORA_JWT_SECRET is required when NODE_ENV=production.');
  if (isProduction && databaseUrl.startsWith('sqlite:')) {
    throw new Error('Production requires a managed PostgreSQL DATABASE_URL, not SQLite.');
  }

  return {
    environment,
    isProduction,
    port: Number(env.PORT || 8787),
    host: env.HOST || '0.0.0.0',
    databaseUrl,
    sqlitePath: resolve('.local/lexora-platform.sqlite'),
    jwtSecret,
    jwtIssuer: env.LEXORA_JWT_ISSUER || 'lexora-api',
    jwtAudience: env.LEXORA_JWT_AUDIENCE || 'lexora-mobile',
    accessTokenMinutes: Number(env.LEXORA_ACCESS_TOKEN_MINUTES || 15),
    refreshTokenDays: Number(env.LEXORA_REFRESH_TOKEN_DAYS || 30),
    allowedOrigins: csv(env.CORS_ORIGINS, ['http://localhost:5173']),
    publicAppOrigin: env.LEXORA_PUBLIC_APP_ORIGIN || 'http://localhost:5173',
    dataRegion: env.LEXORA_DATA_REGION || 'us',
    retentionDays: Number(env.LEXORA_COACH_RETENTION_DAYS || 90),
    ageGate: {
      minimumAge: Number(env.LEXORA_MINIMUM_AGE || 13),
      parentalConsentEnabled: boolean(env.LEXORA_PARENTAL_CONSENT_ENABLED, false),
    },
    aiGateway: {
      url: env.LEXORA_AI_GATEWAY_URL || '',
      token: env.LEXORA_AI_GATEWAY_TOKEN || '',
      model: env.LEXORA_AI_MODEL || '',
      timeoutMs: Number(env.LEXORA_AI_TIMEOUT_MS || 20_000),
    },
    social: {
      google: { clientId: env.OAUTH_GOOGLE_CLIENT_ID || '', redirectUri: env.OAUTH_GOOGLE_REDIRECT_URI || '' },
      apple: { clientId: env.OAUTH_APPLE_CLIENT_ID || '', redirectUri: env.OAUTH_APPLE_REDIRECT_URI || '' },
      facebook: { clientId: env.OAUTH_FACEBOOK_CLIENT_ID || '', redirectUri: env.OAUTH_FACEBOOK_REDIRECT_URI || '' },
    },
    bootstrapAdmin: {
      email: env.LEXORA_BOOTSTRAP_ADMIN_EMAIL || '',
      password: env.LEXORA_BOOTSTRAP_ADMIN_PASSWORD || '',
    },
  };
}
