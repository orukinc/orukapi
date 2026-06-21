<?php
/**
 * SSE consumer for /v1/stream - requires Trader, Developer, or Enterprise tier.
 *
 *   export ORUK_API_KEY=ork_xxxxxxxx
 *   php sse.php
 *
 * Reconnects on disconnect with exponential backoff. Honors Last-Event-ID.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') exit("CLI only\n");
$key = getenv('ORUK_API_KEY');
if (!$key) exit("Set ORUK_API_KEY first.\n");

const SSE_URL = 'https://api.oruk.ai/v1/stream';

$lastEventId = null;
$retry = 1;

while (true) {
    fwrite(STDERR, "[sse] connecting" . ($lastEventId ? " (resume from $lastEventId)" : '') . "...\n");

    $buffer       = '';
    $currentEvent = 'message';
    $dataLines    = [];

    $writeCb = function ($ch, string $chunk) use (
        &$buffer, &$currentEvent, &$dataLines, &$lastEventId
    ): int {
        // Railway sometimes uses \r\n event separators - normalise.
        $buffer = str_replace("\r\n", "\n", $buffer . $chunk);

        while (($pos = strpos($buffer, "\n\n")) !== false) {
            $raw = substr($buffer, 0, $pos);
            $buffer = substr($buffer, $pos + 2);

            $currentEvent = 'message';
            $dataLines    = [];
            $eventId      = null;
            foreach (explode("\n", $raw) as $line) {
                if ($line === '' || $line[0] === ':') continue; // comments / heartbeats
                if (str_starts_with($line, 'event:'))  $currentEvent = trim(substr($line, 6));
                elseif (str_starts_with($line, 'data:')) $dataLines[] = ltrim(substr($line, 5));
                elseif (str_starts_with($line, 'id:'))   $eventId = trim(substr($line, 3));
            }
            if (!$dataLines) continue;
            $data = json_decode(implode("\n", $dataLines), true);
            if (!is_array($data)) continue;
            if ($eventId) $lastEventId = $eventId;

            handle_event($currentEvent, $data);
        }
        return strlen($chunk);
    };

    $headers = [
        'X-API-Key: ' . $key,
        'Accept: text/event-stream',
        'Cache-Control: no-cache',
    ];
    if ($lastEventId) $headers[] = 'Last-Event-ID: ' . $lastEventId;

    $ch = curl_init(SSE_URL);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER       => $headers,
        CURLOPT_HTTP_VERSION     => CURL_HTTP_VERSION_1_1, // HTTP/2 + SSE has known buffering quirks
        CURLOPT_RETURNTRANSFER   => false,
        CURLOPT_WRITEFUNCTION    => $writeCb,
        CURLOPT_TIMEOUT          => 0,
        CURLOPT_CONNECTTIMEOUT   => 10,
        CURLOPT_SSL_VERIFYPEER   => true,
        CURLOPT_TCP_KEEPALIVE    => 1,
        CURLOPT_TCP_KEEPIDLE     => 30,
    ]);
    curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err    = curl_error($ch);
    curl_close($ch);

    if ($status === 401) exit("[sse] 401 unauthorized - check your API key.\n");
    if ($status === 403) exit("[sse] 403 forbidden - SSE requires Trader/Developer/Enterprise tier.\n");

    fwrite(STDERR, "[sse] disconnected (status=$status err=$err). Backing off {$retry}s...\n");
    sleep($retry);
    $retry = min($retry * 2, 60);
}

function handle_event(string $type, array $data): void {
    switch ($type) {
        case 'story':
            printf("[%s] %-9s %-9s %s\n",
                substr($data['id'] ?? '', 4, 8),
                $data['urgency']  ?? '?',
                $data['category'] ?? '?',
                $data['headline'] ?? '',
            );
            break;

        case 'corroboration':
            printf("  ↑ +%-20s now %d sources on %s\n",
                $data['newSource'] ?? '',
                $data['count']     ?? 0,
                substr($data['storyId'] ?? '', 4, 8),
            );
            break;

        case 'heartbeat':
            printf("· heartbeat - %d sources live\n", $data['activeSources'] ?? 0);
            break;

        default:
            printf("[%s] %s\n", $type, json_encode($data));
    }
}
