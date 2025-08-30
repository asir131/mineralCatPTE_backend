const { required } = require('joi');
const mongoose = require('mongoose');

const stripePaymentGatewaySchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      default: 'usd',
    },
    sessionId: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paymentmethod: {
      type: String,
      default: 'card',
    },
    payment_status: {
      type: String,
      enum: ['unpaid', 'paid', 'failed'],
      default: 'unpaid',
    },
    planValidity: {
      type: Number,
      enum: [10, 30, 60, 90],
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    payable_name: {
      type: String,
    },
    payable_email: {
      type: String,
    },
    payment_intent: {
      type: String,
    },
    paymentIntentId: {
      type: String,
    },
    clientSecret: {
      type: String,
    },
    isPayment: {
      type: Boolean,
      default: false,
    },
    country: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);


const StripePaymentGateway = mongoose.model(
  'StripePaymentGateway',
  stripePaymentGatewaySchema
);

module.exports = StripePaymentGateway;