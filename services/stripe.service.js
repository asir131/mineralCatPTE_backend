const Stripe = require('stripe');
const mongoose = require('mongoose');
const httpStatus = require('http-status');

// Import models
const StripePaymentGateway = require('../models/payment.model');
const User = require('../models/user.models');
const Subscription = require('../models/supscription.model');
const paymenthistoryModel = require('../models/paymenthistory.model');

/**
 * Configuration setup for Stripe integration
 */
const config = {
  stripe_payment_gateway: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    onboarding_refresh_url: process.env.ONBOARDING_REFRESH_URL || 'http://localhost:8080/refresh',
    onboarding_return_url: process.env.ONBOARDING_RETURN_URL || 'http://localhost:8080/return',
    checkout_success_url: process.env.CHECKOUT_SUCCESS_URL || 'http://localhost:8080/success',
    checkout_cancel_url: process.env.CHECKOUT_CANCEL_URL || 'http://localhost:8080/cancel'
  }
};

// Create Stripe instance
const stripe = new Stripe(config.stripe_payment_gateway.stripe_secret_key);

/**
 * API Error class for consistent error handling
 */
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

/**
 * Constants for user status
 */
const USER_STATUS = {
  PROGRESS: 'progress',
  PENDING: 'pending',
  BLOCKED: 'blocked'
};

/**
 * Creates a connected Stripe account and onboarding link for a user
 * @param {Object} userData - User data containing id
 * @returns {Promise<string>} - URL for onboarding
 */
async function createConnectedAccountAndOnboardingLink(userData) {
  try {
    console.log('userData:', userData);
    const user = await User.findOne({
      _id: userData._id,
      status: USER_STATUS.PROGRESS
    }).select('_id stripeAccountId email');

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'This user is restricted due to some issues'
      );
    }

    // If user already has a Stripe account, create a new onboarding link
    if (user.stripeAccountId) {
      const onboardingLink = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${user.stripeAccountId}`,
        return_url: config.stripe_payment_gateway.onboarding_return_url,
        type: 'account_onboarding',
      });
      return onboardingLink.url;
    }

    // Create a new connected account
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      country: 'US',
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    });


    // Update user with Stripe account ID
    await User.findByIdAndUpdate(user._id, { stripeAccountId: account.id });

    const onboardingLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${account.id}`,
      return_url: config.stripe_payment_gateway.onboarding_return_url,
      type: 'account_onboarding',
    });

    return onboardingLink.url;
  } catch (error) {
    console.log(error);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Failed to create connected account and onboarding link'
    );
  }
}

/**
 * Updates the onboarding link for an existing user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Object containing link URL
 */
async function updateOnboardingLink(userId) {
  try {
    const user = await User.findOne({
      _id: userId,
      status: USER_STATUS.PROGRESS
    }).select('_id stripeAccountId');

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'This user is restricted due to some issues'
      );
    }

    if (!user.stripeAccountId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'User does not have a Stripe account'
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${user.stripeAccountId}`,
      return_url: config.stripe_payment_gateway.onboarding_return_url,
      type: 'account_onboarding',
    });

    return { link: accountLink.url };
  } catch (error) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Failed to update onboarding link'
    );
  }
}

/**
 * Creates a payment intent for a transaction
 * @param {string} userId - User ID
 * @param {Object} paymentDetails - Payment details including price, and description
 * @returns {Promise<Object>} - Payment intent details
 */
async function createPaymentIntent(userId, paymentDetails) {
  try {
    const {
      price,
      description = 'Service payment',
      planValidity,
    } = paymentDetails;

    if (!price || price <= 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Price must be a positive number'
      );
    }

    // Admin Stripe Account ID (hardcoded or from env)
    const adminStripeAccountId = process.env.ADMIN_STRIPE_ACCOUNT_ID;

    if (!adminStripeAccountId) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Admin Stripe account is not configured'
      );
    }

    const amountInCents = Math.round(price * 100);

    console.log(userId, planValidity);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      description,
      metadata: {
        userId: userId,
        planValidity: planValidity,
      },
      application_fee_amount: Math.round(amountInCents * 0.05), // 5% platform fee
      transfer_data: {
        destination: adminStripeAccountId,
      },
    });

    const paymentGatewayData = {
      userId,
      price,
      description,
      planValidity,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isPayment: true,
    };

    const result = await StripePaymentGateway.create(paymentGatewayData);

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'Issues with payment gateway system'
      );
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Payment service unavailable: ${error.message || 'Unknown error'}`
    );
  }
}


