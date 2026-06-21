"""Basic oruk usage: public feed → authed filtered list → pagination.

    export ORUK_API_KEY=ork_xxxxxxxx
    python basic.py
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from oruk_client import OrukClient


def main() -> None:
    key = os.environ.get("ORUK_API_KEY")
    oruk = OrukClient(api_key=key)

    # ----- 1. Public feed -----
    print("=== /v1/stories/feed (public) ===")
    feed = oruk.feed(limit=5, sort="recent")
    for s in feed["stories"]:
        print(
            f"[{s['id']}] {s.get('urgency','?'):9s} "
            f"{s.get('headline','(no headline)')}\n"
            f"   sources={s.get('corroboration', {}).get('count', 0)} "
            f"impact={s.get('impact','?')} city={s.get('eventCity','?')}"
        )

    if not key:
        print("\nSet ORUK_API_KEY to see the authed examples.")
        return

    # ----- 2. Authed filter -----
    print("\n=== /v1/stories?category=conflict&min_impact=7 ===")
    conflict = oruk.stories(category="conflict", min_impact=7, limit=5)
    for s in conflict["stories"]:
        print(f"[{s.get('impact',0):2d}] {s.get('headline','')}")

    # ----- 3. Pagination -----
    print("\n=== Paging through last 7 days of economy stories (max 25) ===")
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    count = 0
    for s in oruk.iter_pages(category="economy", since=since, limit=50):
        count += 1
        if count <= 5:
            print("  ", s.get("headline", ""))
        if count >= 25:
            break
    print(f"\nPulled {count} stories across pages.")

    # ----- 4. Stats -----
    print("\n=== /v1/stats ===")
    stats = oruk.stats()
    print(f"Active sources: {stats.get('activeSources', 0)}")
    print(f"Stories total:  {stats.get('storiesTotal', 0)}")
    print("Top categories:")
    for c in (stats.get("topCategories") or [])[:5]:
        print(f"  {c.get('category','?'):12s} {c.get('count', 0)}")


if __name__ == "__main__":
    main()
