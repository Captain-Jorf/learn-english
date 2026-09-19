import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { randomUUID } from 'node:crypto';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function hmac(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [algorithm, salt, digest] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !digest) return false;
  const candidate = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(digest, 'hex'));
}

export function hashOpaqueValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function signAccessToken(user, config) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.jwtIssuer,
    aud: config.jwtAudience,
    sub: user.id,
    role: user.role,
    tenantId: user.tenant_id || null,
    iat: now,
    exp: now + config.accessTokenMinutes * 60,
  };
  const encodedHeader = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = hmac(`${encodedHeader}.${encodedPayload}`, config.jwtSecret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token, config) {
  if (!token || typeof token !== 'string') return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  const expected = hmac(`${header}.${payload}`, config.jwtSecret);
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(signature);
  if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) return null;

  try {
    const claims = JSON.parse(fromBase64url(payload));
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== config.jwtIssuer || claims.aud !== config.jwtAudience || claims.exp <= now || !claims.sub) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function issueSession(database, user, config, metadata = {}) {
  const rawRefreshToken = randomBytes(48).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.refreshTokenDays * 24 * 60 * 60 * 1000);
  const tokenId = randomUUID();

  await database.query(
    `INSERT INTO refresh_tokens
      (id, user_id, token_hash, device_id, provider, issued_at, expires_at, ip_hash, user_agent_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tokenId,
      user.id,
      hashOpaqueValue(rawRefreshToken),
      metadata.deviceId || null,
      metadata.provider || 'password',
      now.toISOString(),
      expiresAt.toISOString(),
      metadata.ip ? hashOpaqueValue(metadata.ip) : null,
      metadata.userAgent ? hashOpaqueValue(metadata.userAgent) : null,
    ],
  );

  return {
    accessToken: signAccessToken(user, config),
    refreshToken: rawRefreshToken,
    accessTokenExpiresIn: config.accessTokenMinutes * 60,
    refreshTokenExpiresAt: expiresAt.toISOString(),
  };
}

export async function rotateRefreshToken(database, rawRefreshToken, config, metadata = {}) {
  const tokenHash = hashOpaqueValue(rawRefreshToken || '');
  const result = await database.query(
    `SELECT rt.*, u.id AS user_id, u.email, u.display_name, u.role, u.tenant_id, u.account_status
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.revoked_at IS NULL`,
    [tokenHash],
  );
  const record = result.rows[0];
  if (!record || new Date(record.expires_at).getTime() <= Date.now() || record.account_status !== 'active') return null;

  await database.query('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?', [new Date().toISOString(), record.id]);
  const user = {
    id: record.user_id,
    email: record.email,
    display_name: record.display_name,
    role: record.role,
    tenant_id: record.tenant_id,
    account_status: record.account_status,
  };
  const session = await issueSession(database, user, config, metadata);
  const newTokenHash = hashOpaqueValue(session.refreshToken);
  const replacement = await database.query('SELECT id FROM refresh_tokens WHERE token_hash = ?', [newTokenHash]);
  if (replacement.rows[0]) {
    await database.query('UPDATE refresh_tokens SET replaced_by_id = ? WHERE id = ?', [replacement.rows[0].id, record.id]);
  }
  return { user, session };
}

export function extractBearerToken(authorization = '') {
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match ? match[1] : null;
}
