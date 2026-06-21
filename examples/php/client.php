<?php
/**
 * OrukClient — minimal cURL-based client for the oruk live broadcast
 * intelligence API. Drop into any PHP 8+ project; no Composer required.
 *
 *   $oruk = new OrukClient(getenv('ORUK_API_KEY'));
 *   $stories = $oruk->stories(['category' => 'conflict', 'min_impact' => 7]);
 *   foreach ($stories['stories'] as $s) { ... }
 */
declare(strict_types=1);

final class OrukClient {
    public string $baseUrl = 'https://api.oruk.ai';
    public int    $timeoutSeconds = 15;

    public function __construct(public ?string $apiKey = null) {}

    /** Public feed — works without a key. */
    public function feed(array $params = []): array {
        return $this->get('/v1/stories/feed', $params, requiresKey: false);
    }

    /** Authed paginated, filterable story list. */
    public function stories(array $params = []): array {
        return $this->get('/v1/stories', $params);
    }

    /** Single story by `evt_…` id. */
    public function story(string $id): array {
        return $this->get('/v1/stories/' . rawurlencode($id));
    }

    /** Catalog of monitored sources. */
    public function sources(array $params = []): array {
        return $this->get('/v1/sources', $params);
    }

    public function regions(): array { return $this->get('/v1/regions'); }
    public function stats(): array   { return $this->get('/v1/stats'); }
    public function health(): array  { return $this->get('/v1/health', requiresKey: false); }

    /** Iterate through every page transparently. */
    public function streamPages(array $params = []): \Generator {
        $cursor = null;
        do {
            $page = $this->stories($cursor ? array_merge($params, ['cursor' => $cursor]) : $params);
            foreach (($page['stories'] ?? []) as $story) yield $story;
            $cursor = $page['meta']['cursor'] ?? null;
            $hasMore = !empty($page['meta']['hasMore']);
        } while ($hasMore && $cursor);
    }

    private function get(string $path, array $params = [], bool $requiresKey = true): array {
        if ($requiresKey && !$this->apiKey) {
            throw new RuntimeException('ORUK_API_KEY is required for ' . $path);
        }
        $url = $this->baseUrl . $path;
        if ($params) $url .= '?' . http_build_query($params);

        $headers = ['Accept: application/json'];
        if ($this->apiKey) $headers[] = 'X-API-Key: ' . $this->apiKey;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => $this->timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'oruk-php-example/1.0',
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new RuntimeException("curl error on $path: $err");
        }
        $decoded = json_decode((string)$body, true);
        if ($status >= 400) {
            $code = $decoded['error']    ?? 'http_error';
            $msg  = $decoded['message']  ?? "HTTP $status from $path";
            throw new RuntimeException("oruk API: $code — $msg", $status);
        }
        if (!is_array($decoded)) {
            throw new RuntimeException("Invalid JSON from $path");
        }
        return $decoded;
    }
}
