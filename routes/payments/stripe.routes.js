const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Initialize Stripe here
const stripeService = require('../../services/stripe.service');
const { isUserLoggedIn } = require('../../middleware/middlewares');
const bodyParser = require('body-parser');

// Create Stripe connected account and get onboarding link
router.post('/create-account', isUserLoggedIn, async (req, res) => {
  try {
    const onboardingUrl = await stripeService.createConnectedAccountAndOnboardingLink(req.user);
    
    res.status(200).json({
      status: true,
      message: 'Stripe account created successfully',
      data: { onboardingUrl }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'An error occurred while creating Stripe account'
    });
  }
});

router.get('/update-account-link', isUserLoggedIn, async (req, res) => {
  try {
    const result = await stripeService.updateOnboardingLink(req.user._id);
    
    res.status(200).json({
      status: true,
      message: 'Onboarding link updated successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'An error occurred while updating onboarding link'
    });
  }
});

// Create payment intent
router.post('/create-payment-intent', isUserLoggedIn, async (req, res) => {
  try {
    const { price, description, planValidity } = req.body;

    if (!price) {
      return res.status(400).json({
        status: false,
        message: 'Price is required'
      });
    }

    const paymentDetails = { price, description, planValidity };
    const result = await stripeService.createPaymentIntent(req.user._id, paymentDetails);

    res.status(200).json({
      status: true,
      message: 'Payment intent created successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'An error occurred while creating payment intent'
    });
  }
});

// Get payment status
router.get('/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        status: false,
        message: 'Payment intent ID is required'
      });
    }
    
    const result = await stripeService.retrievePaymentStatus(paymentIntentId);
    
    res.status(200).json({
      status: true,
      message: 'Payment status retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'An error occurred while retrieving payment status'
    });
  }
});

// Create checkout session
router.post('/create-checkout-session', isUserLoggedIn, async (req, res) => {
  try {
    const { price, description, planValidity, planType, successUrl, cancelUrl } = req.body;
    
    if (!price) {
      return res.status(400).json({
        status: false,
        message: 'Price is required'
      });
    }
    
    const paymentDetails = { price, description, planValidity, planType, successUrl, cancelUrl };
    const result = await stripeService.createCheckoutSession(req.user._id, paymentDetails);
    
    res.status(200).json({
      status: true,
      message: 'Checkout session created successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'An error occurred while creating checkout session'
    });
  }
});

// Create checkout session for mock test packages
router.post('/create-mocktest-checkout-session', isUserLoggedIn, async (req, res) => {
  try {
    const { price, description, mockTestCount, successUrl, cancelUrl } = req.body;

    if (!price) {
      return res.status(400).json({
        status: false,
        message: 'Price is required'
      });
    }

    if (!mockTestCount) {
      return res.status(400).json({
        status: false,
        message: 'mockTestCount is required'
      });
    }

    const paymentDetails = { price, description, mockTestCount, successUrl, cancelUrl };
    const result = await stripeService.createMockTestCheckoutSession(req.user._id, paymentDetails);

    res.status(200).json({
      status: true,
      message: 'Checkout session created successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'An error occurred while creating checkout session'
    });
  }
});

// Create checkout session for coaching plans
router.post('/create-coaching-checkout-session', isUserLoggedIn, async (req, res) => {
  try {
    const { price, description, coachingPlanType, successUrl, cancelUrl } = req.body;

    if (!price) {
      return res.status(400).json({
        status: false,
        message: 'Price is required'
      });
    }

    if (!coachingPlanType) {
      return res.status(400).json({
        status: false,
        message: 'coachingPlanType is required'
      });
    }

    const paymentDetails = { price, description, coachingPlanType, successUrl, cancelUrl };
    const result = await stripeService.createCoachingCheckoutSession(req.user._id, paymentDetails);

    res.status(200).json({
      status: true,
      message: 'Checkout session created successfully',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'An error occurred while creating checkout session'
    });
  }
});

// Handle Stripe webhooks
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!endpointSecret) {
            console.error('Stripe webhook secret (STRIPE_WEBHOOK_SECRET) not configured in environment variables.');
            return res.status(500).json({ error: 'Server configuration error: Webhook secret missing.' });
        }

        let event;

        // Verify webhook signature
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: Signature verification failed - ${err.message}`);
        }

        // Process the webhook event
        try {
            const result = await stripeService.handleWebhook(event);
            console.log(`✅ Handled ${event.type} webhook successfully.`);
            return res.json(result); 
        } catch (error) {
            console.error(`❌ Webhook handler error (${event.type}):`, error);
            return res.status(200).json({
                status: false,
                message: error.message || 'Webhook processing failed internally',
                event_type: event.type
            });
        }
    }
);

module.exports = router;
