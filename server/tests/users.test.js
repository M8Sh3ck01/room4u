process.env.NODE_ENV = 'test';
process.env.OPERATOR_EMAILS = 'you@example.com';

const request = require('supertest');
const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');

describe('users module — auth', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(disconnectDb);

  it('dev login creates a user and returns a session token', async () => {
    const res = await request(app)
      .post('/api/auth/dev')
      .send({ email: 'chisomo@gmail.com', name: 'Chisomo Banda' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('chisomo@gmail.com');
    expect(res.body.data.user.name).toBe('Chisomo Banda');
    expect(res.body.data.user.phone).toBeNull();
    expect(res.body.data.user.is_operator).toBe(false);
  });

  it('dev login without a valid email is rejected', async () => {
    const res = await request(app).post('/api/auth/dev').send({ email: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('operator whitelist flips is_operator at sign-in', async () => {
    const res = await request(app).post('/api/auth/dev').send({ email: 'you@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.is_operator).toBe(true);
  });

  it('GET /api/me returns the signed-in user', async () => {
    const login = await request(app).post('/api/auth/dev').send({ email: 'you@example.com' });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);

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
    const login = await request(app).post('/api/auth/dev').send({ email: 'chisomo@gmail.com' });
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ phone: '0888 123 456' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBe('0888123456');
  });

  it('PATCH /api/me accepts +265 and normalizes to national format', async () => {
    const login = await request(app).post('/api/auth/dev').send({ email: 'chisomo@gmail.com' });
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ phone: '+265 888 123 456' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBe('0888123456');
  });

  it('PATCH /api/me rejects a non-Malawi prefix', async () => {
    const login = await request(app).post('/api/auth/dev').send({ email: 'chisomo@gmail.com' });
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ phone: '1777 000 000' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/me rejects a short phone number', async () => {
    const login = await request(app).post('/api/auth/dev').send({ email: 'chisomo@gmail.com' });
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ phone: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('session persists across reloads (same dev user logs in again)', async () => {
    await request(app).post('/api/auth/dev').send({ email: 'persist@gmail.com', name: 'First' });
    const second = await request(app)
      .post('/api/auth/dev')
      .send({ email: 'persist@gmail.com', name: 'Second' });

    expect(second.body.data.user.name).toBe('Second');
    const again = await request(app).get('/api/me').set('Authorization', `Bearer ${second.body.data.token}`);
    expect(again.status).toBe(200);
  });
});
