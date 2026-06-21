# oruk API - examples and reference

Real-world examples for using the [oruk](https://oruk.ai) live broadcast intelligence API in **PHP, Python, JavaScript, TypeScript, Ruby, Go, and curl**.

oruk listens to ~200 radio, TV, social, and structured feeds in real time and publishes corroborated news events with stable ids, multi-source verification, location, and confidence scores. The same data powers the live wire at [oruk.ai](https://oruk.ai).

- **Base URL:** `https://api.oruk.ai`
- **Sign up:** <https://oruk.ai/signup> (free, no credit card)
- **Generate keys:** <https://oruk.ai/dashboard>
- **Live docs:** <https://oruk.ai/docs>
- **Status:** <https://api.oruk.ai/health>

---

## Quick start

```bash
# Public feed - no key required
curl https://api.oruk.ai/v1/stories/feed?limit=10

# Authed feed with filters
curl -H "X-API-Key: ork_xxxxxxxx" \
  "https://api.oruk.ai/v1/stories?category=conflict&min_impact=7&limit=20"
```

That's the whole API in two requests. Everything below is variations on this theme.

---

## Authentication

Pass your API key on every authed request. Three accepted formats:

| Method | Header / param |
|---|---|
| Preferred | `X-API-Key: ork_xxxx` |
| OAuth-style | `Authorization: Bearer ork_xxxx` |
| EventSource fallback | `?api_key=ork_xxxx` (SSE only - for browsers that can't set headers) |

**Public endpoints** (no key required, no quota counted): `GET /health`, `GET /v1/health`, `GET /v1/stories/feed`.

Everything else under `/v1/*` needs a key. Get one at <https://oruk.ai/dashboard>.

---

## Endpoints at a glance

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness probe |
| GET | `/v1/stories/feed` | public | Pre-built feed of latest stories |
| GET | `/v1/stories` | key | Filterable + paginated story list |
| GET | `/v1/stories/{id}` | key | Single story by `evt_…` id with full timeline and source quotes |
| GET | `/v1/stream` | key + Trader/Dev/Enterprise | Server-Sent Events stream |
| GET | `/v1/sources` | key | Every monitored source (station, country, language, medium) |
| GET | `/v1/regions` | key | Regional story-count aggregates |
| GET | `/v1/stats` | key | System stats (active sources, throughput, top categories) |
| POST | `/v1/webhooks` | Developer+ | Subscribe an HTTPS endpoint to `story` / `corroboration` events |

### Query parameters for `/v1/stories`

| Param | Type | Notes |
|---|---|---|
| `limit` | int 1-100 | default 20 |
| `cursor` | string | story id from a prior page |
| `category` | string | one of the 12 categories - see below |
| `since` | ISO 8601 | `2026-04-28` or `2026-04-28T15:00:00Z` |
| `topics` | csv | topic filter (intersection) |
| `q` | string | full-text across headline / summary / body / source / city |
| `region` | string | one of 6 regions (North America, South America, Europe, Middle East, Africa, Asia-Pacific) |
| `country` | string | ISO 3166-1 alpha-2 (`US`, `DE`, `JP`) |
| `urgency` | enum | `breaking` / `developing` / `routine` |
| `min_impact` | int 0-10 | |
| `min_confidence` | float 0.0-1.0 | |
| `format` | enum | `json` (default) / `csv` / `jsonl` |

---

## Story shape

Every story payload - from `/v1/stories`, `/v1/stories/feed`, `/v1/stories/{id}`, or the SSE stream - looks like this:

```json
{
  "id": "evt_8f3a2b",
  "headline": "...",
  "summary": "...",
  "body": "...",
  "category": "conflict",
  "categories": ["conflict", "diplomacy"],
  "topics": ["Iran", "aircraft", "military"],
  "urgency": "breaking",
  "impact": 9,
  "confidence": 0.96,
  "sourceName": "BBC World Service",
  "sourceId": 14,
  "eventCity": "London",
  "eventCountry": "GB",
  "eventRegion": "Europe",
  "eventLat": 51.51,
  "eventLon": -0.13,
  "language": "en",
  "firstSeenAt": "2026-04-28T22:13:42Z",
  "updatedAt":   "2026-04-28T22:14:08Z",
  "timestamp":   "2026-04-28T22:13:42Z",
  "storyStatus": "developing",
  "corroboration": {
    "count": 4,
    "sources": ["BBC", "NPR", "Al Araby", "France Info"],
    "sourceDetails": [{"name": "BBC", "region": "Europe", "language": "en", "medium": "audio_radio"}]
  },
  "timeline": [
    {"at": "2026-04-28T21:30:00Z", "text": "Initial report on BBC World Service"},
    {"at": "2026-04-28T21:42:00Z", "text": "NPR confirms with named official"}
  ],
  "sources": [
    {"station": "BBC World Service", "quote": "...", "medium": "audio_radio"}
  ]
}
```

Field semantics worth knowing:

- **`corroboration.count`** is *independent* sources, not raw mentions. Two AP wires republished by different outlets count once.
- **`eventCity` / `eventCountry` / `eventRegion`** are where the news *happened* - don't confuse with `sources[*].medium` (where the broadcaster sits).
- **`confidence`** is the LLM extractor's self-reported confidence. Use `>= 0.85` for high-confidence reads, `>= 0.95` for automated decisioning.
- **`medium`** is one of `audio_radio`, `social`, `structured`.

---

## Categories (12)

A story has exactly one primary `category` plus a multi-category `categories[]` array:

`politics`, `conflict`, `economy`, `disaster`, `diplomacy`, `science`, `health`, `technology`, `culture`, `environment`, `sports`, `other`.

---

## Errors

Every error response has the same shape:

```json
{"error": "<machine_code>", "message": "<human_message>"}
```

| HTTP | code | Meaning |
|---|---|---|
| 400 | `invalid_request` | Malformed query parameters |
| 401 | `unauthorized` | Missing or invalid API key |
| 404 | `not_found` | Unknown story id |
| 429 | `rate_limit_exceeded` | Monthly quota exhausted - honor `Retry-After` |
| 500 | `internal_error` | Backend hiccup - retry with exponential backoff |
| 503 | `service_unavailable` | Pipeline temporarily down (rare) |

Every response carries `x-request-id`. Include it in support tickets.

---

## Rate limits and tiers

| Tier | $/mo | Calls/mo | API delay | Per-min | SSE |
|---|---|---|---|---|---|
| free | $0 | 100 | 5 min | 30 | – |
| pro | $12 | 1,000 | none | 60 | – |
| trader | $49 first month then $99 | 10,000 | none | 300 | ✓ |
| developer | $100 | 10,000 | none | 300 | ✓ |
| enterprise | contact | 1M+ | none | custom | ✓ |

- The live wire at <https://oruk.ai/> is real-time and free for everyone. Paid tiers are for the programmatic API.
- **One API call** = one REST request, *or* one SSE connection open (events on an open SSE stream don't re-bill), *or* one MCP tool invocation that reaches the backend.
- 429 honors `Retry-After`. Monthly quotas reset on the 1st of each month.

---

## SSE stream

Trader, Developer, and Enterprise tiers can connect to `GET /v1/stream` for Server-Sent Events.

Event types:

| Event | Payload |
|---|---|
| `story` | Full story payload (new or updated) |
| `corroboration` | `{storyId, newSource, count, sources, ...}` when an existing story gets a new corroborator |
| `heartbeat` | `{activeSources: 218}` system pulse (every ~15-30s) |

Reconnect with the `Last-Event-ID` header to resume from where you left off.

---

## Webhooks (Developer+)

`POST /v1/webhooks` with:

```json
{
  "url": "https://your-app.com/hooks/oruk",
  "events": ["story", "corroboration"],
  "filters": {
    "categories": ["conflict", "disaster"],
    "min_impact": 7,
    "min_confidence": 0.85,
    "country": "US",
    "topic_match": "earthquake"
  }
}
```

Every payload is HMAC-SHA256 signed with your webhook secret in the `X-Oruk-Signature` header. See [examples/php/webhook_verify.php](examples/php/webhook_verify.php), [examples/python/webhook_verify.py](examples/python/webhook_verify.py), and [examples/javascript/webhook_verify.js](examples/javascript/webhook_verify.js) for verification snippets.

Up to 5 active webhooks per account.

---

## Examples by language

Each subfolder has runnable code with a tiny README. Set `ORUK_API_KEY` in your environment first (`export ORUK_API_KEY=ork_xxxxxxxx`).

| Language | Folder |
|---|---|
| curl | [examples/curl/](examples/curl/) |
| PHP | [examples/php/](examples/php/) |
| Python | [examples/python/](examples/python/) |
| JavaScript (Node) | [examples/javascript/](examples/javascript/) |
| TypeScript | [examples/typescript/](examples/typescript/) |
| Ruby | [examples/ruby/](examples/ruby/) |
| Go | [examples/go/](examples/go/) |

Every example covers four things consistently:
1. **Basic** - fetch the public feed and a filtered authed list
2. **Single story** - `GET /v1/stories/{id}` with parsed corroboration
3. **SSE** - connect to `/v1/stream` and handle `story` / `corroboration` / `heartbeat` events
4. **Webhook verify** - HMAC-SHA256 verification of an inbound webhook (PHP, Python, JS only - same pattern in every language)

---

## MCP server

Already using an LLM agent or IDE? The [`oruk-mcp`](https://www.npmjs.com/package/oruk-mcp) package gives Claude Desktop, Cursor, Continue.dev, etc. native access to the oruk API as a Model Context Protocol server.

```bash
npx -y oruk-mcp
```

Configure in Claude Desktop / Cursor:

```json
{
  "mcpServers": {
    "oruk": {
      "command": "npx",
      "args": ["-y", "oruk-mcp"],
      "env": { "ORUK_API_KEY": "ork_xxxxxxxxxxxx" }
    }
  }
}
```

Without a key, the MCP runs in `public` mode and serves the freshest 50 stories from `/v1/stories/feed`. With a key, the full `/v1/stories` surface is available.

---

## Agent discovery

Building an autonomous agent? oruk publishes machine-readable discovery files:

- `https://oruk.ai/.well-known/ai.json` - full capability manifest
- `https://oruk.ai/.well-known/agent.json` - lightweight skill card
- `https://oruk.ai/AGENTS.md` - operating guide with citation rules
- `https://oruk.ai/llms.txt` - curated LLM index
- `https://oruk.ai/llms-full.txt` - exhaustive LLM context

---

## Support

- **Email** - <support@oruk.ai>
- **Editorial corrections** - <editorial@oruk.ai>
- **Sales / Enterprise** - <sales@oruk.ai> or <enterprise@oruk.ai>
- **Status**: <https://api.oruk.ai/health>

---

## License

MIT - see [LICENSE](LICENSE). Use these snippets however you like.
