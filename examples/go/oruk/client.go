// Package oruk is a minimal client for the oruk live broadcast intelligence API.
// Standard library only.
//
//	c := oruk.New(os.Getenv("ORUK_API_KEY"))
//	resp, err := c.Stories(ctx, oruk.Query{Category: "conflict", MinImpact: 7})
package oruk

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const BaseURL = "https://api.oruk.ai"

// Client is the entry point. Zero value is invalid — use New.
type Client struct {
	APIKey  string
	BaseURL string
	HTTP    *http.Client
}

// New returns a client with sensible defaults.
func New(apiKey string) *Client {
	return &Client{
		APIKey:  apiKey,
		BaseURL: BaseURL,
		HTTP:    &http.Client{Timeout: 15 * time.Second},
	}
}

// APIError is returned for any 4xx/5xx response.
type APIError struct {
	Status    int    `json:"-"`
	Code      string `json:"error"`
	Message   string `json:"message"`
	RequestID string `json:"-"`
}

func (e *APIError) Error() string { return fmt.Sprintf("oruk API: %s — %s", e.Code, e.Message) }

// Story is the canonical event shape returned by every endpoint.
type Story struct {
	ID            string         `json:"id"`
	Headline      string         `json:"headline,omitempty"`
	Summary       string         `json:"summary,omitempty"`
	Body          string         `json:"body,omitempty"`
	Category      string         `json:"category,omitempty"`
	Categories    []string       `json:"categories,omitempty"`
	Topics        []string       `json:"topics,omitempty"`
	Urgency       string         `json:"urgency,omitempty"`
	Impact        int            `json:"impact,omitempty"`
	Confidence    float64        `json:"confidence,omitempty"`
	SourceName    string         `json:"sourceName,omitempty"`
	SourceID      int            `json:"sourceId,omitempty"`
	EventCity     any            `json:"eventCity,omitempty"`
	EventCountry  string         `json:"eventCountry,omitempty"`
	EventRegion   string         `json:"eventRegion,omitempty"`
	EventLat      float64        `json:"eventLat,omitempty"`
	EventLon      float64        `json:"eventLon,omitempty"`
	Language      string         `json:"language,omitempty"`
	FirstSeenAt   string         `json:"firstSeenAt,omitempty"`
	UpdatedAt     string         `json:"updatedAt,omitempty"`
	Timestamp     string         `json:"timestamp,omitempty"`
	StoryStatus   string         `json:"storyStatus,omitempty"`
	Corroboration *Corroboration `json:"corroboration,omitempty"`
	Timeline      []TimelineRow  `json:"timeline,omitempty"`
	Sources       []SourceQuote  `json:"sources,omitempty"`
}

type Corroboration struct {
	Count         int                  `json:"count"`
	Sources       []string             `json:"sources,omitempty"`
	SourceDetails []CorroborationEntry `json:"sourceDetails,omitempty"`
}
type CorroborationEntry struct {
	Name     string `json:"name"`
	Region   string `json:"region,omitempty"`
	Language string `json:"language,omitempty"`
	Medium   string `json:"medium,omitempty"`
}
type TimelineRow struct {
	At   string `json:"at"`
	Text string `json:"text"`
}
type SourceQuote struct {
	Station string `json:"station"`
	Quote   string `json:"quote"`
	Medium  string `json:"medium,omitempty"`
}

// Query maps to GET /v1/stories query params. Zero-value fields are omitted.
type Query struct {
	Limit         int
	Cursor        string
	Category      string
	Since         string
	Topics        string
	Q             string
	Region        string
	Country       string
	Urgency       string
	MinImpact     int
	MinConfidence float64
	Format        string
	Sort          string
	SinceHours    int
}

func (q Query) Values() url.Values {
	v := url.Values{}
	if q.Limit > 0 {
		v.Set("limit", strconv.Itoa(q.Limit))
	}
	if q.Cursor != "" {
		v.Set("cursor", q.Cursor)
	}
	if q.Category != "" {
		v.Set("category", q.Category)
	}
	if q.Since != "" {
		v.Set("since", q.Since)
	}
	if q.Topics != "" {
		v.Set("topics", q.Topics)
	}
	if q.Q != "" {
		v.Set("q", q.Q)
	}
	if q.Region != "" {
		v.Set("region", q.Region)
	}
	if q.Country != "" {
		v.Set("country", q.Country)
	}
	if q.Urgency != "" {
		v.Set("urgency", q.Urgency)
	}
	if q.MinImpact > 0 {
		v.Set("min_impact", strconv.Itoa(q.MinImpact))
	}
	if q.MinConfidence > 0 {
		v.Set("min_confidence", strconv.FormatFloat(q.MinConfidence, 'f', -1, 64))
	}
	if q.Format != "" {
		v.Set("format", q.Format)
	}
	if q.Sort != "" {
		v.Set("sort", q.Sort)
	}
	if q.SinceHours > 0 {
		v.Set("since_hours", strconv.Itoa(q.SinceHours))
	}
	return v
}

type StoriesResponse struct {
	Stories []Story `json:"stories"`
	Meta    struct {
		Count   int    `json:"count,omitempty"`
		Window  string `json:"window,omitempty"`
		Cursor  string `json:"cursor,omitempty"`
		HasMore bool   `json:"hasMore,omitempty"`
	} `json:"meta"`
}

// Feed is the public no-key feed.
func (c *Client) Feed(ctx context.Context, q Query) (*StoriesResponse, error) {
	var out StoriesResponse
	return &out, c.get(ctx, "/v1/stories/feed", q.Values(), false, &out)
}

// Stories is the authed paginated list.
func (c *Client) Stories(ctx context.Context, q Query) (*StoriesResponse, error) {
	var out StoriesResponse
	return &out, c.get(ctx, "/v1/stories", q.Values(), true, &out)
}

// Story fetches a single story by evt_ id.
func (c *Client) Story(ctx context.Context, id string) (*Story, error) {
	var out Story
	return &out, c.get(ctx, "/v1/stories/"+url.PathEscape(id), nil, true, &out)
}

// EachPage iterates every story across all pages, calling fn for each.
// Return false from fn to stop early. Returns the first error encountered.
func (c *Client) EachPage(ctx context.Context, q Query, fn func(Story) bool) error {
	cursor := ""
	for {
		next := q
		if cursor != "" {
			next.Cursor = cursor
		}
		page, err := c.Stories(ctx, next)
		if err != nil {
			return err
		}
		for _, s := range page.Stories {
			if !fn(s) {
				return nil
			}
		}
		if !page.Meta.HasMore || page.Meta.Cursor == "" {
			return nil
		}
		cursor = page.Meta.Cursor
	}
}

func (c *Client) get(ctx context.Context, path string, v url.Values, requiresKey bool, out any) error {
	if requiresKey && c.APIKey == "" {
		return errors.New("ORUK_API_KEY required for " + path)
	}
	u := c.BaseURL + path
	if len(v) > 0 {
		u += "?" + v.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "oruk-go-example/1.0")
	if c.APIKey != "" {
		req.Header.Set("X-API-Key", c.APIKey)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		apiErr := &APIError{Status: resp.StatusCode, RequestID: resp.Header.Get("x-request-id")}
		_ = json.Unmarshal(body, apiErr)
		if apiErr.Code == "" {
			apiErr.Code = "http_error"
			apiErr.Message = fmt.Sprintf("HTTP %d from %s", resp.StatusCode, path)
		}
		return apiErr
	}
	if out == nil {
		return nil
	}
	return json.Unmarshal(body, out)
}
