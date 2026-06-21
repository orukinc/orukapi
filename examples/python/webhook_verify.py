"""Flask endpoint that verifies oruk webhook signatures (HMAC-SHA256).

    pip install flask
    export ORUK_WEBHOOK_SECRET=whk_xxxxxxxx
    flask --app webhook_verify run --port 8080
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Optional

from flask import Flask, request

log = logging.getLogger("oruk-webhook")
logging.basicConfig(level=logging.INFO)

WEBHOOK_SECRET = os.environ.get("ORUK_WEBHOOK_SECRET")
if not WEBHOOK_SECRET:
    raise SystemExit("Set ORUK_WEBHOOK_SECRET")

app = Flask(__name__)


def verify_signature(body: bytes, received: Optional[str], secret: str) -> bool:
    """Constant-time HMAC-SHA256 check. Accepts `sha256=<hex>` or bare hex."""
    if not received:
        return False
    if received.startswith("sha256="):
        received = received[7:]
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


@app.post("/hooks/oruk")
def oruk_webhook():
    raw = request.get_data() or b""
    if not verify_signature(raw, request.headers.get("X-Oruk-Signature"), WEBHOOK_SECRET):
        log.warning("Invalid oruk webhook signature (request-id=%s)", request.headers.get("X-Request-ID"))
        return "Invalid signature", 401

    payload = request.get_json(silent=True) or {}
    event = payload.get("event", "unknown")
    data = payload.get("data", {})

    if event == "story":
        log.info(
            "[story] %s impact=%s \"%s\"",
            data.get("id"),
            data.get("impact"),
            (data.get("headline") or "")[:80],
        )
        # downstream pipeline goes here ...

    elif event == "corroboration":
        log.info(
            "[corroboration] +%s -> %s (now %d sources)",
            data.get("newSource"),
            data.get("storyId"),
            data.get("count", 0),
        )

    else:
        log.info("[unhandled] %s", event)

    # Always 200 quickly - slow handlers get retried and back-pressured.
    return "ok", 200


if __name__ == "__main__":
    app.run(port=8080)
