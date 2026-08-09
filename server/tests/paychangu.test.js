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

  describe('generateTxRef', () => {
    it('returns unique prefixed ids', () => {
      const ids = new Set(Array.from({ length: 20 }, () => service.generateTxRef()));
      expect(ids.size).toBe(20);
      expect([...ids].every((id) => id.startsWith('room4u_'))).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    const raw = JSON.stringify({ reference: 'c1', amount: 20000, status: 'success' });

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

  describe('verifyPayment', () => {
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

    it('returns the verified transaction data', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { status: 'success', currency: 'MWK', amount: 20000, tx_ref: 'room4u_abc' },
        }),
      });

      const svc = freshService();
      const data = await svc.verifyPayment('room4u_abc');

      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${gatewayUrl}/verify-payment/room4u_abc`);
      expect(opts.method).toBe('GET');
      expect(opts.headers).toMatchObject({
        Accept: 'application/json',
        Authorization: 'Bearer sk-test',
      });
      expect(data).toMatchObject({ status: 'success', currency: 'MWK', amount: 20000 });
      fetchSpy.mockRestore();
    });

    it('throws GATEWAY_ERROR on a non-2xx verification response', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

      const svc = freshService();
      await expect(svc.verifyPayment('room4u_missing')).rejects.toMatchObject({
        statusCode: 502,
        code: 'GATEWAY_ERROR',
      });
      fetchSpy.mockRestore();
    });

    it('throws GATEWAY_ERROR on network failure', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNRESET'));

      const svc = freshService();
      await expect(svc.verifyPayment('room4u_down')).rejects.toMatchObject({
        statusCode: 502,
        code: 'GATEWAY_ERROR',
      });
      fetchSpy.mockRestore();
    });

    it('throws GATEWAY_ERROR when the gateway returns no verification data', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: null }),
      });

      const svc = freshService();
      await expect(svc.verifyPayment('room4u_empty')).rejects.toMatchObject({
        statusCode: 502,
        code: 'GATEWAY_ERROR',
      });
      fetchSpy.mockRestore();
    });
  });
});
