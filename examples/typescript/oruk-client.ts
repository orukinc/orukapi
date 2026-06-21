import type {
  OrukStory,
  OrukStoriesResponse,
  OrukStoryQuery,
} from './types.ts';

export class OrukAPIError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  constructor(status: number, code: string, message: string, requestId?: string) {
    super(`oruk API: ${code} - ${message}`);
    this.name = 'OrukAPIError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export interface OrukClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class OrukClient {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;

  constructor({ apiKey, baseUrl = 'https://api.oruk.ai', timeoutMs = 15000 }: OrukClientOptions = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  feed(params: OrukStoryQuery = {}): Promise<OrukStoriesResponse> {
    return this.get('/v1/stories/feed', params, { requiresKey: false });
  }
  stories(params: OrukStoryQuery = {}): Promise<OrukStoriesResponse> {
    return this.get('/v1/stories', params);
  }
  story(id: string): Promise<OrukStory> {
    return this.get(`/v1/stories/${encodeURIComponent(id)}`);
  }
  sources(params: Record<string, unknown> = {}): Promise<unknown[]> {
    return this.get('/v1/sources', params);
  }
  regions(): Promise<unknown> { return this.get('/v1/regions'); }
  stats(): Promise<unknown>   { return this.get('/v1/stats'); }
  health(): Promise<unknown>  { return this.get('/v1/health', {}, { requiresKey: false }); }

  /** Async iterator that walks every page until `meta.hasMore` is false. */
  async *iterPages(params: OrukStoryQuery = {}): AsyncIterableIterator<OrukStory> {
    let cursor: string | undefined;
    while (true) {
      const page = await this.stories(cursor ? { ...params, cursor } : params);
      for (const story of page.stories ?? []) yield story;
      const meta = page.meta ?? {};
      if (!meta.hasMore || !meta.cursor) return;
      cursor = meta.cursor;
    }
  }

  private async get<T = any>(
    path: string,
    params: Record<string, unknown> = {},
    opts: { requiresKey?: boolean } = {},
  ): Promise<T> {
    const requiresKey = opts.requiresKey ?? true;
    if (requiresKey && !this.apiKey) {
      throw new Error(`ORUK_API_KEY is required for ${path}`);
    }
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'oruk-ts-example/1.0',
    };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let resp: Response;
    try {
      resp = await fetch(url, { headers, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
    if (!resp.ok) {
      let body: any = {};
      try { body = await resp.json(); } catch {}
      throw new OrukAPIError(
        resp.status,
        body?.error ?? 'http_error',
        body?.message ?? `HTTP ${resp.status} from ${path}`,
        resp.headers.get('x-request-id') ?? undefined,
      );
    }
    return resp.json() as Promise<T>;
  }
}
