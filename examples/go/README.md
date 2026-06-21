# Go examples

```bash
export ORUK_API_KEY=ork_xxxxxxxx
go run ./cmd/basic
go run ./cmd/single_story evt_8f3a2b
go run ./cmd/sse
```

| Path | Purpose |
|---|---|
| [`oruk/`](oruk/) | Reusable `oruk.Client` package |
| [`cmd/basic/`](cmd/basic/) | Public feed + authed list + pagination |
| [`cmd/single_story/`](cmd/single_story/) | Single story with timeline + quotes |
| [`cmd/sse/`](cmd/sse/) | SSE consumer (Trader / Developer / Enterprise) |
| [`go.mod`](go.mod) | Module file — no external deps |
