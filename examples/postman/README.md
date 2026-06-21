# Postman collection

Drop-in [Postman](https://www.postman.com) collection for the oruk API. Every endpoint, common filter combinations, SSE, and webhooks — all preconfigured with the right headers and auth scheme.

## Files

| File | What it is |
|---|---|
| [`oruk-api.postman_collection.json`](oruk-api.postman_collection.json) | The collection (v2.1.0 schema). Import into Postman Desktop or Postman Web. |
| [`oruk-api.postman_environment.json`](oruk-api.postman_environment.json) | Matching environment with `baseUrl`, `apiKey`, `storyId`, `cursor` variables. |

## Import

### Postman Desktop / Web

1. Open Postman -> **Workspaces** -> **Import** (top left)
2. Drag both JSON files in, or click **Files** and pick them
3. Once imported, select the **oruk (production)** environment in the dropdown (top-right)
4. Click the **Environments** tab on the left -> **oruk (production)** -> paste your key into the `apiKey` value
5. Hit **Send** on any request under the **Public (no key required)** folder to confirm connectivity

### CLI with newman (Postman's runner)

```bash
npm install -g newman
newman run oruk-api.postman_collection.json \
  --environment oruk-api.postman_environment.json \
  --env-var "apiKey=ork_xxxxxxxx" \
  --folder "Public (no key required)"
```

## What's in the collection

### Public (no key required)
- Health probe
- Feed (latest stories, sort by recency)
- Feed (top-impact, last 24h)

### Stories (auth)
- List all (latest 20)
- Filter by category + min_impact
- Filter by country + region
- Breaking news only
- High-confidence only (>= 0.9)
- Full-text search (`q`)
- Topic intersection (`topics`)
- Pagination - first page (captures cursor automatically via a test script)
- Pagination - next page (uses captured cursor)
- Bulk export as JSONL
- Bulk export as CSV
- Get a single story by `{evt_id}`

### Catalog
- Sources (all + filter by region)
- Regions
- Stats

### Stream (SSE)
- Live stream (Trader / Developer / Enterprise tiers)
- Resume from `Last-Event-ID`

Postman Desktop v10.18+ renders SSE responses natively in a Streamed Response panel — each `event:` line appears as it arrives.

### Webhooks (Developer+)
- Create
- List
- Delete

## Auth

The collection uses Postman's `apikey` auth scheme set at the collection level. Every request inherits it and sends `X-API-Key: {{apiKey}}` in the header automatically.

For the public endpoints (Feed, Health), auth is explicitly overridden to `noauth` on each request so you don't send a header you don't need.

To switch auth methods (e.g. `Authorization: Bearer <key>`), open the collection's **Authorization** tab and change the `key` field from `X-API-Key` to `Authorization`, then change `value` from `{{apiKey}}` to `Bearer {{apiKey}}`.

## Tips

- **Test scripts**: the pagination request has a sample test script that captures `meta.cursor` into a variable. Edit it under the request's **Tests** tab.
- **Pre-request scripts**: useful for computing a dynamic `since` timestamp:
  ```js
  pm.environment.set("since", new Date(Date.now() - 24*3600*1000).toISOString());
  ```
- **Variables**: change `baseUrl` to point at a staging environment, or override `storyId` per-request when fetching a specific story.

## See also

The same patterns in actual code in [`../php`](../php), [`../python`](../python), [`../javascript`](../javascript), [`../typescript`](../typescript), [`../ruby`](../ruby), and [`../go`](../go).
