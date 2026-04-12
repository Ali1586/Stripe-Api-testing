// ============================================
// STRIPE PAYMENT API TEST SUITE
// Test payment processing with Stripe
// ============================================

const request = require('supertest');
const nock = require('nock');
const app = require('../src/server');

// Mock Stripe responses
const mockChargeResponse = {
  id: 'ch_1234567890',
  object: 'charge',
  amount: 2000,
  currency: 'usd',
  status: 'succeeded',
  source: {
    id: 'card_1234567890',
    brand: 'Visa',
    last4: '4242'
  }
};

const mockRefundResponse = {
  id: 're_1234567890',
  object: 'refund',
  charge: 'ch_1234567890',
  amount: 2000,
  currency: 'usd',
  status: 'succeeded'
};

const mockDeclinedChargeError = {
  error: {
    type: 'StripeCardError',
    message: 'Your card was declined',
    code: 'card_declined'
  }
};

describe('💳 Stripe Payment API Tests', () => {

  // ============================================
  // TEST 1: HAPPY PATH - Successful payment
  // ============================================

  describe('POST /charge - Happy Path', () => {

    test('Ska processa lyckad betalning med Visa', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, mockChargeResponse);

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'USD',
          source: 'tok_visa',
          description: 'Test payment'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.charge_id).toBe('ch_1234567890');
      expect(response.body.data.amount).toBe(20);
      expect(response.body.data.status).toBe('succeeded');
    });

    test('Ska acceptera flera valutor (EUR, GBP, SEK)', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, { ...mockChargeResponse, currency: 'eur' });

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 25,
          currency: 'EUR',
          source: 'tok_visa'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.currency).toBe('eur');
    });

    test('Ska returnera kort-info (brand, last4)', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, mockChargeResponse);

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 50,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.body.data.card).toBe('Visa');
      expect(response.body.data.last4).toBe('4242');
    });
  });

  // ============================================
  // TEST 2: INPUT VALIDATION
  // ============================================

  describe('POST /charge - Input Validation', () => {

    test('Ska returnera 400 när amount saknas', async () => {
      const response = await request(app)
        .post('/charge')
        .send({
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    test('Ska returnera 400 när currency saknas', async () => {
      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          source: 'tok_visa'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('Ska returnera 400 när source saknas', async () => {
      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'USD'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('Ska returnera 400 när amount <= 0', async () => {
      const response = await request(app)
        .post('/charge')
        .send({
          amount: -10,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('greater than 0');
    });

    test('Ska returnera 400 när amount = 0', async () => {
      const response = await request(app)
        .post('/charge')
        .send({
          amount: 0,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(400);
    });

    test('Ska returnera 400 när currency är ogiltig', async () => {
      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'XXX',
          source: 'tok_visa'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('usd, eur, gbp, or sek');
    });

    test('Ska acceptera lowercase currency', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, mockChargeResponse);

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'usd',
          source: 'tok_visa'
        });

      expect(response.status).toBe(200);
    });
  });

  // ============================================
  // TEST 3: EDGE CASES - Amount variations
  // ============================================

  describe('POST /charge - Edge Cases', () => {

    test('Ska acceptera litet belopp (1 cent)', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, mockChargeResponse);

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 0.01,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(200);
    });

    test('Ska acceptera stort belopp (10000 USD)', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, { ...mockChargeResponse, amount: 1000000 });

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 10000,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(200);
    });

    test('Ska hantera decimal amounts korrekt', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, { ...mockChargeResponse, amount: 1234 });

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 12.34,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.amount).toBe(12.34);
    });
  });

  // ============================================
  // TEST 4: ERROR HANDLING - Card declines
  // ============================================

  describe('POST /charge - Card Errors', () => {

    test('Ska returnera 402 när kort declined', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(402, mockDeclinedChargeError);

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'USD',
          source: 'tok_chargeDeclined'
        });

      expect(response.status).toBe(402);
      expect(response.body.status).toBe('card_error');
      expect(response.body.error).toContain('declined');
    });

    test('Ska returnera 500 när Stripe är nere', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(500, { error: 'Internal Server Error' });

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Payment processing failed');
    });

    test('Ska returnera 500 på connection error', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .replyWithError('Connection timeout');

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(response.status).toBe(500);
    });
  });

  // ============================================
  // TEST 5: REFUND PROCESSING
  // ============================================

  describe('POST /refund - Refund Processing', () => {

    test('Ska processa full refund', async () => {
      nock('https://api.stripe.com')
        .post('/v1/refunds')
        .reply(200, mockRefundResponse);

      const response = await request(app)
        .post('/refund')
        .send({
          charge_id: 'ch_1234567890'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.refund_id).toBe('re_1234567890');
      expect(response.body.data.status).toBe('succeeded');
    });

    test('Ska processa partial refund', async () => {
      nock('https://api.stripe.com')
        .post('/v1/refunds')
        .reply(200, { ...mockRefundResponse, amount: 1000 });

      const response = await request(app)
        .post('/refund')
        .send({
          charge_id: 'ch_1234567890',
          amount: 10
        });

      expect(response.status).toBe(200);
    });

    test('Ska returnera 400 när charge_id saknas', async () => {
      const response = await request(app)
        .post('/refund')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('charge_id');
    });

    test('Ska returnera 500 när refund misslyckas', async () => {
      nock('https://api.stripe.com')
        .post('/v1/refunds')
        .reply(500, { error: 'Refund failed' });

      const response = await request(app)
        .post('/refund')
        .send({
          charge_id: 'ch_invalid'
        });

      expect(response.status).toBe(500);
    });
  });

  // ============================================
  // TEST 6: HEALTH CHECK
  // ============================================

  describe('GET /health', () => {

    test('Ska returnera status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  // ============================================
  // TEST 7: RESPONSE STRUCTURE
  // ============================================

  describe('Response Structure', () => {

    test('Charge response ska ha alla required fields', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, mockChargeResponse);

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'USD',
          source: 'tok_visa'
        });

      const { data } = response.body;
      expect(data).toHaveProperty('charge_id');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('currency');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('card');
      expect(data).toHaveProperty('last4');
    });

    test('Amount ska vara ett nummer', async () => {
      nock('https://api.stripe.com')
        .post('/v1/charges')
        .reply(200, mockChargeResponse);

      const response = await request(app)
        .post('/charge')
        .send({
          amount: 20,
          currency: 'USD',
          source: 'tok_visa'
        });

      expect(typeof response.body.data.amount).toBe('number');
    });
    test('Description ska vara optional', async () => {
  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(200, mockChargeResponse);

  const response = await request(app)
    .post('/charge')
    .send({
      amount: 20,
      currency: 'USD',
      source: 'tok_visa'
      // Notera: description saknas!
    });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe('success');
  expect(response.body.data.charge_id).toBeDefined();
});
test('Success charge ska ha 200 status', async () => {
  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(200, mockChargeResponse);

  const response = await request(app)
    .post('/charge')
    .send({
      amount: 20,
      currency: 'USD',
      source: 'tok_visa'
    });

  expect(response.status).toBe(200);
  expect(response.status).not.toBe(201);
  expect(response.status).not.toBe(404);
});

test('Declined card ska ha 402 status', async () => {
  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(402, {
      error: {
        type: 'StripeCardError',
        message: 'Your card was declined'
      }
    });

  const response = await request(app)
    .post('/charge')
    .send({
      amount: 20,
      currency: 'USD',
      source: 'tok_chargeDeclined'
    });

  expect(response.status).toBe(402);
  expect(response.status).not.toBe(200);
});

test('Bad request ska ha 400 status', async () => {
  const response = await request(app)
    .post('/charge')
    .send({
      amount: -10,
      currency: 'USD',
      source: 'tok_visa'
    });

  expect(response.status).toBe(400);
  expect(response.status).not.toBe(200);
});
test('Success charge ska ha 200 status', async () => {
  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(200, mockChargeResponse);

  const response = await request(app)
    .post('/charge')
    .send({
      amount: 20,
      currency: 'USD',
      source: 'tok_visa'
    });

  expect(response.status).toBe(200);
  expect(response.status).not.toBe(201);
  expect(response.status).not.toBe(404);
});

test('Declined card ska ha 402 status', async () => {
  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(402, {
      error: {
        type: 'StripeCardError',
        message: 'Your card was declined'
      }
    });

  const response = await request(app)
    .post('/charge')
    .send({
      amount: 20,
      currency: 'USD',
      source: 'tok_chargeDeclined'
    });

  expect(response.status).toBe(402);
  expect(response.status).not.toBe(200);
});

test('Bad request ska ha 400 status', async () => {
  const response = await request(app)
    .post('/charge')
    .send({
      amount: -10,
      currency: 'USD',
      source: 'tok_visa'
    });

  expect(response.status).toBe(400);
  expect(response.status).not.toBe(200);
});
  });
});