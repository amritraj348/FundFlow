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
const Donation = require('../src/models/Donation');
const Campaign = require('../src/models/Campaign');
const { createUser, createApprovedNgo, createActiveCampaign } = require('./helpers');

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

function signPayment(orderId, paymentId) {
  return crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

function webhookPayload(event, orderId, paymentId) {
  return JSON.stringify({
    entity: 'event',
    event,
    contains: ['payment'],
    payload: {
      payment: {
        entity: { id: paymentId, entity: 'payment', order_id: orderId, status: event === 'payment.captured' ? 'captured' : 'failed' },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  });
}

function signWebhook(rawBody) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
}

async function setupCampaign() {
  const { user } = await createUser({ role: 'ngo_admin' });
  const ngo = await createApprovedNgo(user);
  const campaign = await createActiveCampaign(ngo, { goalAmount: 100000 });
  return { ngo, campaign };
}

describe('POST /api/donations/create-order', () => {
  it('rejects a campaign that is not active (400)', async () => {
    const { user } = await createUser({ role: 'ngo_admin' });
    const ngo = await createApprovedNgo(user);
    const draftCampaign = await createActiveCampaign(ngo, { status: 'draft' });
    const { accessToken } = await createUser({ role: 'donor' });

    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: draftCampaign._id.toString(), amount: 500 });
    expect(res.status).toBe(400);
  });

  it('requires guestInfo for an unauthenticated donor (400 without it)', async () => {
    const { campaign } = await setupCampaign();
    const res = await request(app)
      .post('/api/donations/create-order')
      .send({ campaignId: campaign._id.toString(), amount: 500 });
    expect(res.status).toBe(400);
  });

  it('succeeds for an authenticated donor', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });

    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.orderId).toEqual(expect.any(String));
    expect(res.body.donationId).toEqual(expect.any(String));

    const donation = await Donation.findById(res.body.donationId);
    expect(donation.status).toBe('pending');
    expect(donation.amount).toBe(500);
  });

  it('succeeds for a guest with valid guestInfo', async () => {
    const { campaign } = await setupCampaign();
    const res = await request(app)
      .post('/api/donations/create-order')
      .send({
        campaignId: campaign._id.toString(),
        amount: 250,
        guestInfo: { name: 'Guest Giver', email: 'guest@test.local' },
      });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/donations/verify-payment', () => {
  async function createOrderFor(campaign, accessToken) {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 500 });
    return res.body;
  }

  it('marks the donation successful and increments campaign totals on a valid signature', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const order = await createOrderFor(campaign, accessToken);
    const paymentId = 'pay_test_1';
    const signature = signPayment(order.orderId, paymentId);

    const res = await request(app).post('/api/donations/verify-payment').send({
      razorpay_order_id: order.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    expect(res.status).toBe(200);
    expect(res.body.donation.status).toBe('success');
    expect(res.body.alreadyProcessed).toBe(false);
    // razorpaySignature is stripped from client-facing responses.
    expect(res.body.donation.razorpaySignature).toBeUndefined();

    const updatedCampaign = await Campaign.findById(campaign._id);
    expect(updatedCampaign.raisedAmount).toBe(500);
    expect(updatedCampaign.donorCount).toBe(1);
  });

  it('marks the donation failed on an invalid signature and never touches campaign totals', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const order = await createOrderFor(campaign, accessToken);

    const res = await request(app).post('/api/donations/verify-payment').send({
      razorpay_order_id: order.orderId,
      razorpay_payment_id: 'pay_test_bad',
      razorpay_signature: 'deadbeef'.repeat(8),
    });

    expect(res.status).toBe(400);
    const donation = await Donation.findById(order.donationId);
    expect(donation.status).toBe('failed');

    const updatedCampaign = await Campaign.findById(campaign._id);
    expect(updatedCampaign.raisedAmount).toBe(0);
    expect(updatedCampaign.donorCount).toBe(0);
  });

  // The core guarantee: calling verify-payment twice for the same payment
  // must only ever count once, no matter how many times a client retries.
  it('does not double-count when verify-payment is called twice with the same valid signature', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const order = await createOrderFor(campaign, accessToken);
    const paymentId = 'pay_test_double';
    const signature = signPayment(order.orderId, paymentId);
    const body = { razorpay_order_id: order.orderId, razorpay_payment_id: paymentId, razorpay_signature: signature };

    const first = await request(app).post('/api/donations/verify-payment').send(body);
    const second = await request(app).post('/api/donations/verify-payment').send(body);

    expect(first.status).toBe(200);
    expect(first.body.alreadyProcessed).toBe(false);
    expect(second.status).toBe(200);
    expect(second.body.alreadyProcessed).toBe(true);

    const updatedCampaign = await Campaign.findById(campaign._id);
    expect(updatedCampaign.raisedAmount).toBe(500);
    expect(updatedCampaign.donorCount).toBe(1);
  });

  it('returns 404 for an order that has no matching donation', async () => {
    const res = await request(app).post('/api/donations/verify-payment').send({
      razorpay_order_id: 'order_does_not_exist',
      razorpay_payment_id: 'pay_x',
      razorpay_signature: 'a'.repeat(64),
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/donations/webhook', () => {
  it('rejects an invalid signature (400)', async () => {
    const body = webhookPayload('payment.captured', 'order_x', 'pay_x');
    const res = await request(app)
      .post('/api/donations/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'not-the-right-signature')
      .send(body);
    expect(res.status).toBe(400);
  });

  it('acknowledges (200) an unknown order without erroring', async () => {
    const body = webhookPayload('payment.captured', 'order_unknown_xyz', 'pay_x');
    const res = await request(app)
      .post('/api/donations/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signWebhook(body))
      .send(body);
    expect(res.status).toBe(200);
  });

  it('marks the donation successful on payment.captured and increments totals once', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 750 });

    const body = webhookPayload('payment.captured', orderRes.body.orderId, 'pay_webhook_1');
    const res = await request(app)
      .post('/api/donations/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signWebhook(body))
      .send(body);

    expect(res.status).toBe(200);
    const donation = await Donation.findById(orderRes.body.donationId);
    expect(donation.status).toBe('success');

    const updatedCampaign = await Campaign.findById(campaign._id);
    expect(updatedCampaign.raisedAmount).toBe(750);
    expect(updatedCampaign.donorCount).toBe(1);
  });

  it('does not double-count when the same webhook event is replayed', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 400 });

    const body = webhookPayload('payment.captured', orderRes.body.orderId, 'pay_webhook_replay');
    const signature = signWebhook(body);

    await request(app).post('/api/donations/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', signature).send(body);
    await request(app).post('/api/donations/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', signature).send(body);

    const updatedCampaign = await Campaign.findById(campaign._id);
    expect(updatedCampaign.raisedAmount).toBe(400);
    expect(updatedCampaign.donorCount).toBe(1);
  });

  // Cross-endpoint idempotency: verify-payment and the webhook must be safe
  // to call in either order, or both, without ever double-counting.
  it('does not double-count when the webhook arrives after verify-payment already succeeded', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 600 });

    const paymentId = 'pay_cross_1';
    await request(app).post('/api/donations/verify-payment').send({
      razorpay_order_id: orderRes.body.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signPayment(orderRes.body.orderId, paymentId),
    });

    const body = webhookPayload('payment.captured', orderRes.body.orderId, paymentId);
    await request(app)
      .post('/api/donations/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signWebhook(body))
      .send(body);

    const updatedCampaign = await Campaign.findById(campaign._id);
    expect(updatedCampaign.raisedAmount).toBe(600);
    expect(updatedCampaign.donorCount).toBe(1);
  });

  it('does not double-count when verify-payment arrives after the webhook already succeeded', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 900 });

    const paymentId = 'pay_cross_2';
    const body = webhookPayload('payment.captured', orderRes.body.orderId, paymentId);
    await request(app)
      .post('/api/donations/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signWebhook(body))
      .send(body);

    const verifyRes = await request(app).post('/api/donations/verify-payment').send({
      razorpay_order_id: orderRes.body.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signPayment(orderRes.body.orderId, paymentId),
    });

    expect(verifyRes.body.alreadyProcessed).toBe(true);
    const updatedCampaign = await Campaign.findById(campaign._id);
    expect(updatedCampaign.raisedAmount).toBe(900);
    expect(updatedCampaign.donorCount).toBe(1);
  });

  it('marks a pending donation failed on payment.failed', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 300 });

    const body = webhookPayload('payment.failed', orderRes.body.orderId, 'pay_failed_1');
    await request(app)
      .post('/api/donations/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signWebhook(body))
      .send(body);

    const donation = await Donation.findById(orderRes.body.donationId);
    expect(donation.status).toBe('failed');
  });

  it('never overwrites an already-successful donation with payment.failed', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 300 });

    const paymentId = 'pay_success_then_fail';
    await request(app).post('/api/donations/verify-payment').send({
      razorpay_order_id: orderRes.body.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signPayment(orderRes.body.orderId, paymentId),
    });

    const failedBody = webhookPayload('payment.failed', orderRes.body.orderId, paymentId);
    await request(app)
      .post('/api/donations/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signWebhook(failedBody))
      .send(failedBody);

    const donation = await Donation.findById(orderRes.body.donationId);
    expect(donation.status).toBe('success');
  });
});

