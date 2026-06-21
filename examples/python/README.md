# Python examples

Runnable Python examples for the oruk API. Python 3.9+. Uses `requests` and (for SSE) the `sseclient-py` shim - both available via pip.

```bash
pip install -r requirements.txt
export ORUK_API_KEY=ork_xxxxxxxx
python basic.py
python single_story.py evt_8f3a2b
python sse.py
```

| File | What it shows |
|---|---|
| [`oruk_client.py`](oruk_client.py) | Reusable `OrukClient` class with `iter_pages()` |
| [`basic.py`](basic.py) | Public feed + authed filtered list + pagination |
| [`single_story.py`](single_story.py) | `GET /v1/stories/{id}` with corroboration printout |
| [`sse.py`](sse.py) | Long-lived SSE consumer (Trader / Developer / Enterprise tier) |
| [`webhook_verify.py`](webhook_verify.py) | Flask endpoint that verifies HMAC-SHA256 webhook signatures |