/**
 * Retrieves the status of a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} - Payment status information
 */
async function retrievePaymentStatus(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert back to dollars
      metadata: paymentIntent.metadata,
      created: new Date(paymentIntent.created * 1000).toISOString(),
    };
  } catch (error) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Could not retrieve payment information'
    );
  }
}

/**
 * Creates a checkout session for a payment
 * @param {string} userId - User ID
 * @param {Object} paymentDetails - Payment details including price and description
 * @returns {Promise<Object>} - Checkout session details
 */
// Fixed createCheckoutSession function
async function createCheckoutSession(userId, paymentDetails) {
  try {
    const {
      price,
      description = 'Truck rental payment',
      planValidity,
      planType
    } = paymentDetails;

    // Add validation for required fields
    if (!price || price <= 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Price must be a positive number'
      );
    }

    if (!planType) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'planType is required'
      );
    }

    // validation of price
    const planPrices = {
      'Bronze': 29.99,
      'Silver': 49.99,
      'Gold': 69.99
    };

    const expectedPrice = planPrices[planType];

    if (!expectedPrice) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid plan type: ${planType}. Available plans: Bronze, Silver, Gold`
      );
    }

    if (parseFloat(price) !== expectedPrice) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid price for ${planType} plan. Expected: €${expectedPrice}, received: €${price}`
      );
    }

    const user = await User.findOne({
      _id: userId,
      status: USER_STATUS.PROGRESS
    }).select('stripeAccountId email');

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'User not found or not verified'
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Service Payment',
              description: description,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId.toString(), // Ensure string conversion
        planValidity: planValidity ? planValidity.toString() : '30',
        planType: planType.toString()
      },
      mode: 'payment',
      success_url: `${config.stripe_payment_gateway.checkout_success_url}?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: config.stripe_payment_gateway.checkout_cancel_url,
    });

    const paymentData = {
      currency: session.currency,
      sessionId: session.id,
      userId: session.metadata.userId,
      planValidity: session.metadata.planValidity,
      paymentMethod: session.payment_method_types[0],
      paymentStatus: session.payment_status,
      price: paymentDetails.price,
      description: paymentDetails.description,
      planType: paymentDetails.planType,
    };

    const paymentResult = await StripePaymentGateway.create(paymentData);

    if (!paymentResult) {
      throw new ApiError(
        httpStatus.NOT_IMPLEMENTED,
        'Issues with stripe checkout session'
      );
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Checkout service unavailable: ${error.message || 'Unknown error'}`
    );
  }
}

