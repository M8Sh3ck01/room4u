const crypto = require('crypto');

const config = require('@config');
const { appError } = require('@core/errors');

const generateTxRef = () =>
  `room4u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

async function verifyPayment(txRef) {
  let res;
  try {
    res = await fetch(`${config.paychangu.apiUrl}/verify-payment/${txRef}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.paychangu.secret}`,
      },
    });
  } catch (err) {
    throw appError(502, 'GATEWAY_ERROR', 'Payment provider unavailable — try again later');
  }

  if (!res.ok) {
    throw appError(502, 'GATEWAY_ERROR', 'Payment provider could not verify the charge');
  }

  const body = await res.json().catch(() => ({}));
  if (!body || !body.data) {
    throw appError(502, 'GATEWAY_ERROR', 'Payment provider returned no verification data');
  }

  return body.data;
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = config.paychangu.webhookSecret;
  if (!secret || !signature) return false;

  const bodyBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  const expected = crypto.createHmac('sha256', secret).update(bodyBuffer).digest();
  const given = Buffer.from(String(signature).replace(/^sha256=/, ''), 'hex');

  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}

module.exports = { generateTxRef, verifyPayment, verifyWebhookSignature };
