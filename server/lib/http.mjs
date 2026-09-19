import { randomUUID } from 'node:crypto';

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class RateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  take(key, { limit, windowMs }) {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }
    bucket.count += 1;
    return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
  }
}

export function requestId() {
  return randomUUID();
}

export function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress || 'unknown';
}

export async function parseJson(request, maximumBytes = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBytes) throw new AppError(413, 'REQUEST_TOO_LARGE', 'Request body exceeds the allowed size.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

export function sendJson(response, status, data, id) {
  const payload = JSON.stringify(data);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-request-id': id,
    'x-content-type-options': 'nosniff',
  });
  response.end(payload);
}

export function applyCors(request, response, config) {
  const origin = request.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('vary', 'Origin');
    response.setHeader('access-control-allow-headers', 'authorization, content-type, x-device-id');
    response.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.setHeader('access-control-max-age', '600');
  }
}

export function handleError(response, error, id, isProduction) {
  if (error instanceof AppError) {
    return sendJson(response, error.status, { error: { code: error.code, message: error.message, details: error.details }, requestId: id }, id);
  }
  console.error(JSON.stringify({ level: 'error', requestId: id, error: error?.stack || String(error) }));
  return sendJson(response, 500, {
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'An unexpected error occurred.' : (error?.message || 'Unexpected error.'),
    },
    requestId: id,
  }, id);
}
