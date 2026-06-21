/**
 * OrukClient — minimal fetch-based client for the oruk live broadcast
 * intelligence API. Node 18+ (uses the built-in `fetch`).
 *
 *   import { OrukClient } from './oruk-client.js';
 *   const oruk = new OrukClient({ apiKey: process.env.ORUK_API_KEY });
 *   for await (const story of oruk.iterPages({ category: 'conflict', min_impact: 7 })) {
 *     console.log(story.headline);
 *   }
 */

export class OrukAPIError extends Error {
  constructor(status, code, message, requestId) {
    super(`oruk API: ${code} — ${message}`);
    this.name = 'OrukAPIError';
    this.status = status;
    this.code = code;
    this.message = message;
    this.requestId = requestId;
  }
}

export class OrukClient {
  constructor({ apiKey = null, baseUrl = 'https://api.oruk.ai', timeoutMs = 15000 } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  feed(params = {})    { return this._get('/v1/stories/feed', params, { requiresKey: false }); }
  stories(params = {}) { return this._get('/v1/stories', params); }
  story(id)            { return this._get(`/v1/stories/${encodeURIComponent(id)}`); }
  sources(params = {}) { return this._get('/v1/sources', params); }
  regions()            { return this._get('/v1/regions'); }
  stats()              { return this._get('/v1/stats'); }
  health()             { return this._get('/v1/health', {}, { requiresKey: false }); }

  /** Async iterator over every story across all pages. */
  async *iterPages(params = {}) {
    let cursor;
    while (true) {
      const page = await this.stories(cursor ? { ...params, cursor } : params);
      for (const story of page.stories || []) yield story;
      const meta = page.meta || {};
      if (!meta.hasMore || !meta.cursor) return;
      cursor = meta.cursor;
    }
  }

  async _get(path, params = {}, { requiresKey = true } = {}) {
    if (requiresKey && !this.apiKey) {
      throw new Error(`ORUK_API_KEY is required for ${path}`);
    }
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const headers = { Accept: 'application/json', 'User-Agent': 'oruk-node-example/1.0' };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let resp;
    try {
      resp = await fetch(url, { headers, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }

    if (!resp.ok) {
      let body = {};
      try { body = await resp.json(); } catch {}
      throw new OrukAPIError(
        resp.status,
        body.error || 'http_error',
        body.message || `HTTP ${resp.status} from ${path}`,
        resp.headers.get('x-request-id') || undefined,
      );
    }
    return resp.json();
  }
}
