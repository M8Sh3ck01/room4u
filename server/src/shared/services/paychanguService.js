const crypto = require('crypto');

const config = require('@config');
const { appError } = require('@core/errors');

const generateChargeId = () =>
  `room4u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

async function initiate({ booking, room }) {
  const charge_id = generateChargeId();

  if (!config.paychangu.enabled) {
    return {
      charge_id,
      payment_link: `https://paychangu.com/pay/${charge_id}`,
    };
  }

  // Real gateway contract — adjust to PayChangu's documented API once
  // credentials exist (headers, payload shape, and field names).
  const payload = {
    amount: config.amounts.tenantFee,
    currency: 'MWK',
    reference: charge_id,
    meta: {
      booking_id: String(booking._id),
      room_id: String(room._id),
    },
  };

  let res;
  try {
    res = await fetch(`${config.paychangu.apiUrl}/v1/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.paychangu.secret}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw appError(502, 'GATEWAY_ERROR', 'Payment provider unavailable — try again later');
  }

  if (!res.ok) {
    throw appError(502, 'GATEWAY_ERROR', 'Payment provider rejected the charge');
  }

  const body = await res.json().catch(() => ({}));
  const data = body && body.data ? body.data : body;
  const gatewayChargeId = data.charge_id || data.id || charge_id;
  const payment_link = data.payment_link || data.checkout_url || null;

  if (!payment_link) {
    throw appError(502, 'GATEWAY_ERROR', 'Payment provider returned no payment link');
  }

  return { charge_id: gatewayChargeId, payment_link };
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

module.exports = { initiate, verifyWebhookSignature, generateChargeId };
