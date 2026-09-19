import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase, applyMigrations } from './lib/db.mjs';
import { loadConfig } from './lib/config.mjs';
import { extractBearerToken, issueSession, rotateRefreshToken, verifyAccessToken } from './lib/auth.mjs';
import { AppError, RateLimiter, applyCors, getClientIp, handleError, parseJson, requestId, sendJson } from './lib/http.mjs';
import { createServices } from './lib/services.mjs';
import { createGraphqlExecutor } from './lib/graphql.mjs';
import { seedContent } from './seed.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const root = join(directory, '..');
const config = loadConfig();
const database = await createDatabase(config);
await applyMigrations(database, join(directory, 'migrations'));
await seedContent(database);
const services = createServices({ database, config });
await services.bootstrapAdmin();
const executeGraphql = createGraphqlExecutor(services, join(root, 'graphql', 'schema.graphql'));
const limiter = new RateLimiter();

function routeParams(pathname, pattern) {
  const match = pattern.exec(pathname);
  return match?.groups || null;
}

function assertString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, 'INVALID_REQUEST', `${field} is required.`);
  return value.trim();
}

async function authenticatedUser(request) {
  const token = extractBearerToken(request.headers.authorization);
  const claims = verifyAccessToken(token, config);
  if (!claims) throw new AppError(401, 'UNAUTHENTICATED', 'A valid access token is required.');
  const user = await services.getUser(claims.sub);
  if (!user || user.account_status !== 'active') throw new AppError(401, 'UNAUTHENTICATED', 'This session is no longer active.');
  return user;
}

