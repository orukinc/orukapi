# curl examples

Every endpoint, every common pattern, in copy-paste form. Set your key first:

```bash
export ORUK_API_KEY=ork_xxxxxxxx
```

## 1. Public feed (no key)

```bash
curl -s "https://api.oruk.ai/v1/stories/feed?limit=10" | jq .
```

```bash
# Just breaking news
curl -s "https://api.oruk.ai/v1/stories/feed?limit=20&sort=impact" \
  | jq '.stories[] | select(.urgency == "breaking") | {id, headline, impact}'
```

## 2. Authed filtered list

```bash
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?category=conflict&min_impact=7&limit=20" \
  | jq '.stories[] | {id, headline, impact, sources: .corroboration.count}'
```

```bash
# Stories in Japan from the last 6 hours
SINCE=$(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%SZ)
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?country=JP&since=$SINCE&limit=50"
```

```bash
# Full-text search across body / headline / source
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?q=earthquake&min_confidence=0.9"
```

## 3. Pagination via cursor

```bash
# First page
RESP=$(curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?category=economy&limit=50")
echo "$RESP" | jq '.stories | length'
CURSOR=$(echo "$RESP" | jq -r '.meta.cursor')

# Next page
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?category=economy&limit=50&cursor=$CURSOR"
```

## 4. Single story (full timeline + source quotes)

```bash
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories/evt_8f3a2b" | jq .
```

```bash
# Just the corroborating quotes
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories/evt_8f3a2b" \
  | jq '.sources[] | {station, quote: (.quote[0:120])}'
```

## 5. Bulk export

```bash
# Newline-delimited JSON, one story per line
SINCE=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?since=$SINCE&limit=100&format=jsonl" \
  > week.jsonl
wc -l week.jsonl
```

```bash
# CSV
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?since=$SINCE&limit=100&format=csv" \
  > week.csv
```

## 6. SSE stream (Trader / Developer / Enterprise)

```bash
curl -N -H "X-API-Key: $ORUK_API_KEY" \
  -H "Accept: text/event-stream" \
  https://api.oruk.ai/v1/stream
```

Reconnect from a known event id:

```bash
curl -N -H "X-API-Key: $ORUK_API_KEY" \
  -H "Accept: text/event-stream" \
  -H "Last-Event-ID: evt_8f3a2b" \
  https://api.oruk.ai/v1/stream
```

## 7. Catalog endpoints

```bash
# All monitored sources
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/sources?region=Europe" | jq '.[0:5]'

# Regional story counts
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  https://api.oruk.ai/v1/regions

# System stats
curl -s -H "X-API-Key: $ORUK_API_KEY" \
  https://api.oruk.ai/v1/stats | jq '{active: .activeSources, total: .storiesTotal, topCats: .topCategories[0:3]}'
```

## 8. Health check (public, never errors when up)

```bash
curl -sI https://api.oruk.ai/health | head -3
```

## 9. Create a webhook (Developer+)

```bash
curl -s -X POST -H "X-API-Key: $ORUK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/hooks/oruk",
    "events": ["story", "corroboration"],
    "filters": {
      "categories": ["conflict", "disaster"],
      "min_impact": 7
    }
  }' \
  https://api.oruk.ai/v1/webhooks | jq .
```

Response includes a `secret` — store it. Every payload sent to your endpoint will carry an `X-Oruk-Signature: sha256=<hex>` header that's an HMAC-SHA256 of the request body with that secret. See the PHP / Python / JS examples for verification code.

## Tip: Show response headers

```bash
curl -s -i -H "X-API-Key: $ORUK_API_KEY" \
  "https://api.oruk.ai/v1/stories?limit=1" | head -20
```

Useful headers to check:
- `x-request-id` — include in any support ticket
- `x-ratelimit-remaining` — calls left this month
- `x-oruk-tier` — your tier as the backend sees it
- `retry-after` — present on 429 responses
