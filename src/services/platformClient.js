const REQUEST_TIMEOUT_MS = 15_000;

export class PlatformApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', requestId, details } = {}) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export function resolvePlatformApiBaseUrl() {
  const runtime = typeof window !== 'undefined' ? window.__LEXORA_RUNTIME_CONFIG__ : undefined;
  const configured = import.meta.env.VITE_LEXORA_API_BASE_URL || runtime?.apiBaseUrl;
  if (configured) return configured.replace(/\/$/, '');
  // The Vite development proxy exposes the real local reference API without leaking localhost to a device build.
  return import.meta.env.DEV ? '/api' : '';
}

function joinUrl(baseUrl, path) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function createPlatformClient({ baseUrl = resolvePlatformApiBaseUrl(), getAccessToken = () => null, onUnauthorized } = {}) {
  if (!baseUrl) {
    throw new PlatformApiError('No production API base URL has been configured.', { code: 'API_NOT_CONFIGURED' });
  }

  async function request(path, { method = 'GET', body, auth = false, signal } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const linkedSignal = signal || controller.signal;
    const headers = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (auth) {
      const token = getAccessToken();
      if (!token) throw new PlatformApiError('An authenticated Lexora session is required.', { status: 401, code: 'UNAUTHENTICATED' });
      headers.authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(joinUrl(baseUrl, path), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: linkedSignal });
    } catch (error) {
      const message = error?.name === 'AbortError' ? 'The Lexora service did not respond in time.' : 'Unable to reach the Lexora service.';
      throw new PlatformApiError(message, { code: error?.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR' });
    } finally {
      clearTimeout(timeout);
    }

    const requestId = response.headers.get('x-request-id') || undefined;
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      if (response.status === 401) onUnauthorized?.();
      throw new PlatformApiError(payload?.error?.message || `Request failed with status ${response.status}.`, {
        status: response.status,
        code: payload?.error?.code || 'API_ERROR',
        requestId,
        details: payload?.error?.details,
      });
    }
    return payload;
  }

  return {
    health: () => request('/healthz'),
    publicConfig: () => request('/v1/public/config'),
    providers: () => request('/v1/auth/providers'),
    register: (input) => request('/v1/auth/register', { method: 'POST', body: input }),
    login: (input) => request('/v1/auth/login', { method: 'POST', body: input }),
    refresh: (refreshToken) => request('/v1/auth/refresh', { method: 'POST', body: { refreshToken } }),
    logout: (refreshToken) => request('/v1/auth/logout', { method: 'POST', body: { refreshToken }, auth: true }),
    me: () => request('/v1/me', { auth: true }),
    exportData: () => request('/v1/me/export', { auth: true }),
    requestDeletion: () => request('/v1/me', { method: 'DELETE', auth: true }),
    catalog: ({ domain, limit, offset } = {}) => {
      const query = new URLSearchParams();
      if (domain) query.set('domain', domain);
      if (limit) query.set('limit', String(limit));
      if (offset) query.set('offset', String(offset));
      return request(`/v1/catalog/words${query.size ? `?${query}` : ''}`);
    },
    paths: () => request('/v1/catalog/paths'),
    dashboard: () => request('/v1/dashboard', { auth: true }),
    nextReview: () => request('/v1/reviews/next', { auth: true }),
    gradeReview: (wordId, outcome) => request(`/v1/reviews/${encodeURIComponent(wordId)}/grade`, { method: 'POST', auth: true, body: { outcome } }),
    redeemAccessCode: (code) => request('/v1/entitlements/redeem', { method: 'POST', auth: true, body: { code } }),
    coachConversations: () => request('/v1/coach/conversations', { auth: true }),
    sendCoachMessage: (input) => request('/v1/coach/messages', { method: 'POST', auth: true, body: input }),
    graphql: (query, variables, operationName) => request('/graphql', { method: 'POST', auth: Boolean(getAccessToken()), body: { query, variables, operationName } }),
  };
}