async function dispatch(request, response, id) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const { pathname, searchParams } = url;
  const method = request.method || 'GET';
  const ip = getClientIp(request);

  if (method === 'OPTIONS') {
    response.writeHead(204, { 'x-request-id': id });
    response.end();
    return;
  }

  const publicPaths = new Set(['/healthz', '/v1/public/config', '/v1/auth/providers', '/v1/auth/register', '/v1/auth/login', '/v1/auth/refresh']);
  let user = null;
  if (!publicPaths.has(pathname) && pathname !== '/graphql') user = await authenticatedUser(request);
  if (pathname === '/graphql' && request.headers.authorization) user = await authenticatedUser(request);

  const rateRule = pathname.includes('/coach/') ? { limit: 15, windowMs: 60_000 } : pathname.startsWith('/v1/auth/') ? { limit: 20, windowMs: 60_000 } : { limit: 180, windowMs: 60_000 };
  const rate = limiter.take(`${user?.id || ip}:${pathname}`, rateRule);
  response.setHeader('x-ratelimit-remaining', String(rate.remaining));
  if (!rate.allowed) throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.', { retryAfterSeconds: Math.ceil((rate.resetAt - Date.now()) / 1000) });

  if (method === 'GET' && pathname === '/healthz') {
    return sendJson(response, 200, {
      status: 'ok',
      service: 'lexora-platform-api',
      environment: config.environment,
      dataRegion: config.dataRegion,
      database: database.kind,
      timestamp: new Date().toISOString(),
    }, id);
  }

  if (method === 'GET' && pathname === '/v1/public/config') {
    return sendJson(response, 200, {
      dataRegion: config.dataRegion,
      ageGate: { minimumAge: config.ageGate.minimumAge, parentalConsentEnabled: config.ageGate.parentalConsentEnabled },
      policy: { coachRetentionDays: config.retentionDays, allAgesEnabled: config.ageGate.parentalConsentEnabled },
      releaseLane: 'enterprise_pilot',
    }, id);
  }

  if (method === 'GET' && pathname === '/v1/auth/providers') {
    return sendJson(response, 200, { providers: await services.listProviders() }, id);
  }

  if (method === 'POST' && pathname === '/v1/auth/register') {
    const body = await parseJson(request);
    const created = await services.registerUser(body);
    const session = await issueSession(database, created, config, { deviceId: request.headers['x-device-id'], provider: 'password', ip, userAgent: request.headers['user-agent'] });
    return sendJson(response, 201, { user: services.publicUser(created), session }, id);
  }

  if (method === 'POST' && pathname === '/v1/auth/login') {
    const body = await parseJson(request);
    const loggedIn = await services.login(body);
    const session = await issueSession(database, loggedIn, config, { deviceId: request.headers['x-device-id'], provider: 'password', ip, userAgent: request.headers['user-agent'] });
    return sendJson(response, 200, { user: services.publicUser(loggedIn), session }, id);
  }

  if (method === 'POST' && pathname === '/v1/auth/refresh') {
    const body = await parseJson(request);
    const rotated = await rotateRefreshToken(database, body.refreshToken, config, { deviceId: request.headers['x-device-id'], provider: 'refresh', ip, userAgent: request.headers['user-agent'] });
    if (!rotated) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
    return sendJson(response, 200, { user: services.publicUser(rotated.user), session: rotated.session }, id);
  }

  if (method === 'POST' && pathname === '/v1/auth/logout') {
    const body = await parseJson(request);
    const refreshToken = assertString(body.refreshToken, 'refreshToken');
    const { hashOpaqueValue } = await import('./lib/auth.mjs');
    await database.query('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND user_id = ?', [new Date().toISOString(), hashOpaqueValue(refreshToken), user.id]);
    response.writeHead(204, { 'x-request-id': id });
    response.end();
    return;
  }

  if (method === 'GET' && pathname === '/v1/me') return sendJson(response, 200, { user: services.publicUser(user) }, id);
  if (method === 'GET' && pathname === '/v1/me/export') return sendJson(response, 200, await services.exportUserData(user.id), id);
  if (method === 'DELETE' && pathname === '/v1/me') return sendJson(response, 202, await services.requestDataDeletion(user.id), id);

  if (method === 'GET' && pathname === '/v1/catalog/words') {
    return sendJson(response, 200, await services.getCatalog({ domain: searchParams.get('domain') || undefined, limit: searchParams.get('limit') || undefined, offset: searchParams.get('offset') || undefined }), id);
  }
  if (method === 'GET' && pathname === '/v1/catalog/paths') return sendJson(response, 200, { paths: await services.listPaths() }, id);
  if (method === 'GET' && pathname === '/v1/dashboard') return sendJson(response, 200, await services.getDashboard(user.id), id);
  if (method === 'GET' && pathname === '/v1/reviews/next') return sendJson(response, 200, { review: await services.getNextReview(user.id) }, id);

  const gradeMatch = routeParams(pathname, /^\/v1\/reviews\/(?<wordId>[^/]+)\/grade$/);
  if (method === 'POST' && gradeMatch) {
    const body = await parseJson(request);
    return sendJson(response, 200, await services.gradeReview(user.id, gradeMatch.wordId, body.outcome), id);
  }

  if (method === 'POST' && pathname === '/v1/entitlements/redeem') {
    const body = await parseJson(request);
    return sendJson(response, 200, { entitlement: await services.redeemAccessCode(user.id, body.code) }, id);
  }

  if (method === 'GET' && pathname === '/v1/coach/conversations') return sendJson(response, 200, { conversations: await services.listConversations(user.id) }, id);
  if (method === 'POST' && pathname === '/v1/coach/messages') return sendJson(response, 200, await services.sendCoachMessage(user.id, await parseJson(request)), id);

  if (method === 'POST' && pathname === '/graphql') {
    const body = await parseJson(request);
    const result = await executeGraphql(body, { user });
    const errors = result.errors?.map((error) => ({
      message: error.message,
      extensions: { code: error.originalError?.code || 'GRAPHQL_ERROR' },
    }));
    return sendJson(response, 200, { data: result.data, ...(errors ? { errors } : {}) }, id);
  }

  if (method === 'POST' && pathname === '/v1/admin/content/words') {
    return sendJson(response, 201, { word: await services.createWord(user, await parseJson(request), id) }, id);
  }
  const publishMatch = routeParams(pathname, /^\/v1\/admin\/content\/words\/(?<wordId>[^/]+)\/publish$/);
  if (method === 'POST' && publishMatch) return sendJson(response, 200, { word: await services.publishWord(user, publishMatch.wordId, id) }, id);

  throw new AppError(404, 'NOT_FOUND', 'The requested endpoint does not exist.');
}

const server = createServer(async (request, response) => {
  const id = requestId();
  applyCors(request, response, config);
  try {
    await dispatch(request, response, id);
  } catch (error) {
    handleError(response, error, id, config.isProduction);
  }
});

server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    service: 'lexora-platform-api',
    status: 'listening',
    host: config.host,
    port: config.port,
    environment: config.environment,
    database: database.kind,
    aiGatewayConfigured: Boolean(config.aiGateway.url && config.aiGateway.token),
    socialProviders: Object.fromEntries(Object.entries(config.social).map(([name, settings]) => [name, Boolean(settings.clientId && settings.redirectUri)])),
  }));
});

async function shutdown(signal) {
  console.log(JSON.stringify({ service: 'lexora-platform-api', signal, status: 'shutting_down' }));
  server.close(async () => {
    await database.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
