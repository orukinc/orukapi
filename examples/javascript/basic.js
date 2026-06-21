/**
 * Basic oruk usage: public feed → authed filtered list → pagination.
 *
 *   export ORUK_API_KEY=ork_xxxxxxxx
 *   node basic.js
 */
import { OrukClient } from './oruk-client.js';

const key = process.env.ORUK_API_KEY;
const oruk = new OrukClient({ apiKey: key });

// ----- 1. Public feed -----
console.log('=== /v1/stories/feed (public) ===');
const feed = await oruk.feed({ limit: 5, sort: 'recent' });
for (const s of feed.stories) {
  console.log(
    `[${s.id}] ${(s.urgency || '?').padEnd(9)} ${s.headline || '(no headline)'}\n` +
    `   sources=${s.corroboration?.count ?? 0} impact=${s.impact ?? '?'} city=${s.eventCity ?? '?'}`
  );
}

if (!key) {
  console.log('\nSet ORUK_API_KEY to see the authed examples.');
  process.exit(0);
}

// ----- 2. Authed filter -----
console.log('\n=== /v1/stories?category=conflict&min_impact=7 ===');
const conflict = await oruk.stories({ category: 'conflict', min_impact: 7, limit: 5 });
for (const s of conflict.stories) {
  console.log(`[${String(s.impact ?? 0).padStart(2)}] ${s.headline || ''}`);
}

// ----- 3. Pagination -----
console.log('\n=== Paging through last 7 days of economy stories (max 25) ===');
const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
let count = 0;
for await (const s of oruk.iterPages({ category: 'economy', since, limit: 50 })) {
  count++;
  if (count <= 5) console.log('  ', s.headline || '');
  if (count >= 25) break;
}
console.log(`\nPulled ${count} stories across pages.`);

// ----- 4. Stats -----
console.log('\n=== /v1/stats ===');
const stats = await oruk.stats();
console.log(`Active sources: ${stats.activeSources ?? 0}`);
console.log(`Stories total:  ${stats.storiesTotal ?? 0}`);
console.log('Top categories:');
for (const c of (stats.topCategories || []).slice(0, 5)) {
  console.log(`  ${(c.category ?? '?').padEnd(12)} ${c.count ?? 0}`);
}
