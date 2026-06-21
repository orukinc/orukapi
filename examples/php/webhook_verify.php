<?php
/**
 * Verify an inbound oruk webhook (HMAC-SHA256 on the raw body).
 *
 * Set ORUK_WEBHOOK_SECRET to the secret returned when you created the
 * webhook via `POST /v1/webhooks`. Drop this file at your endpoint URL.
 *
 * On verified request, the parsed payload is dispatched to handle_event().
 */
declare(strict_types=1);

const ORUK_SIGNATURE_HEADER = 'HTTP_X_ORUK_SIGNATURE';

$secret = getenv('ORUK_WEBHOOK_SECRET');
if (!$secret) {
    http_response_code(500);
    error_log('ORUK_WEBHOOK_SECRET is not set');
    exit('Server misconfigured');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('POST only');
}

$rawBody  = file_get_contents('php://input') ?: '';
$received = $_SERVER[ORUK_SIGNATURE_HEADER] ?? '';

if (!verify_oruk_signature($rawBody, $received, $secret)) {
    http_response_code(401);
    error_log('Invalid oruk webhook signature');
    exit('Invalid signature');
}

$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    http_response_code(400);
    exit('Bad JSON');
}

handle_event($payload['event'] ?? 'unknown', $payload['data'] ?? []);

// Always reply 200 quickly — slow webhook handlers get retried + back-pressured.
http_response_code(200);
echo 'ok';


/**
 * Constant-time HMAC-SHA256 verification.
 * Accepts either `sha256=<hex>` (preferred) or a bare hex digest.
 */
function verify_oruk_signature(string $body, string $received, string $secret): bool {
    if ($received === '') return false;
    if (str_starts_with($received, 'sha256=')) {
        $received = substr($received, 7);
    }
    $expected = hash_hmac('sha256', $body, $secret);
    return hash_equals($expected, $received);
}

function handle_event(string $type, array $data): void {
    switch ($type) {
        case 'story':
            // New or updated story — full payload (see README for shape)
            error_log(sprintf('[oruk] story %s impact=%d "%s"',
                $data['id'] ?? '?',
                $data['impact'] ?? 0,
                substr($data['headline'] ?? '', 0, 80),
            ));
            // your downstream pipeline here ...
            break;

        case 'corroboration':
            error_log(sprintf('[oruk] +%s -> %s (now %d sources)',
                $data['newSource'] ?? '?',
                $data['storyId']   ?? '?',
                $data['count']     ?? 0,
            ));
            break;

        default:
            error_log("[oruk] unhandled webhook event: $type");
    }
}
