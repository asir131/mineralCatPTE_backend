const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    planType: {
        type: String,
        enum: ['Free', 'Bronze', 'Silver', 'Gold'],
        required: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    mockTestLimit: {
        type: Number,
        default: 0, // Default for Bronze
    },
    aiScoringLimit: {
        type: Number,
        default: 0, // Default for Bronze
    },
    credits: {
        type: Number,
        default: 0, // Default for Bronze
    },
    weeklyPredictions: {
        type: Boolean,
        default: false,
    },
    performanceTracking: {
        type: Boolean,
        default: false,
    },
    noExpiration: {
        type: Boolean,
        default: false,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
    },
    paymentInfo: {
        transactionId: String,
        provider: String,
        amount: Number,
        currency: String
    }
});

subscriptionSchema.pre('save', function(next) {
    if (this.planType === 'Bronze') {
        this.mockTestLimit += 5;
        this.aiScoringLimit += 100;
        this.credits += 100;
    } else if (this.planType === 'Silver') {
        this.mockTestLimit += 10;
        this.aiScoringLimit += 300;
        this.credits += 300;
    } else if (this.planType === 'Gold') {
        this.mockTestLimit += 15;
        this.aiScoringLimit += 700;
        this.credits += 700;
    }
    next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
