"""SSE consumer for /v1/stream — requires Trader / Developer / Enterprise tier.

    pip install -r requirements.txt
    export ORUK_API_KEY=ork_xxxxxxxx
    python sse.py

Auto-reconnects on disconnect with exponential backoff. Resumes via Last-Event-ID.
"""

from __future__ import annotations

import json
import os
import sys
import time
from typing import Optional

import requests
from sseclient import SSEClient


SSE_URL = "https://api.oruk.ai/v1/stream"


def handle_event(event_type: str, data: dict) -> None:
    if event_type == "story":
        print(
            f"[{(data.get('id') or '')[4:12]}] "
            f"{data.get('urgency','?'):9s} "
            f"{data.get('category','?'):9s} "
            f"{data.get('headline','')}"
        )

    elif event_type == "corroboration":
        print(
            f"  ↑ +{(data.get('newSource','') or ''):20s} "
            f"now {data.get('count',0)} sources on "
            f"{(data.get('storyId') or '')[4:12]}"
        )

    elif event_type == "heartbeat":
        print(f"· heartbeat — {data.get('activeSources', 0)} sources live")

    else:
        print(f"[{event_type}] {json.dumps(data)}")


def stream_once(api_key: str, last_event_id: Optional[str]) -> Optional[str]:
    """Connect and consume until disconnect. Returns the last seen event id."""
    headers = {
        "X-API-Key": api_key,
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
    }
    if last_event_id:
        headers["Last-Event-ID"] = last_event_id

    resp = requests.get(SSE_URL, headers=headers, stream=True, timeout=(10, None))
    if resp.status_code == 401:
        sys.exit("[sse] 401 unauthorized — check ORUK_API_KEY")
    if resp.status_code == 403:
        sys.exit("[sse] 403 forbidden — SSE requires Trader/Developer/Enterprise tier")
    resp.raise_for_status()

    client = SSEClient(resp)
    for event in client.events():
        if event.id:
            last_event_id = event.id
        if not event.data:
            continue
        try:
            data = json.loads(event.data)
        except ValueError:
            continue
        handle_event(event.event or "message", data)

    return last_event_id


def main() -> None:
    key = os.environ.get("ORUK_API_KEY")
    if not key:
        sys.exit("Set ORUK_API_KEY first.")

    last_event_id: Optional[str] = None
    retry = 1
    while True:
        try:
            print(
                f"[sse] connecting"
                + (f" (resume from {last_event_id})" if last_event_id else "")
                + "...",
                file=sys.stderr,
            )
            last_event_id = stream_once(key, last_event_id)
        except KeyboardInterrupt:
            return
        except Exception as e:
            print(f"[sse] disconnected: {e}. Backing off {retry}s...", file=sys.stderr)
        time.sleep(retry)
        retry = min(retry * 2, 60)


if __name__ == "__main__":
    main()
