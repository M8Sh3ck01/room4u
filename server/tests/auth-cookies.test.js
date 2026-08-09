process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');

const sessionCookie = (res) =>
  res.headers['set-cookie'].find((c) => c.startsWith('room4u_session=')).split(';')[0];

describe('session cookie auth', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(disconnectDb);

  it('sign-in sets an httpOnly session cookie', async () => {
    const res = await request(app).post('/api/auth/dev').send({ email: 'cookie@gmail.com' });
    expect(res.status).toBe(200);

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('room4u_session='));
    expect(cookie).toBeTruthy();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('GET /api/me works via the session cookie alone', async () => {
    const login = await request(app).post('/api/auth/dev').send({ email: 'cookie@gmail.com' });
    const res = await request(app).get('/api/me').set('Cookie', sessionCookie(login));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('cookie@gmail.com');
  });

  it('GET /api/me with no cookie is 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('logout clears the session cookie', async () => {
    const login = await request(app).post('/api/auth/dev').send({ email: 'cookie@gmail.com' });
    const cookie = sessionCookie(login);

    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);

    const cleared = out.headers['set-cookie'].find((c) => c.startsWith('room4u_session='));
    expect(cleared).toBeTruthy();
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});
