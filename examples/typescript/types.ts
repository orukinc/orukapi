/** Canonical Story shape returned by every oruk endpoint. */
export interface OrukStory {
  id: string;                       // evt_xxxx
  headline?: string;
  summary?: string;
  body?: string;
  category: OrukCategory;
  categories?: OrukCategory[];
  topics?: string[];
  urgency?: 'breaking' | 'developing' | 'routine';
  impact?: number;                  // 0-10
  confidence?: number;              // 0.0-1.0
  sourceName?: string;
  sourceId?: number;
  eventCity?: string | string[];
  eventCountry?: string;            // ISO 3166-1 alpha-2
  eventRegion?: OrukRegion;
  eventLat?: number;
  eventLon?: number;
  language?: string;
  translatedFrom?: string | null;
  firstSeenAt?: string;             // ISO 8601
  updatedAt?: string;
  timestamp?: string;
  storyStatus?: string;
  corroboration?: OrukCorroboration;
  timeline?: OrukTimelineEntry[];
  sources?: OrukSourceQuote[];
}

export interface OrukCorroboration {
  count: number;
  sources?: string[];
  sourceDetails?: Array<{
    name: string;
    region?: OrukRegion;
    language?: string;
    medium?: OrukMedium;
  }>;
}

export interface OrukTimelineEntry {
  at: string;
  text: string;
}

export interface OrukSourceQuote {
  station: string;
  quote: string;
  medium?: OrukMedium;
}

export type OrukCategory =
  | 'politics' | 'conflict' | 'economy' | 'disaster' | 'diplomacy'
  | 'science' | 'health' | 'technology' | 'culture' | 'environment'
  | 'sports' | 'other';

export type OrukRegion =
  | 'North America' | 'South America' | 'Europe' | 'Middle East'
  | 'Africa' | 'Asia-Pacific' | 'Global';

export type OrukMedium = 'audio_radio' | 'social' | 'structured';

export interface OrukStoriesResponse {
  stories: OrukStory[];
  meta?: {
    count?: number;
    window?: string;
    cursor?: string | null;
    hasMore?: boolean;
  };
}

/** Query params for /v1/stories. All optional. */
export interface OrukStoryQuery {
  limit?: number;
  cursor?: string;
  category?: OrukCategory;
  since?: string;
  topics?: string;
  q?: string;
  region?: OrukRegion;
  country?: string;
  urgency?: 'breaking' | 'developing' | 'routine';
  min_impact?: number;
  min_confidence?: number;
  format?: 'json' | 'csv' | 'jsonl';
  sort?: 'recent' | 'impact';
  since_hours?: number;
}
