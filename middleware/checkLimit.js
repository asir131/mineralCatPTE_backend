const userModels = require("../models/user.models");
const Subscription = require('../models/supscription.model');

module.exports.checkLimit = (limits) => {

    return async (req, res, next) => {
        try {
            const userId = req.user._id;
            const user = await userModels.findById(userId).populate('userSubscription');



            if (!user || !user.userSubscription) {
                return res.status(404).json({ message: 'User or subscription not found' });
            }

            const subscription = await Subscription.findById(user.userSubscription._id);

            let errorMessages = [];

            if (user.userSubscription.planType == "Free") {
                const wantsMock = limits.includes("mock");
                const wantsCredits = limits.includes("aicredits");

                if (wantsCredits && subscription.credits <= 0) {
                    return res.status(401).json({message: 'Please Upgrade to see the result'})
                }

                if (wantsMock && subscription.mockTestLimit <= 0) {
                    return res.status(401).json({message: 'Please Upgrade to see the result'})
                }
            }

            if (limits.includes("mock") && subscription.mockTestLimit <= 0) {
                errorMessages.push(`You have reached your limit of ${subscription.mockTestLimit} mock tests.`);
            }

            if (limits.includes("aicredits") && subscription.credits <= 0) {
                errorMessages.push(`You have used all your AI credits (${subscription.credits} credits).`);
            }

            if (errorMessages.length > 0) {
                return res.status(403).json({ message: errorMessages.join(' ') });
            }

            if (limits.includes("mock")) {
                await Subscription.findByIdAndUpdate(user.userSubscription._id, { mockTestLimit: subscription.mockTestLimit - 1 })
            }

            if (limits.includes("aicredits")) {
                await Subscription.findByIdAndUpdate(user.userSubscription._id, { credits: subscription.credits - 1 })
            }

            next();
        } catch (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }
    };
};
