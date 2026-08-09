process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';

const { OAuth2Client } = require('google-auth-library');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');
const User = require('../src/modules/users/user.model');

const mockGoogle = (payload) =>
  jest
    .spyOn(OAuth2Client.prototype, 'verifyIdToken')
    .mockResolvedValue({
      getPayload: () => ({ iss: 'accounts.google.com', email_verified: true, ...payload }),
    });

describe('Google sign-in', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    return disconnectDb();
  });

  it('creates a new user on first Google sign-in', async () => {
    const spy = mockGoogle({ sub: 'g-1', email: 'new@example.com', name: 'New User' });
    const res = await request(app).post('/api/auth/google').send({ id_token: 'abc' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('new@example.com');
    expect(res.body.data.user.name).toBe('New User');

    const user = await User.findOne({ email: 'new@example.com' });
    expect(user.google_sub).toBe('g-1');
    spy.mockRestore();
  });

  it('adopts the Google identity onto an existing dev account with the same email', async () => {
    await User.create({
      google_sub: 'dev:you@example.com',
      email: 'you@example.com',
      name: 'Old Dev',
      phone: '0888123456',
    });
    const spy = mockGoogle({
      sub: 'g-2',
      email: 'you@example.com',
      name: 'Real Google',
      picture: 'https://pic/1',
    });

    const res = await request(app).post('/api/auth/google').send({ id_token: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Real Google');
    expect(res.body.data.user.phone).toBe('0888123456');

    const users = await User.find({ email: 'you@example.com' });
    expect(users).toHaveLength(1);
    expect(users[0].google_sub).toBe('g-2');
    expect(users[0].avatar_url).toBe('https://pic/1');
    spy.mockRestore();
  });

  it('rejects when Google rejects the token', async () => {
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(new Error('bad token'));

    const res = await request(app).post('/api/auth/google').send({ id_token: 'bad' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });
});
