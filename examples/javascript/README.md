# JavaScript (Node) examples

Runnable Node.js examples for the oruk API. Node 18+ (uses the built-in `fetch`).

```bash
npm install
export ORUK_API_KEY=ork_xxxxxxxx
node basic.js
node single_story.js evt_8f3a2b
node sse.js
```

| File | What it shows |
|---|---|
| [`oruk-client.js`](oruk-client.js) | Reusable `OrukClient` class with async iterator pagination |
| [`basic.js`](basic.js) | Public feed + authed filtered list + pagination |
| [`single_story.js`](single_story.js) | `GET /v1/stories/{id}` with corroboration printout |
| [`sse.js`](sse.js) | Long-lived SSE consumer (Trader / Developer / Enterprise tier) |
| [`webhook_verify.js`](webhook_verify.js) | Express endpoint that verifies HMAC-SHA256 signatures |
| [`package.json`](package.json) | Minimal — only `eventsource` and `express` |
