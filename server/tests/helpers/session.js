const User = require('../../src/modules/users/user.model');
const { issueSessionToken } = require('../../src/modules/users/auth.service');

async function createSession(email, overrides = {}) {
  let user = await User.findOne({ google_sub: `test-${email}` });
  if (!user) {
    user = await User.create({
      google_sub: `test-${email}`,
      email,
      name: 'Test User',
      ...overrides,
    });
  }
  return { token: issueSessionToken(user), user };
}

module.exports = { createSession };
