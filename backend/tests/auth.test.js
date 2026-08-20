const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('POST /api/auth/register', () => {
  it('registers a donor and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dana Donor',
      email: 'dana@test.local',
      password: 'Passw0rd1',
      role: 'donor',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('dana@test.local');
    expect(res.body.user.role).toBe('donor');
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });

  it('registers an ngo_admin', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Nadia NgoAdmin',
      email: 'nadia@test.local',
      password: 'Passw0rd1',
      role: 'ngo_admin',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('ngo_admin');
  });

  // Security-critical: public registration must never be able to mint a
  // super_admin account, regardless of what role the client asks for. This
  // is defended in two independent layers — worth testing both, since a
  // change to either one shouldn't silently remove the other's coverage.
  it('rejects a requested super_admin role at the validator (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sneaky',
      email: 'sneaky@test.local',
      password: 'Passw0rd1',
      role: 'super_admin',
    });

    expect(res.status).toBe(400);
    const stored = await User.findOne({ email: 'sneaky@test.local' });
    expect(stored).toBeNull();
  });

  it("downgrades any role the validator lets through but isn't self-registerable, to donor", async () => {
    // The validator's own allow-list happens to equal SELF_REGISTERABLE_ROLES
    // today, so this exercises the controller's redundant check directly
    // rather than relying on that coincidence — it calls the register logic
    // with a role no validator update should be able to smuggle past.
    const { register } = require('../src/controllers/authController');
    const req = { body: { name: 'Direct', email: 'direct@test.local', password: 'Passw0rd1', role: 'super_admin' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await register(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    const stored = await User.findOne({ email: 'direct@test.local' });
    expect(stored.role).toBe('donor');
  });

  it('rejects a duplicate email with 409', async () => {
    await User.create({ name: 'Existing', email: 'dup@test.local', password: 'Passw0rd1' });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup Attempt',
      email: 'dup@test.local',
      password: 'Passw0rd1',
    });

    expect(res.status).toBe(409);
  });

  it('rejects an invalid email format with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'Passw0rd1',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a password without a digit with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak Password',
      email: 'weak@test.local',
      password: 'onlyletters',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await User.create({ name: 'Loginable', email: 'login@test.local', password: 'Passw0rd1', role: 'donor' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.local', password: 'Passw0rd1' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects the wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.local', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('rejects a nonexistent email with 401 and the same message as a wrong password', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.local', password: 'WrongPass1' });
    const noSuchUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.local', password: 'WrongPass1' });

    expect(noSuchUser.status).toBe(401);
    // Same message for "wrong password" and "no such user" — prevents using
    // the login endpoint to enumerate which emails have accounts.
    expect(noSuchUser.body.message).toBe(wrongPassword.body.message);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token for a valid refresh token', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Refresher', email: 'refresher@test.local', password: 'Passw0rd1' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'refresher@test.local', password: 'Passw0rd1' });

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects a malformed refresh token with 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('rejects a missing refresh token with 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid access token', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Whoami', email: 'whoami@test.local', password: 'Passw0rd1' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${register.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('whoami@test.local');
  });
});
