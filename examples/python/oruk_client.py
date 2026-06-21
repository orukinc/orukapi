"""OrukClient — minimal `requests`-based client for the oruk live broadcast
intelligence API. Drop into any Python 3.9+ project.

    from oruk_client import OrukClient
    oruk = OrukClient(api_key=os.environ['ORUK_API_KEY'])
    for story in oruk.iter_pages(category='conflict', min_impact=7):
        print(story['headline'])
"""

from __future__ import annotations

import os
from typing import Any, Iterable, Iterator, Optional

import requests


class OrukAPIError(RuntimeError):
    def __init__(self, status: int, code: str, message: str, request_id: Optional[str] = None):
        super().__init__(f"oruk API: {code} — {message}")
        self.status = status
        self.code = code
        self.message = message
        self.request_id = request_id


class OrukClient:
    BASE_URL = "https://api.oruk.ai"
    DEFAULT_TIMEOUT = 15

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        session: Optional[requests.Session] = None,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": "oruk-python-example/1.0"})

    # ----- Endpoint shortcuts -----

    def feed(self, **params: Any) -> dict:
        """Public feed — works without a key."""
        return self._get("/v1/stories/feed", params=params, requires_key=False)

    def stories(self, **params: Any) -> dict:
        return self._get("/v1/stories", params=params)

    def story(self, story_id: str) -> dict:
        return self._get(f"/v1/stories/{story_id}")

    def sources(self, **params: Any) -> list:
        return self._get("/v1/sources", params=params)

    def regions(self) -> Any:
        return self._get("/v1/regions")

    def stats(self) -> dict:
        return self._get("/v1/stats")

    def health(self) -> dict:
        return self._get("/v1/health", requires_key=False)

    # ----- Pagination helper -----

    def iter_pages(self, **params: Any) -> Iterator[dict]:
        """Yield every story across as many pages as `meta.hasMore` reports."""
        cursor = None
        while True:
            page = self.stories(**(params if not cursor else {**params, "cursor": cursor}))
            for story in page.get("stories", []):
                yield story
            meta = page.get("meta", {})
            if not meta.get("hasMore") or not meta.get("cursor"):
                return
            cursor = meta["cursor"]

    # ----- Internal -----

    def _get(self, path: str, *, params: Optional[dict] = None, requires_key: bool = True) -> Any:
        headers = {"Accept": "application/json"}
        if requires_key:
            if not self.api_key:
                raise RuntimeError(f"ORUK_API_KEY is required for {path}")
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        resp = self.session.get(
            self.base_url + path,
            params=params or None,
            headers=headers,
            timeout=self.timeout,
        )
        if resp.status_code >= 400:
            try:
                body = resp.json()
            except ValueError:
                body = {}
            raise OrukAPIError(
                status=resp.status_code,
                code=body.get("error", "http_error"),
                message=body.get("message", resp.text[:200] or f"HTTP {resp.status_code}"),
                request_id=resp.headers.get("x-request-id"),
            )
        return resp.json()


def from_env() -> OrukClient:
    """Convenience: build a client from ORUK_API_KEY."""
    return OrukClient(api_key=os.environ.get("ORUK_API_KEY"))
