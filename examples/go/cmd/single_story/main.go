// Print a single story with full timeline + verbatim source quotes.
//
//	export ORUK_API_KEY=ork_xxxxxxxx
//	go run ./cmd/single_story evt_8f3a2b
package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"oruk-examples/oruk"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: go run ./cmd/single_story <evt_id>")
		os.Exit(1)
	}
	key := os.Getenv("ORUK_API_KEY")
	if key == "" {
		fmt.Fprintln(os.Stderr, "Set ORUK_API_KEY first.")
		os.Exit(1)
	}

	s, err := oruk.New(key).Story(context.Background(), os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	rule := strings.Repeat("═", 70)
	fmt.Println("╔" + rule + "╗")
	fmt.Println("  " + s.Headline)
	fmt.Println("╚" + rule + "╝")
	fmt.Println()
	fmt.Println(s.Summary)
	fmt.Println()
	fmt.Printf("Category:   %s  (also: %s)\n", s.Category, strings.Join(s.Categories, ", "))
	fmt.Printf("Urgency:    %s\n", s.Urgency)
	fmt.Printf("Impact:     %d / 10\n", s.Impact)
	fmt.Printf("Confidence: %.2f\n", s.Confidence)
	fmt.Printf("Location:   %v, %s (%s)\n", s.EventCity, s.EventCountry, s.EventRegion)

	if s.Corroboration != nil {
		fmt.Printf("\n- Corroboration: %d independent sources -\n", s.Corroboration.Count)
		for _, sd := range s.Corroboration.SourceDetails {
			fmt.Printf("  • %-22s (%s, %s, %s)\n", sd.Name, sd.Region, sd.Language, sd.Medium)
		}
	}

	fmt.Println("\n- Timeline of developments -")
	for _, t := range s.Timeline {
		fmt.Printf("  %s  %s\n", t.At, t.Text)
	}

	fmt.Println("\n- Verbatim source quotes -")
	for _, src := range s.Sources {
		fmt.Printf("  [%s]\n", src.Station)
		fmt.Printf("  %q\n\n", src.Quote)
	}

	fmt.Printf("\nCanonical URL: https://oruk.ai/story/%s\n", s.ID)
}