describe('GET /api/donations/:id/receipt', () => {
  async function createSuccessfulDonation() {
    const { campaign } = await setupCampaign();
    const { user: donor, accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 500 });

    const paymentId = 'pay_receipt_test';
    await request(app).post('/api/donations/verify-payment').send({
      razorpay_order_id: orderRes.body.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signPayment(orderRes.body.orderId, paymentId),
    });

    return { donationId: orderRes.body.donationId, donor, donorToken: accessToken };
  }

  it('rejects an unauthenticated request (401)', async () => {
    const { donationId } = await createSuccessfulDonation();
    const res = await request(app).get(`/api/donations/${donationId}/receipt`);
    expect(res.status).toBe(401);
  });

  it("rejects a different donor's request (403)", async () => {
    const { donationId } = await createSuccessfulDonation();
    const { accessToken: otherToken } = await createUser({ role: 'donor' });
    const res = await request(app).get(`/api/donations/${donationId}/receipt`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('lets the owning donor download the receipt', async () => {
    const { donationId, donorToken } = await createSuccessfulDonation();
    const res = await request(app).get(`/api/donations/${donationId}/receipt`).set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('lets super_admin download any donation receipt', async () => {
    const { donationId } = await createSuccessfulDonation();
    const { accessToken: superToken } = await createUser({ role: 'super_admin' });
    const res = await request(app).get(`/api/donations/${donationId}/receipt`).set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
  });

  it('refuses a receipt for a donation that is not yet successful (400)', async () => {
    const { campaign } = await setupCampaign();
    const { accessToken } = await createUser({ role: 'donor' });
    const orderRes = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ campaignId: campaign._id.toString(), amount: 500 });

    const res = await request(app)
      .get(`/api/donations/${orderRes.body.donationId}/receipt`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });
});
