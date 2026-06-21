import EventSource from 'eventsource';
import type { OrukStory } from './types.ts';

const key = process.env.ORUK_API_KEY;
if (!key) { console.error('Set ORUK_API_KEY first.'); process.exit(1); }

interface CorroborationEvent {
  storyId: string;
  newSource?: string;
  count?: number;
  sources?: string[];
}

interface HeartbeatEvent {
  activeSources?: number;
}

const es = new EventSource('https://api.oruk.ai/v1/stream', {
  headers: { 'X-API-Key': key, 'Accept': 'text/event-stream' },
} as any);

es.onopen = () => process.stderr.write('[sse] connected\n');

es.onerror = (err: any) => {
  if (err?.status === 401) { console.error('[sse] 401 unauthorized'); process.exit(1); }
  if (err?.status === 403) { console.error('[sse] 403 forbidden — needs Trader/Developer/Enterprise tier'); process.exit(1); }
  process.stderr.write(`[sse] error — ${err?.message ?? err} (will auto-reconnect)\n`);
};

es.addEventListener('story', (ev: MessageEvent) => {
  const d: OrukStory = JSON.parse(ev.data);
  console.log(
    `[${(d.id ?? '').slice(4, 12)}] ${(d.urgency ?? '?').padEnd(9)} ` +
    `${(d.category ?? '?').padEnd(9)} ${d.headline ?? ''}`,
  );
});

es.addEventListener('corroboration', (ev: MessageEvent) => {
  const d: CorroborationEvent = JSON.parse(ev.data);
  console.log(
    `  ↑ +${(d.newSource ?? '').padEnd(20)} now ${d.count ?? 0} sources on ${(d.storyId ?? '').slice(4, 12)}`,
  );
});

es.addEventListener('heartbeat', (ev: MessageEvent) => {
  const d: HeartbeatEvent = JSON.parse(ev.data);
  console.log(`· heartbeat — ${d.activeSources ?? 0} sources live`);
});

process.on('SIGINT', () => { es.close(); process.exit(0); });
