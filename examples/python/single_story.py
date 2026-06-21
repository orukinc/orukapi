"""Print a single story with full timeline + verbatim source quotes.

    export ORUK_API_KEY=ork_xxxxxxxx
    python single_story.py evt_8f3a2b
"""

from __future__ import annotations

import os
import sys

from oruk_client import OrukClient


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: python single_story.py <evt_id>")
    if not os.environ.get("ORUK_API_KEY"):
        sys.exit("Set ORUK_API_KEY first.")

    oruk = OrukClient(api_key=os.environ["ORUK_API_KEY"])
    story = oruk.story(sys.argv[1])

    print("╔" + "═" * 70 + "╗")
    print(f"  {story.get('headline', '')}")
    print("╚" + "═" * 70 + "╝")
    print()
    print(story.get("summary", ""), end="\n\n")

    print(
        f"Category:   {story.get('category')}  "
        f"(also: {', '.join(story.get('categories', []))})"
    )
    print(f"Urgency:    {story.get('urgency')}")
    print(f"Impact:     {story.get('impact', 0)} / 10")
    print(f"Confidence: {story.get('confidence', 0):.2f}")
    print(
        f"Location:   {story.get('eventCity','?')}, "
        f"{story.get('eventCountry','?')} ({story.get('eventRegion','?')})"
    )
    print(f"First seen: {story.get('firstSeenAt','')}")
    print(f"Updated:    {story.get('updatedAt','')}")

    corrob = story.get("corroboration") or {}
    print(f"\n— Corroboration: {corrob.get('count', 0)} independent sources —")
    for sd in corrob.get("sourceDetails", []):
        print(
            f"  • {sd.get('name', ''):22s} "
            f"({sd.get('region','')}, {sd.get('language','')}, {sd.get('medium','')})"
        )

    print("\n— Timeline of developments —")
    for t in story.get("timeline", []):
        print(f"  {t.get('at','')}  {t.get('text','')}")

    print("\n— Verbatim source quotes —")
    for s in story.get("sources", []):
        print(f"  [{s.get('station','')}]")
        print(f"  \"{s.get('quote','')}\"\n")

    print(f"\nCanonical URL: https://oruk.ai/story/{story.get('id')}")


if __name__ == "__main__":
    main()
