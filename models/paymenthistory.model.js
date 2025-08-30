const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentHistorySchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    planType: {
        type: String,
        enum: ['Free', 'Bronze', 'Silver', 'Gold'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'usd',
    },
    provider: {
        type: String,
        required: true,
    },
    transactionId: {
        type: String,
        required: true,
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending', 'refunded'],
        default: 'success',
    },
    meta: {
        type: Schema.Types.Mixed,
    }
});

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);
