const { Schema, model } = require('mongoose');


const PrivacyAndPolicy = new Schema({
    policyText: {
        type: String,
        required: true,
    },
},
{
    timestamps: true,
}
)


const PrivacyAndPolicyModel = new model("PrivacyAndPolicy", PrivacyAndPolicy);

module.exports = PrivacyAndPolicyModel;