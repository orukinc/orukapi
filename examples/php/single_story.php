<?php
/**
 * Print a single story with full timeline + verbatim source quotes.
 *
 *   export ORUK_API_KEY=ork_xxxxxxxx
 *   php single_story.php evt_8f3a2b
 */
declare(strict_types=1);

require __DIR__ . '/client.php';

if (PHP_SAPI !== 'cli') exit("CLI only\n");
$id = $argv[1] ?? null;
if (!$id) exit("usage: php single_story.php <evt_id>\n");
if (!getenv('ORUK_API_KEY')) exit("Set ORUK_API_KEY first.\n");

$oruk = new OrukClient(getenv('ORUK_API_KEY'));
$story = $oruk->story($id);

printf("╔══════════════════════════════════════════════════════════════════╗\n");
printf("  %s\n", $story['headline'] ?? '');
printf("╚══════════════════════════════════════════════════════════════════╝\n");
printf("\n%s\n\n", $story['summary'] ?? '');

printf("Category:   %s  (also: %s)\n",
    $story['category'] ?? '',
    implode(', ', $story['categories'] ?? []),
);
printf("Urgency:    %s\n", $story['urgency'] ?? '');
printf("Impact:     %d / 10\n", $story['impact'] ?? 0);
printf("Confidence: %.2f\n", $story['confidence'] ?? 0);
printf("Location:   %s, %s (%s)\n",
    $story['eventCity']    ?? '?',
    $story['eventCountry'] ?? '?',
    $story['eventRegion']  ?? '?',
);
printf("First seen: %s\nUpdated:    %s\n",
    $story['firstSeenAt'] ?? '',
    $story['updatedAt']   ?? '',
);

$corrob = $story['corroboration'] ?? [];
printf("\n— Corroboration: %d independent sources —\n", $corrob['count'] ?? 0);
foreach ($corrob['sourceDetails'] ?? [] as $sd) {
    printf("  • %-22s (%s, %s, %s)\n",
        $sd['name']     ?? '',
        $sd['region']   ?? '',
        $sd['language'] ?? '',
        $sd['medium']   ?? '',
    );
}

printf("\n— Timeline of developments —\n");
foreach ($story['timeline'] ?? [] as $t) {
    printf("  %s  %s\n", $t['at'] ?? '', $t['text'] ?? '');
}

printf("\n— Verbatim source quotes —\n");
foreach ($story['sources'] ?? [] as $s) {
    printf("  [%s]\n  \"%s\"\n\n", $s['station'] ?? '', $s['quote'] ?? '');
}

printf("\nCanonical URL: https://oruk.ai/story/%s\n", $story['id']);
