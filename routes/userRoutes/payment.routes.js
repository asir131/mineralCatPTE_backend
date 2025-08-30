
const { stripePaymentIntent, webHook } = require('../../controllers/userControllers/payment.controller');

const router = require('express').Router();

router.post('/stripe-payment-intent',stripePaymentIntent);

router.post('/webhook', webHook);

module.exports = router;