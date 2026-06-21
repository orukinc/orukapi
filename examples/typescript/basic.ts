import { OrukClient } from './oruk-client.ts';

const key = process.env.ORUK_API_KEY;
const oruk = new OrukClient({ apiKey: key });

console.log('=== /v1/stories/feed (public) ===');
const feed = await oruk.feed({ limit: 5, sort: 'recent' });
for (const s of feed.stories) {
  console.log(
    `[${s.id}] ${(s.urgency ?? '?').padEnd(9)} ${s.headline ?? '(no headline)'}\n` +
    `   sources=${s.corroboration?.count ?? 0} impact=${s.impact ?? '?'} city=${s.eventCity ?? '?'}`,
  );
}

if (!key) {
  console.log('\nSet ORUK_API_KEY to see the authed examples.');
  process.exit(0);
}

console.log('\n=== /v1/stories?category=conflict&min_impact=7 ===');
const conflict = await oruk.stories({ category: 'conflict', min_impact: 7, limit: 5 });
for (const s of conflict.stories) {
  console.log(`[${String(s.impact ?? 0).padStart(2)}] ${s.headline ?? ''}`);
}

console.log('\n=== Paging through last 7 days of economy stories (max 25) ===');
const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
let count = 0;
for await (const s of oruk.iterPages({ category: 'economy', since, limit: 50 })) {
  count++;
  if (count <= 5) console.log('  ', s.headline ?? '');
  if (count >= 25) break;
}
console.log(`\nPulled ${count} stories across pages.`);
