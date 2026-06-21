/**
 * Print a single story with full timeline + verbatim source quotes.
 *
 *   export ORUK_API_KEY=ork_xxxxxxxx
 *   node single_story.js evt_8f3a2b
 */
import { OrukClient } from './oruk-client.js';

const id = process.argv[2];
if (!id) {
  console.error('usage: node single_story.js <evt_id>');
  process.exit(1);
}
if (!process.env.ORUK_API_KEY) {
  console.error('Set ORUK_API_KEY first.');
  process.exit(1);
}

const oruk = new OrukClient({ apiKey: process.env.ORUK_API_KEY });
const story = await oruk.story(id);

const rule = '═'.repeat(70);
console.log('╔' + rule + '╗');
console.log(`  ${story.headline ?? ''}`);
console.log('╚' + rule + '╝');
console.log();
console.log(story.summary ?? '');
console.log();
console.log(`Category:   ${story.category}  (also: ${(story.categories ?? []).join(', ')})`);
console.log(`Urgency:    ${story.urgency}`);
console.log(`Impact:     ${story.impact ?? 0} / 10`);
console.log(`Confidence: ${(story.confidence ?? 0).toFixed(2)}`);
console.log(`Location:   ${story.eventCity ?? '?'}, ${story.eventCountry ?? '?'} (${story.eventRegion ?? '?'})`);
console.log(`First seen: ${story.firstSeenAt ?? ''}`);
console.log(`Updated:    ${story.updatedAt ?? ''}`);

const corrob = story.corroboration ?? {};
console.log(`\n- Corroboration: ${corrob.count ?? 0} independent sources -`);
for (const sd of corrob.sourceDetails ?? []) {
  console.log(`  • ${(sd.name ?? '').padEnd(22)} (${sd.region ?? ''}, ${sd.language ?? ''}, ${sd.medium ?? ''})`);
}

console.log('\n- Timeline of developments -');
for (const t of story.timeline ?? []) {
  console.log(`  ${t.at ?? ''}  ${t.text ?? ''}`);
}

console.log('\n- Verbatim source quotes -');
for (const s of story.sources ?? []) {
  console.log(`  [${s.station ?? ''}]`);
  console.log(`  "${s.quote ?? ''}"\n`);
}

console.log(`\nCanonical URL: https://oruk.ai/story/${story.id}`);
