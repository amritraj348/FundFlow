const request = require('supertest');
const app = require('../src/app');
const { createUser, createApprovedNgo, createActiveCampaign } = require('./helpers');

describe('role-based access control', () => {
  it('blocks a donor from creating an NGO profile (403)', async () => {
    const { accessToken } = await createUser({ role: 'donor' });
    const res = await request(app)
      .post('/api/ngos')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Should Fail', email: 'fail@test.local' });
    expect(res.status).toBe(403);
  });

  it('blocks an unauthenticated request from creating an NGO profile (401)', async () => {
    const res = await request(app).post('/api/ngos').send({ name: 'No Auth', email: 'noauth@test.local' });
    expect(res.status).toBe(401);
  });

  it('blocks a donor from creating a campaign (403)', async () => {
    const { accessToken } = await createUser({ role: 'donor' });
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('title', 'Should Fail')
      .field('description', 'x')
      .field('goalAmount', '1000');
    expect(res.status).toBe(403);
  });

  it('blocks an ngo_admin from accessing platform analytics (403)', async () => {
    const { user, accessToken } = await createUser({ role: 'ngo_admin' });
    await createApprovedNgo(user);
    const res = await request(app).get('/api/analytics/platform').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks a donor from accessing NGO analytics (403)', async () => {
    const { accessToken } = await createUser({ role: 'donor' });
    const res = await request(app).get('/api/analytics/ngo').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks a non-super_admin from approving an NGO (403)', async () => {
    const { user: adminUser, accessToken } = await createUser({ role: 'ngo_admin' });
    const ngo = await createApprovedNgo(adminUser);
    const res = await request(app)
      .patch(`/api/ngos/${ngo._id}/approval`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ approvalStatus: 'approved' });
    expect(res.status).toBe(403);
  });

  it('lets a super_admin approve an NGO', async () => {
    const { user: adminUser } = await createUser({ role: 'ngo_admin' });
    const ngo = await createApprovedNgo(adminUser, { approvalStatus: 'pending' });
    const { accessToken: superToken } = await createUser({ role: 'super_admin' });

    const res = await request(app)
      .patch(`/api/ngos/${ngo._id}/approval`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ approvalStatus: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.ngo.approvalStatus).toBe('approved');
  });

  it('requires a reason when rejecting an NGO (400 without one)', async () => {
    const { user: adminUser } = await createUser({ role: 'ngo_admin' });
    const ngo = await createApprovedNgo(adminUser, { approvalStatus: 'pending' });
    const { accessToken: superToken } = await createUser({ role: 'super_admin' });

    const res = await request(app)
      .patch(`/api/ngos/${ngo._id}/approval`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ approvalStatus: 'rejected' });
    expect(res.status).toBe(400);
  });
});

describe('cross-tenant ownership checks', () => {
  it("blocks ngo_admin B from editing ngo_admin A's campaign (403)", async () => {
    const { user: userA } = await createUser({ role: 'ngo_admin' });
    const ngoA = await createApprovedNgo(userA);
    const campaign = await createActiveCampaign(ngoA);

    const { accessToken: tokenB } = await createUser({ role: 'ngo_admin' });

    const res = await request(app)
      .put(`/api/campaigns/${campaign._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .field('title', 'Hijacked');
    expect(res.status).toBe(403);
  });

  it("blocks ngo_admin B from closing ngo_admin A's campaign (403)", async () => {
    const { user: userA } = await createUser({ role: 'ngo_admin' });
    const ngoA = await createApprovedNgo(userA);
    const campaign = await createActiveCampaign(ngoA);

    const { accessToken: tokenB } = await createUser({ role: 'ngo_admin' });

    const res = await request(app)
      .patch(`/api/campaigns/${campaign._id}/close`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it("blocks ngo_admin B from updating NGO A's profile (403)", async () => {
    const { user: userA } = await createUser({ role: 'ngo_admin' });
    const ngoA = await createApprovedNgo(userA);
    const { accessToken: tokenB } = await createUser({ role: 'ngo_admin' });

    const res = await request(app)
      .put(`/api/ngos/${ngoA._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijacked NGO' });
    expect(res.status).toBe(403);
  });

  it('lets the owning ngo_admin edit their own campaign', async () => {
    const { user: userA, accessToken: tokenA } = await createUser({ role: 'ngo_admin' });
    const ngoA = await createApprovedNgo(userA);
    const campaign = await createActiveCampaign(ngoA);

    const res = await request(app)
      .put(`/api/campaigns/${campaign._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'Updated Title');
    expect(res.status).toBe(200);
    expect(res.body.campaign.title).toBe('Updated Title');
  });

  it('lets super_admin edit any campaign regardless of ownership', async () => {
    const { user: userA } = await createUser({ role: 'ngo_admin' });
    const ngoA = await createApprovedNgo(userA);
    const campaign = await createActiveCampaign(ngoA);
    const { accessToken: superToken } = await createUser({ role: 'super_admin' });

    const res = await request(app)
      .patch(`/api/campaigns/${campaign._id}/close`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.campaign.status).toBe('closed');
  });
});
