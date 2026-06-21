// Basic oruk usage: public feed -> authed list -> pagination.
//
//	export ORUK_API_KEY=ork_xxxxxxxx
//	go run ./cmd/basic
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"oruk-examples/oruk"
)

func main() {
	ctx := context.Background()
	key := os.Getenv("ORUK_API_KEY")
	c := oruk.New(key)

	fmt.Println("=== /v1/stories/feed (public) ===")
	feed, err := c.Feed(ctx, oruk.Query{Limit: 5, Sort: "recent"})
	must(err)
	for _, s := range feed.Stories {
		fmt.Printf("[%s] %-9s %s\n", s.ID, s.Urgency, s.Headline)
		count := 0
		if s.Corroboration != nil {
			count = s.Corroboration.Count
		}
		fmt.Printf("   sources=%d impact=%d city=%v\n", count, s.Impact, s.EventCity)
	}

	if key == "" {
		fmt.Println("\nSet ORUK_API_KEY to see the authed examples.")
		return
	}

	fmt.Println("\n=== /v1/stories?category=conflict&min_impact=7 ===")
	conflict, err := c.Stories(ctx, oruk.Query{Category: "conflict", MinImpact: 7, Limit: 5})
	must(err)
	for _, s := range conflict.Stories {
		fmt.Printf("[%2d] %s\n", s.Impact, s.Headline)
	}

	fmt.Println("\n=== Paging through last 7 days of economy stories (max 25) ===")
	since := time.Now().UTC().Add(-7 * 24 * time.Hour).Format("2006-01-02T15:04:05Z")
	count := 0
	err = c.EachPage(ctx, oruk.Query{Category: "economy", Since: since, Limit: 50}, func(s oruk.Story) bool {
		count++
		if count <= 5 {
			fmt.Println("  ", s.Headline)
		}
		return count < 25
	})
	must(err)
	fmt.Printf("\nPulled %d stories across pages.\n", count)
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
