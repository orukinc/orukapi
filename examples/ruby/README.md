# Ruby examples

```bash
bundle install
export ORUK_API_KEY=ork_xxxxxxxx
ruby basic.rb
ruby single_story.rb evt_8f3a2b
ruby sse.rb
```

| File | Purpose |
|---|---|
| [`oruk_client.rb`](oruk_client.rb) | Reusable `OrukClient` class |
| [`basic.rb`](basic.rb) | Public feed + authed list + pagination |
| [`single_story.rb`](single_story.rb) | Single story with timeline + quotes |
| [`sse.rb`](sse.rb) | SSE consumer (Trader / Developer / Enterprise) |
| [`Gemfile`](Gemfile) | Minimal deps |
