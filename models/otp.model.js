const mongoose = require('mongoose');

const {Schema} = mongoose;


const otpSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        used: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
)


module.exports = mongoose.model('otp', otpSchema);