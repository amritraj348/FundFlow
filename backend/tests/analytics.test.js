const crypto = require('crypto');
const request = require('supertest');

jest.mock('../src/config/razorpay', () => ({
  orders: {
    create: jest.fn().mockImplementation((opts) =>
      Promise.resolve({
        id: `order_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        amount: opts.amount,
        currency: opts.currency,
      })
    ),
  },
}));
jest.mock('../src/utils/donationNotifications', () => ({
  sendDonationNotifications: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../src/app');
const { createUser, createApprovedNgo, createActiveCampaign } = require('./helpers');

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function signPayment(orderId, paymentId) {
  return crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

// Drives a full real donation through create-order -> verify-payment so the
// resulting Donation record is exactly what production code would create,
// rather than inserting a pre-baked fixture that might drift from reality.
async function makeSuccessfulDonation(campaign, donorToken, amount) {
  const orderRes = await request(app)
    .post('/api/donations/create-order')
    .set('Authorization', `Bearer ${donorToken}`)
    .send({ campaignId: campaign._id.toString(), amount });
  const paymentId = `pay_${Math.random().toString(36).slice(2)}`;
  await request(app).post('/api/donations/verify-payment').send({
    razorpay_order_id: orderRes.body.orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signPayment(orderRes.body.orderId, paymentId),
  });
}

describe('GET /api/analytics/ngo', () => {
  it('requires an ngo_admin who actually has an NGO profile (400 without one)', async () => {
    const { accessToken } = await createUser({ role: 'ngo_admin' });
    const res = await request(app).get('/api/analytics/ngo').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  // The core scoping guarantee: NGO A's admin must never see NGO B's numbers.
  it("only reflects the requesting ngo_admin's own NGO, never another NGO's data", async () => {
    const { user: userA, accessToken: tokenA } = await createUser({ role: 'ngo_admin' });
    const ngoA = await createApprovedNgo(userA);
    const campaignA = await createActiveCampaign(ngoA);

    const { user: userB, accessToken: tokenB } = await createUser({ role: 'ngo_admin' });
    const ngoB = await createApprovedNgo(userB);
    const campaignB = await createActiveCampaign(ngoB);

    const { accessToken: donorToken } = await createUser({ role: 'donor' });
    await makeSuccessfulDonation(campaignA, donorToken, 500);
    await makeSuccessfulDonation(campaignA, donorToken, 300);
    await makeSuccessfulDonation(campaignB, donorToken, 9999);

    const resA = await request(app).get('/api/analytics/ngo').set('Authorization', `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.allTime.totalRaised).toBe(800);
    expect(resA.body.allTime.totalDonations).toBe(2);
    expect(resA.body.topCampaigns.every((c) => c.campaignId === campaignA._id.toString())).toBe(true);

    const resB = await request(app).get('/api/analytics/ngo').set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.allTime.totalRaised).toBe(9999);
    expect(resB.body.allTime.totalDonations).toBe(1);
  });
});

describe('GET /api/analytics/platform', () => {
  it('aggregates totals across every NGO', async () => {
    const { user: userA } = await createUser({ role: 'ngo_admin' });
    const ngoA = await createApprovedNgo(userA);
    const campaignA = await createActiveCampaign(ngoA);

    const { user: userB } = await createUser({ role: 'ngo_admin' });
    const ngoB = await createApprovedNgo(userB);
    const campaignB = await createActiveCampaign(ngoB);

    const { accessToken: donorToken } = await createUser({ role: 'donor' });
    await makeSuccessfulDonation(campaignA, donorToken, 500);
    await makeSuccessfulDonation(campaignB, donorToken, 700);

    const { accessToken: superToken } = await createUser({ role: 'super_admin' });
    const res = await request(app).get('/api/analytics/platform').set('Authorization', `Bearer ${superToken}`);

    expect(res.status).toBe(200);
    expect(res.body.allTime.totalRaised).toBe(1200);
    expect(res.body.allTime.totalDonations).toBe(2);
    expect(res.body.platform.totalActiveCampaigns).toBe(2);
    const names = res.body.topNgos.map((n) => n.name).sort();
    expect(names).toEqual([ngoA.name, ngoB.name].sort());
  });

  it('narrows the "selected range" figures with ?from=&to= while leaving all-time untouched', async () => {
    const { user } = await createUser({ role: 'ngo_admin' });
    const ngo = await createApprovedNgo(user);
    const campaign = await createActiveCampaign(ngo);
    const { accessToken: donorToken } = await createUser({ role: 'donor' });
    await makeSuccessfulDonation(campaign, donorToken, 500);

    const { accessToken: superToken } = await createUser({ role: 'super_admin' });

    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const evenFurther = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const res = await request(app)
      .get('/api/analytics/platform')
      .query({ from: farFuture, to: evenFurther })
      .set('Authorization', `Bearer ${superToken}`);

    expect(res.status).toBe(200);
    expect(res.body.allTime.totalRaised).toBe(500);
    expect(res.body.summary.totalRaised).toBe(0);
  });
});
