// SSE consumer for /v1/stream. Requires Trader / Developer / Enterprise tier.
// Standard library only - no third-party SSE client needed.
//
//	export ORUK_API_KEY=ork_xxxxxxxx
//	go run ./cmd/sse
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

const sseURL = "https://api.oruk.ai/v1/stream"

func main() {
	key := os.Getenv("ORUK_API_KEY")
	if key == "" {
		fmt.Fprintln(os.Stderr, "Set ORUK_API_KEY first.")
		os.Exit(1)
	}

	lastEventID := ""
	backoff := time.Second
	for {
		fmt.Fprintf(os.Stderr, "[sse] connecting%s...\n", resumeNote(lastEventID))
		err := streamOnce(context.Background(), key, &lastEventID)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[sse] disconnected: %v. Backing off %s...\n", err, backoff)
		}
		time.Sleep(backoff)
		if backoff < 60*time.Second {
			backoff *= 2
		}
	}
}

func resumeNote(id string) string {
	if id == "" {
		return ""
	}
	return " (resume from " + id + ")"
}

func streamOnce(ctx context.Context, key string, lastID *string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, sseURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-API-Key", key)
	req.Header.Set("Accept", "text/event-stream")
	if *lastID != "" {
		req.Header.Set("Last-Event-ID", *lastID)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case 401:
		fmt.Fprintln(os.Stderr, "[sse] 401 unauthorized - check ORUK_API_KEY")
		os.Exit(1)
	case 403:
		fmt.Fprintln(os.Stderr, "[sse] 403 forbidden - SSE requires Trader/Developer/Enterprise tier")
		os.Exit(1)
	}

	br := bufio.NewReader(resp.Body)
	var eventType string
	var dataBuf strings.Builder
	var eventID string

	for {
		line, err := br.ReadString('\n')
		if err != nil {
			return err
		}
		line = strings.TrimRight(line, "\r\n")

		if line == "" {
			// Event complete
			if dataBuf.Len() > 0 {
				handle(eventType, dataBuf.String())
				if eventID != "" {
					*lastID = eventID
				}
			}
			eventType, eventID = "message", ""
			dataBuf.Reset()
			continue
		}
		if strings.HasPrefix(line, ":") {
			continue // SSE comment / heartbeat
		}
		if strings.HasPrefix(line, "event:") {
			eventType = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
		} else if strings.HasPrefix(line, "data:") {
			d := strings.TrimPrefix(line, "data:")
			d = strings.TrimPrefix(d, " ")
			dataBuf.WriteString(d)
			dataBuf.WriteByte('\n')
		} else if strings.HasPrefix(line, "id:") {
			eventID = strings.TrimSpace(strings.TrimPrefix(line, "id:"))
		}
	}
}

func handle(eventType, raw string) {
	raw = strings.TrimRight(raw, "\n")
	var d map[string]any
	if err := json.Unmarshal([]byte(raw), &d); err != nil {
		return
	}
	switch eventType {
	case "story":
		id := truncate(get(d, "id"), 4, 12)
		fmt.Printf("[%s] %-9s %-9s %s\n", id, get(d, "urgency"), get(d, "category"), get(d, "headline"))
	case "corroboration":
		fmt.Printf("  ↑ +%-20s now %v sources on %s\n",
			get(d, "newSource"), d["count"], truncate(get(d, "storyId"), 4, 12))
	case "heartbeat":
		fmt.Printf("· heartbeat - %v sources live\n", d["activeSources"])
	default:
		fmt.Printf("[%s] %s\n", eventType, raw)
	}
}

func get(m map[string]any, k string) string {
	if v, ok := m[k].(string); ok {
		return v
	}
	return ""
}
func truncate(s string, start, end int) string {
	if start >= len(s) || end > len(s) {
		return s
	}
	return s[start:end]
}
