<?php
/**
 * Basic oruk usage: public feed → authed filtered list → pagination.
 *
 *   export ORUK_API_KEY=ork_xxxxxxxx
 *   php basic.php
 */
declare(strict_types=1);

require __DIR__ . '/client.php';

$oruk = new OrukClient(getenv('ORUK_API_KEY') ?: null);

// ----- 1. Public feed (no key required) -----
echo "=== /v1/stories/feed (public) ===\n";
$feed = $oruk->feed(['limit' => 5, 'sort' => 'recent']);
foreach ($feed['stories'] as $s) {
    printf(
        "[%s] %-9s %s\n  %s\n",
        $s['id'],
        $s['urgency'] ?? '?',
        $s['headline'] ?? '(no headline)',
        '   sources=' . ($s['corroboration']['count'] ?? 0)
            . ' impact='  . ($s['impact'] ?? '?')
            . ' city='    . ($s['eventCity'] ?? '?')
    );
}

// Everything below this point requires a key.
if (!getenv('ORUK_API_KEY')) {
    echo "\nSet ORUK_API_KEY to see the authed examples.\n";
    exit(0);
}

// ----- 2. Authed filtered list -----
echo "\n=== /v1/stories?category=conflict&min_impact=7 ===\n";
$conflict = $oruk->stories([
    'category'   => 'conflict',
    'min_impact' => 7,
    'limit'      => 5,
]);
foreach ($conflict['stories'] as $s) {
    printf("[%2d] %s\n", $s['impact'] ?? 0, $s['headline'] ?? '');
}

// ----- 3. Pagination via cursor -----
echo "\n=== Paging through last 7 days of economy stories (max 25) ===\n";
$since = gmdate('Y-m-d\TH:i:s\Z', strtotime('-7 days'));
$count = 0;
foreach ($oruk->streamPages(['category' => 'economy', 'since' => $since, 'limit' => 50]) as $s) {
    $count++;
    if ($count <= 5) {
        printf("  %s\n", $s['headline'] ?? '');
    }
    if ($count >= 25) break;
}
printf("\nPulled %d stories across pages.\n", $count);

// ----- 4. Stats -----
echo "\n=== /v1/stats ===\n";
$stats = $oruk->stats();
printf("Active sources: %d\nStories total:  %d\n",
    $stats['activeSources'] ?? 0,
    $stats['storiesTotal']  ?? 0,
);
echo "Top categories:\n";
foreach (array_slice($stats['topCategories'] ?? [], 0, 5) as $c) {
    printf("  %-12s %d\n", $c['category'] ?? '?', $c['count'] ?? 0);
}
