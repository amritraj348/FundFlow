const User = require('../src/models/User');
const NGO = require('../src/models/NGO');
const Campaign = require('../src/models/Campaign');
const { signAccessToken } = require('../src/utils/jwt');

let counter = 0;
function unique(prefix) {
  counter += 1;
  return `${prefix}${counter}`;
}

// Creates the user directly via the model + signs a real access token,
// bypassing the actual /register endpoint (and its rate limiter) — these
// are fixtures for testing *other* endpoints, not auth itself, which gets
// its own dedicated tests that do hit the real HTTP endpoints.
async function createUser(overrides = {}) {
  const user = await User.create({
    name: 'Test User',
    email: `${unique('user')}@test.local`,
    password: 'Passw0rd1',
    role: 'donor',
    ...overrides,
  });
  const accessToken = signAccessToken(user);
  return { user, accessToken };
}

async function createApprovedNgo(adminUser, overrides = {}) {
  return NGO.create({
    admin: adminUser._id,
    name: unique('Test NGO '),
    email: `${unique('ngo')}@test.local`,
    approvalStatus: 'approved',
    ...overrides,
  });
}

async function createActiveCampaign(ngo, overrides = {}) {
  const slug = unique('test-campaign-');
  return Campaign.create({
    ngo: ngo._id,
    title: slug,
    slug,
    description: 'A test campaign.',
    goalAmount: 10000,
    status: 'active',
    ...overrides,
  });
}

module.exports = { unique, createUser, createApprovedNgo, createActiveCampaign };
