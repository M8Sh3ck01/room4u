process.env.NODE_ENV = 'test';
process.env.OPERATOR_EMAILS = 'you@example.com';

const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');
const { createSession } = require('./helpers/session');

const mockGoogle = (payload) =>
  jest
    .spyOn(OAuth2Client.prototype, 'verifyIdToken')
    .mockResolvedValue({
      getPayload: () => ({ iss: 'accounts.google.com', email_verified: true, ...payload }),
    });

describe('users module — auth', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(disconnectDb);

  it('operator whitelist flips is_operator at Google sign-in', async () => {
    const spy = mockGoogle({ sub: 'g-1', email: 'you@example.com' });
    const res = await request(app).post('/api/auth/google').send({ id_token: 'abc' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.is_operator).toBe(true);
    spy.mockRestore();
  });

  it('GET /api/me returns the signed-in user', async () => {
    const { token } = await createSession('you@example.com', { is_operator: true });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('you@example.com');
    expect(res.body.data.user.is_operator).toBe(true);
  });

  it('GET /api/me without a token is 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/me with a bad token is 401', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/me sets the phone number', async () => {
    const { token } = await createSession('chisomo@gmail.com');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '0888 123 456' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBe('0888123456');
  });

  it('PATCH /api/me accepts +265 and normalizes to national format', async () => {
    const { token } = await createSession('chisomo@gmail.com');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+265 888 123 456' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBe('0888123456');
  });

  it('PATCH /api/me rejects a non-Malawi prefix', async () => {
    const { token } = await createSession('chisomo@gmail.com');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '1777 000 000' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/me rejects a short phone number', async () => {
    const { token } = await createSession('chisomo@gmail.com');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('a token keeps working for the same user across requests', async () => {
    const { token } = await createSession('persist@gmail.com');
    const again = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(200);
  });
});
