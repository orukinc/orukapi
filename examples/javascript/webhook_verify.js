/**
 * Express endpoint that verifies oruk webhook signatures (HMAC-SHA256).
 *
 *   npm install
 *   export ORUK_WEBHOOK_SECRET=whk_xxxxxxxx
 *   node webhook_verify.js
 */
import crypto from 'node:crypto';
import express from 'express';

const SECRET = process.env.ORUK_WEBHOOK_SECRET;
if (!SECRET) {
  console.error('Set ORUK_WEBHOOK_SECRET');
  process.exit(1);
}

const app = express();

/**
 * Constant-time HMAC-SHA256 verification.
 * Accepts `sha256=<hex>` (preferred) or bare hex.
 */
export function verifySignature(rawBody, received, secret) {
  if (!received) return false;
  if (received.startsWith('sha256=')) received = received.slice(7);
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

// IMPORTANT: capture the raw body before any JSON middleware mutates it.
app.use('/hooks/oruk', express.raw({ type: 'application/json', limit: '1mb' }));

app.post('/hooks/oruk', (req, res) => {
  const raw = req.body; // Buffer
  const sig = req.get('X-Oruk-Signature') || '';

  if (!verifySignature(raw, sig, SECRET)) {
    console.warn('[oruk] invalid signature; request-id=%s', req.get('x-request-id') ?? '');
    return res.status(401).send('Invalid signature');
  }

  let payload;
  try { payload = JSON.parse(raw.toString('utf8')); }
  catch { return res.status(400).send('Bad JSON'); }

  const { event, data } = payload ?? {};
  switch (event) {
    case 'story':
      console.log('[story] %s impact=%s "%s"',
        data?.id, data?.impact, (data?.headline ?? '').slice(0, 80));
      // downstream pipeline here ...
      break;

    case 'corroboration':
      console.log('[corroboration] +%s -> %s (now %d sources)',
        data?.newSource, data?.storyId, data?.count ?? 0);
      break;

    default:
      console.log('[unhandled] %s', event);
  }

  // Always 200 quickly — slow handlers get retried and back-pressured.
  res.status(200).send('ok');
});

app.listen(8080, () => console.log('listening on http://localhost:8080/hooks/oruk'));
