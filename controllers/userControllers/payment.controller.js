const supscriptionModel = require('../../models/supscription.model');
const {asyncWrapper} = require('../../utils/AsyncWrapper');
const ExpressError = require("../../utils/ExpressError");
const {subscriptionSchemaValidator} = require('../../validations/schemaValidations');
const stripe = require('../../services/stripe');
const bodyParser = require('body-parser');


module.exports.stripePaymentIntent = asyncWrapper(async(req, res)=>{
    const {amount} = req.body;

    const paymentIntent = await stripe.paymentIntents.create(
        {
            amount,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
        }
    )

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
})

module.exports.webHook = (bodyParser.raw({ type: 'application/json' }),(req, res) => {
    const sig = req.headers['stripe-signature'];
  
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  
    // Handle successful payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      // Update subscription or DB here
      
    }
  
    res.json({ received: true });
  });