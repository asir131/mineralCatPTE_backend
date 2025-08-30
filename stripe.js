// stripeService.js

const Stripe = require('stripe');
const mongoose = require('mongoose');
const httpStatus = require('http-status');

// Import models (adjust paths as needed)

const StripePaymentGateway = require('./models/payment.model');
// const DriverVerification = require('../models/driverVerification.model');
const userModels = require('./models/user.models');

// Config setup
const config = {
  stripe_payment_gateway: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    onboarding_refresh_url: process.env.ONBOARDING_REFRESH_URL || '<http://localhost:8080/refresh>',
    onboarding_return_url: process.env.ONBOARDING_RETURN_URL || '<http://localhost:8080/return>',
    checkout_success_url: process.env.CHECKOUT_SUCCESS_URL || '<http://localhost:8080/success>',
    checkout_cancel_url: process.env.CHECKOUT_CANCEL_URL || '<http://localhost:8080/cancel>'
  }
};

// Create Stripe instance
const stripe = new Stripe(config.stripe_payment_gateway.stripe_secret_key);

// Error handling class
class ApiError extends Error {
  constructor(statusCode, message, stack = '') {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Constants
const USER_ACCESSIBILITY = {
  isProgress: 'progress'
};

/**
 * Create a connected account and onboarding link
 */
const createConnectedAccountAndOnboardingLink = async (userData) => {
  try {
    console.log('userData:', userData);
    const normalUser = await userModels.findOne({
      _id: userData.id,
      isDelete: false,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress
    }).select('_id stripeAccountId email');

    if (!normalUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'This user is restricted due to some issues');
    }

    if (normalUser.stripeAccountId) {
      const onboardingLink = await stripe.accountLinks.create({
        account: normalUser.stripeAccountId,
        refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${normalUser.stripeAccountId}`,
        return_url: config.stripe_payment_gateway.onboarding_refresh_url,
        type: 'account_onboarding',
      });
      return onboardingLink.url;
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: normalUser.email,
      country: 'US',
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      settings: {
        payouts: {
          schedule: { interval: 'manual' },
        },
      },
    });

    await userModels.findByIdAndUpdate(normalUser._id, { stripeAccountId: account.id });

    const onboardingLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${account.id}`,
      return_url: config.stripe_payment_gateway.onboarding_return_url,
      type: 'account_onboarding',
    });

    return onboardingLink.url;
  } catch (error) {
    console.log(error);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to create connected account and onboarding link');
  }
};

/**
 * Update onboarding link for a user
 */
const updateOnboardingLink = async (userId) => {
  try {
    const normalUser = await userModels.findOne({
      _id: userId,
      isDelete: false,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress
    }).select('_id stripeAccountId');

    if (!normalUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'This user is restricted due to some issues');
    }

    const stripAccountId = normalUser.stripeAccountId;
    const accountLink = await stripe.accountLinks.create({
      account: stripAccountId,
      refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${stripAccountId}`,
      return_url: config.stripe_payment_gateway.onboarding_return_url,
      type: 'account_onboarding',
    });

    return { link: accountLink.url };
  } catch (error) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to update onboarding link');
  }
};

/**
 * Create a payment intent
 */
const createPaymentIntent = async (userId, paymentDetails) => {
  try {
    const { price, driverId, description = 'Truck service payment' } = paymentDetails;

    if (!price || price <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Price must be a positive number');
    }

    if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Valid truck ID is required');
    }

    const isExistTruck = await DriverVerification.findOne({
      _id: paymentDetails.driverId,
      isVerifyDriverNid: true,
      isReadyToDrive: true,
      isVerifyDriverLicense: true
    }).select('_id');

    if (!isExistTruck) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Issues with truck driver verification');
    }

    const user = await userModels.findOne({
      _id: userId,
      isDelete: false,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress
    }).select('stripeAccountId email');

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found or not verified');
    }

    if (!user.stripeAccountId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User does not have a connected Stripe account');
    }

    const amountInCents = Math.round(price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      description: description,
      metadata: { driverId, userId },
      application_fee_amount: Math.round(amountInCents * 0.05),
      transfer_data: {
        destination: user.stripeAccountId,
      },
    });

    const paymentGatewayData = {
      ...paymentDetails,
      userId,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isPayment: true,
    };

    const result = await StripePaymentGateway.create(paymentGatewayData);

    if (!result) {
      throw new ApiError(httpStatus.NOT_ACCEPTABLE, 'Issues with payment gateway system');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, `Payment service unavailable: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Retrieve payment status
 */
const retrievePaymentStatus = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      metadata: paymentIntent.metadata,
      created: new Date(paymentIntent.created * 1000).toISOString(),
    };
  } catch (error) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Could not retrieve payment information');
  }
};

/**
 * Create checkout session
 */
const createCheckoutSession = async (userId, paymentDetails) => {
  try {
    const { price, driverId, description = 'Truck rental payment' } = paymentDetails;

    if (!price || price <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Price must be a positive number');
    }

    if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Valid truck ID is required');
    }

    const user = await userModels.findOne({
      _id: userId,
      isDelete: false,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress
    }).select('stripeAccountId email');

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found or not verified');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Truck Rental',
            description,
            metadata: { driverId },
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      metadata: { driverId, userId },
      mode: 'payment',
      success_url: `${config.stripe_payment_gateway.checkout_success_url}?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: config.stripe_payment_gateway.checkout_cancel_url,
    });

    const paymentData = {
      currency: session.currency,
      sessionId: session.id,
      userId: session.metadata.userId,
      driverId: session.metadata.driverId,
      paymentmethod: session.payment_method_types[0],
      payment_statu: session.payment_status,
      price: paymentDetails.price,
      description: paymentDetails.description,
    };

    const paymentResult = await StripePaymentGateway.create(paymentData);

    if (!paymentResult) {
      throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Issues with stripe checkout session');
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, `Checkout service unavailable: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Handle webhook events
 */
const handleWebhook = async (event) => {
  let result = {
    status: false,
    message: 'Unhandled event',
  };

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      if (!paymentIntent.id) {
        throw new ApiError(httpStatus.NOT_FOUND, `Issues with payment intent ID: ${paymentIntent.id}`);
      }
      result = { status: true, message: 'Payment Successful' };
      break;
    }

    case 'account.updated': {
      const account = event.data.object;
      if (!account.id) {
        throw new ApiError(httpStatus.NOT_FOUND, `Issues with account ID: ${account.id} update`);
      }
      result = { status: true, message: 'Account updated' };
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object;
      if (!session) {
        throw new ApiError(httpStatus.NO_CONTENT, 'Issues with checkout session completion');
      }

      const recordedPayment = await StripePaymentGateway.findOneAndUpdate(
        {
          userId: session.metadata.userId,
          driverId: session.metadata.driverId,
          sessionId: session.id,
        },
        {
          $set: {
            payable_name: session.customer_details?.name,
            payable_email: session.customer_details?.email,
            payment_intent: session.payment_intent,
            payment_status: session.payment_status,
            country: session.customer_details?.address?.country,
          },
        },
        { new: true, upsert: true }
      );

      if (!recordedPayment) {
        throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Issues with checkout session completion processing');
      }

      result = { status: true, message: 'Session data successfully recorded' };
      break;
    }

    default: {
      console.log(`Unhandled event type ${event.type}`);
      break;
    }
  }

  return result;
};

module.exports = {
  createConnectedAccountAndOnboardingLink,
  updateOnboardingLink,
  createPaymentIntent,
  retrievePaymentStatus,
  createCheckoutSession,
  handleWebhook
};
