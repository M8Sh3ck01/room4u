process.env.PAYCHANGU_WEBHOOK_SECRET = 'wh-secret';

const crypto = require('crypto');

const service = require('../src/shared/services/paychanguService');
const config = require('../src/config');

const sign = (body, secret) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('paychangu service', () => {
  afterAll(() => {
    delete process.env.PAYCHANGU_ENABLED;
    delete process.env.PAYCHANGU_API_URL;
    delete process.env.PAYCHANGU_SECRET;
    delete process.env.PAYCHANGU_WEBHOOK_SECRET;
  });

  describe('generateChargeId', () => {
    it('returns unique prefixed ids', () => {
      const ids = new Set(Array.from({ length: 20 }, () => service.generateChargeId()));
      expect(ids.size).toBe(20);
      expect([...ids].every((id) => id.startsWith('room4u_'))).toBe(true);
    });
  });

  describe('initiate — stub mode (disabled)', () => {
    it('returns a stub charge and payment link without any network call', async () => {
      expect(config.paychangu.enabled).toBe(false);
      const { charge_id, payment_link } = await service.initiate({
        booking: { _id: 'booking-1' },
        room: { _id: 'room-1' },
      });
      expect(charge_id).toMatch(/^room4u_/);
      expect(payment_link).toMatch(/^https:\/\/paychangu\.com\/pay\//);
    });
  });

  describe('verifyWebhookSignature', () => {
    const raw = JSON.stringify({ charge_id: 'c1', amount: 20000, status: 'SUCCESS' });

    it('accepts a valid HMAC signature', () => {
      expect(service.verifyWebhookSignature(raw, sign(raw, 'wh-secret'))).toBe(true);
    });

    it('accepts a signature with the optional sha256= prefix', () => {
      expect(service.verifyWebhookSignature(raw, `sha256=${sign(raw, 'wh-secret')}`)).toBe(true);
    });

    it('accepts a Buffer body, as express.raw will deliver in the webhook route', () => {
      const buf = Buffer.from(raw, 'utf8');
      expect(service.verifyWebhookSignature(buf, sign(raw, 'wh-secret'))).toBe(true);
    });

    it('rejects a signature of the wrong length', () => {
      expect(service.verifyWebhookSignature(raw, 'deadbeef')).toBe(false);
      expect(service.verifyWebhookSignature(raw, `${sign(raw, 'wh-secret')}00`)).toBe(false);
    });

    it('rejects a tampered body', () => {
      expect(service.verifyWebhookSignature(`${raw} `, sign(raw, 'wh-secret'))).toBe(false);
    });

    it('rejects a signature from the wrong secret', () => {
      expect(service.verifyWebhookSignature(raw, sign(raw, 'other-secret'))).toBe(false);
    });

    it('fails closed when no signature is provided', () => {
      expect(service.verifyWebhookSignature(raw, null)).toBe(false);
      expect(service.verifyWebhookSignature(raw, '')).toBe(false);
    });

    it('fails closed when no webhook secret is configured', () => {
      delete process.env.PAYCHANGU_WEBHOOK_SECRET;
      jest.resetModules();
      const svc = require('../src/shared/services/paychanguService');
      expect(svc.verifyWebhookSignature(raw, sign(raw, 'wh-secret'))).toBe(false);
      process.env.PAYCHANGU_WEBHOOK_SECRET = 'wh-secret';
      jest.resetModules();
      require('../src/shared/services/paychanguService');
    });
  });

  describe('initiate — real mode (enabled)', () => {
    const gatewayUrl = 'https://gateway.test';

    beforeAll(() => {
      process.env.PAYCHANGU_ENABLED = 'true';
      process.env.PAYCHANGU_API_URL = gatewayUrl;
      process.env.PAYCHANGU_SECRET = 'sk-test';
      jest.resetModules();
    });

    const freshService = () => {
      jest.resetModules();
      return require('../src/shared/services/paychanguService');
    };

    it('posts a charge to the gateway and returns the parsed charge + link', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            charge_id: 'gateway_123',
            payment_link: 'https://gateway.test/pay/gateway_123',
          },
        }),
      });

      const svc = freshService();
      const res = await svc.initiate({ booking: { _id: 'booking-1' }, room: { _id: 'room-1' } });

      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${gatewayUrl}/v1/charges`);
      expect(opts.method).toBe('POST');
      expect(opts.headers).toMatchObject({
        Authorization: 'Bearer sk-test',
        'Content-Type': 'application/json',
      });
      const sent = JSON.parse(opts.body);
      expect(sent).toEqual({
        amount: 20000,
        currency: 'MWK',
        reference: expect.stringMatching(/^room4u_/),
        meta: { booking_id: 'booking-1', room_id: 'room-1' },
      });
      expect(res.charge_id).toBe('gateway_123');
      expect(res.payment_link).toBe('https://gateway.test/pay/gateway_123');
      fetchSpy.mockRestore();
    });

    it('throws GATEWAY_ERROR when the gateway responds non-2xx', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

      const svc = freshService();
      await expect(svc.initiate({ booking: { _id: 'b' }, room: { _id: 'r' } })).rejects.toMatchObject({
        statusCode: 502,
        code: 'GATEWAY_ERROR',
      });
      fetchSpy.mockRestore();
    });

    it('throws GATEWAY_ERROR on network failure', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const svc = freshService();
      await expect(svc.initiate({ booking: { _id: 'b' }, room: { _id: 'r' } })).rejects.toMatchObject({
        statusCode: 502,
        code: 'GATEWAY_ERROR',
      });
      fetchSpy.mockRestore();
    });

    it('throws GATEWAY_ERROR when the gateway returns no payment link', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: { charge_id: 'gateway_456' } }),
      });

      const svc = freshService();
      await expect(svc.initiate({ booking: { _id: 'b' }, room: { _id: 'r' } })).rejects.toMatchObject({
        statusCode: 502,
        code: 'GATEWAY_ERROR',
      });
      fetchSpy.mockRestore();
    });

    it('throws GATEWAY_ERROR when the gateway returns an unparseable body', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      const svc = freshService();
      await expect(svc.initiate({ booking: { _id: 'b' }, room: { _id: 'r' } })).rejects.toMatchObject({
        statusCode: 502,
        code: 'GATEWAY_ERROR',
      });
      fetchSpy.mockRestore();
    });
  });
});
