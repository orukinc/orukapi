# TypeScript examples

TypeScript versions of the JavaScript examples, with strict types for the Story shape and API responses.

```bash
npm install
export ORUK_API_KEY=ork_xxxxxxxx
npx tsx basic.ts
npx tsx single_story.ts evt_8f3a2b
npx tsx sse.ts
```

| File | What it shows |
|---|---|
| [`types.ts`](types.ts) | Story, corroboration, source, and response types |
| [`oruk-client.ts`](oruk-client.ts) | Reusable `OrukClient` class with typed responses |
| [`basic.ts`](basic.ts) | Public feed + authed list + pagination |
| [`single_story.ts`](single_story.ts) | Single story with full timeline + quotes |
| [`sse.ts`](sse.ts) | SSE consumer with typed event payloads |
