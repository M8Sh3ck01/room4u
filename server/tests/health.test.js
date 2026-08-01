const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns ok:true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('Unknown route', () => {
  it('returns the error envelope with NOT_FOUND', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
