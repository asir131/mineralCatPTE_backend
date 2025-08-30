const { Schema, model } = require('mongoose');


const TermsAndConditionSchema = new Schema({
    termText: {
        type: String,
        required: true,
    },
},
{
    timestamps: true,
}
)


const termsAndConditionModel = new model("TermsAndCondition", TermsAndConditionSchema);

module.exports = termsAndConditionModel;