// Fixed handleWebhook function with better error handling
async function handleWebhook(event) {
  let result = {
    status: false,
    message: 'Unhandled event',
  };

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`Webhook: Payment Intent Succeeded - ${paymentIntent.id}`);

        if (!paymentIntent.id) {
          throw new Error(`Issues with payment intent ID: ${paymentIntent.id}`);
        }

        result = {
          status: true,
          message: 'Payment Successful (PaymentIntent)',
        };
        break;
      }

      case 'account.updated': {
        const account = event.data.object;
        console.log(`Webhook: Account Updated - ${account.id}`);

        if (!account.id) {
          throw new Error(`Issues with account ID: ${account.id} update`);
        }

        result = {
          status: true,
          message: 'Stripe Account updated',
        };
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`Webhook: Checkout Session Completed - ${session.id}`);

        // Essential check: ensure payment was actually successful
        if (session.payment_status !== 'paid') {
          console.log(`Checkout session ${session.id} not paid. Status: ${session.payment_status}. Skipping subscription update.`);
          result = {
            status: true,
            message: `Checkout session ${session.id} status is ${session.payment_status}, no subscription update.`,
          };
          break;
        }


        // Improved metadata validation with detailed logging
        if (!session.metadata) {
          console.error('No metadata found in checkout session');
          throw new Error('No metadata found in checkout session');
        }

        if (!session.metadata.userId) {
          console.error('Missing userId in checkout session metadata');
          throw new Error('Missing userId in checkout session metadata');
        }

        if (!session.metadata.planType) {
          console.error('Missing planType in checkout session metadata');
          console.error('Available metadata keys:', Object.keys(session.metadata));
          throw new Error('Missing planType in checkout session metadata');
        }

        const userId = session.metadata.userId;
        const planType = session.metadata.planType;
        const transactionId = session.payment_intent || session.id;
        const amountPaid = session.amount_total / 100;
        const currency = session.currency;

        // Determine plan validity in days
        const planValidityDays = parseInt(session.metadata.planValidity, 10);

        if (isNaN(planValidityDays)) {
          console.error(`Invalid planValidity: ${session.metadata.planValidity}. Using default 30 days.`);
        }

        const now = new Date();
        let expiresAt = null;

        // Set expiration logic
        if (planType !== 'Gold' && planValidityDays > 0) {
          expiresAt = new Date(now);
          expiresAt.setDate(now.getDate() + planValidityDays);
        } else if (planType === 'Gold') {
          expiresAt = null; // No expiration for Gold
        }

        try {
          // --- 1. Create/Update Subscription Document ---
          let subscription = await Subscription.findOne({ user: userId });

          if (subscription) {
            // Update existing subscription
            subscription.planType = planType;
            subscription.isActive = true;
            subscription.startedAt = new Date();
            subscription.expiresAt = expiresAt;
            subscription.paymentInfo = {
              transactionId: transactionId,
              provider: 'stripe',
              amount: amountPaid,
              currency: currency,
            };
            await subscription.save();
            console.log(`Subscription updated for user ${userId} to plan: ${planType}`);

          } else {
            // Create a new subscription document
            subscription = new Subscription({
              user: userId,
              planType: planType,
              isActive: true,
              startedAt: new Date(),
              expiresAt: expiresAt,
              paymentInfo: {
                transactionId: transactionId,
                provider: 'stripe',
                amount: amountPaid,
                currency: currency,
              },
            });
            await subscription.save();
            console.log(`New subscription created for user ${userId} with plan: ${planType}`);
          }

          const paymentRecord = new paymenthistoryModel({
            user: userId,
            planType: planType,
            amount: amountPaid,
            currency: currency,
            provider: 'stripe',
            transactionId: transactionId,
            paymentDate: now,
            status: 'success',
            meta: {
              sessionId: session.id,
              subscriptionId: subscription._id,
              customer: session.customer,
              email: session.customer_email,
            },
          });
          await paymentRecord.save();

          // --- 2. Update User's `userSubscription` reference ---
          const user = await User.findById(userId);
          if (user) {
            if (!user.userSubscription || user.userSubscription.toString() !== subscription._id.toString()) {
              user.userSubscription = subscription._id;
              await user.save();
              console.log(`User ${userId} 'userSubscription' field updated.`);
            } else {
              console.log(`User ${userId} 'userSubscription' field already correct.`);
            }
          } else {
            console.error(`User with ID ${userId} not found after successful payment. Subscription created, but user not linked.`);
          }

          result = {
            status: true,
            message: 'Subscription successfully processed and user updated.',
          };

        } catch (dbError) {
          console.error(`Database error during checkout.session.completed processing for user ${userId}:`, dbError);
          throw new Error(`Database operation failed during subscription update: ${dbError.message}`);
        }
        break;
      }

      default: {
        console.log(`Unhandled event type ${event.type}`);
        result = {
          status: false,
          message: `Unhandled event type: ${event.type}`,
        };
        break;
      }
    }

    return result;

  } catch (error) {
    console.error('Webhook handling error (catch block):', error);
    throw error;
  }
}
module.exports = {
  createConnectedAccountAndOnboardingLink,
  updateOnboardingLink,
  createPaymentIntent,
  retrievePaymentStatus,
  createCheckoutSession,
  handleWebhook
};