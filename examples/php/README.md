# PHP examples

Runnable PHP examples for the oruk API. No dependencies beyond core cURL - works on any PHP 8.0+ install.

```bash
export ORUK_API_KEY=ork_xxxxxxxx
php basic.php
php single_story.php evt_8f3a2b
php sse.php
```

| File | What it shows |
|---|---|
| [`basic.php`](basic.php) | Public feed + authed filtered list + pagination via cursor |
| [`single_story.php`](single_story.php) | `GET /v1/stories/{id}` with corroboration printout |
| [`sse.php`](sse.php) | Long-lived SSE consumer (Trader / Developer / Enterprise tier) |
| [`webhook_verify.php`](webhook_verify.php) | HMAC-SHA256 verification of inbound webhook payloads |
| [`client.php`](client.php) | Small reusable `OrukClient` class - drop into your own app |

Each file is self-contained - you can copy any one into your project verbatim.
