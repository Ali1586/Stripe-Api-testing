const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_fake_key_for_testing');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// ============================================
// POST /charge - Process a payment
// ============================================

/**
 * Process a payment charge
 * Body: { amount, currency, source, description }
 */
app.post('/charge', async (req, res) => {
  try {
    const { amount, currency, source, description } = req.body;

    // Validation
    if (!amount || !currency || !source) {
      return res.status(400).json({
        error: 'Missing required fields: amount, currency, source',
        status: 'error'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0',
        status: 'error'
      });
    }

    if (!['usd', 'eur', 'gbp', 'sek'].includes(currency.toLowerCase())) {
      return res.status(400).json({
        error: 'Currency must be usd, eur, gbp, or sek',
        status: 'error'
      });
    }

    // Create charge with Stripe
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      source: source,
      description: description || 'Charge from API'
    });

    res.status(200).json({
      status: 'success',
      data: {
        charge_id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency,
        status: charge.status,
        card: charge.source.brand,
        last4: charge.source.last4
      }
    });
  } catch (error) {
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(402).json({
        error: error.message || 'Your card was declined',
        code: error.code,
        status: 'card_error'
      });
    }

    res.status(500).json({
      error: 'Payment processing failed',
      message: error.message,
      status: 'error'
    });
  }
});

// ============================================
// POST /refund - Refund a charge
// ============================================

/**
 * Refund a previous charge
 * Body: { charge_id, amount (optional) }
 */
app.post('/refund', async (req, res) => {
  try {
    const { charge_id, amount } = req.body;

    if (!charge_id) {
      return res.status(400).json({
        error: 'Missing charge_id',
        status: 'error'
      });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      charge: charge_id,
      amount: amount ? Math.round(amount * 100) : undefined
    });

    res.status(200).json({
      status: 'success',
      data: {
        refund_id: refund.id,
        charge_id: refund.charge,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Refund processing failed',
      message: error.message,
      status: 'error'
    });
  }
});

// ============================================
// GET /health - Health check
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Only start if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`💳 Stripe Payment API running on http://localhost:${PORT}`);
  });
}

module.exports = app;