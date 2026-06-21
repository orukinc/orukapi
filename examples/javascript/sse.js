/**
 * SSE consumer for /v1/stream - requires Trader / Developer / Enterprise tier.
 *
 *   npm install
 *   export ORUK_API_KEY=ork_xxxxxxxx
 *   node sse.js
 *
 * Auto-reconnects via the `eventsource` client. The Last-Event-ID header
 * (sent automatically by eventsource on reconnect) resumes from the last
 * successfully-delivered event.
 */
import EventSource from 'eventsource';

const key = process.env.ORUK_API_KEY;
if (!key) {
  console.error('Set ORUK_API_KEY first.');
  process.exit(1);
}

const url = 'https://api.oruk.ai/v1/stream';
const headers = {
  'X-API-Key': key,
  'Accept': 'text/event-stream',
};

// `eventsource@2` does not let us pass arbitrary headers in the browser-like
// constructor, but exposes an `https.options.headers` escape hatch.
const es = new EventSource(url, { headers });

es.onopen = () => process.stderr.write('[sse] connected\n');

es.onerror = err => {
  if (err?.status === 401) { console.error('[sse] 401 unauthorized - check ORUK_API_KEY'); process.exit(1); }
  if (err?.status === 403) { console.error('[sse] 403 forbidden - SSE requires Trader/Developer/Enterprise tier'); process.exit(1); }
  process.stderr.write(`[sse] error - ${err?.message ?? err} (will auto-reconnect)\n`);
};

es.addEventListener('story', ev => {
  const d = JSON.parse(ev.data);
  console.log(
    `[${(d.id ?? '').slice(4, 12)}] ${(d.urgency ?? '?').padEnd(9)} ` +
    `${(d.category ?? '?').padEnd(9)} ${d.headline ?? ''}`
  );
});

es.addEventListener('corroboration', ev => {
  const d = JSON.parse(ev.data);
  console.log(
    `  ↑ +${(d.newSource ?? '').padEnd(20)} now ${d.count ?? 0} sources on ${(d.storyId ?? '').slice(4, 12)}`
  );
});

es.addEventListener('heartbeat', ev => {
  const d = JSON.parse(ev.data);
  console.log(`· heartbeat - ${d.activeSources ?? 0} sources live`);
});

// Graceful shutdown
process.on('SIGINT', () => { es.close(); process.exit(0); });
