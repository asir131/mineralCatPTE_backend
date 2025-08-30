
const PrivacyAndPolicyModel = require("../../models/privacypolicy.models");
const { asyncWrapper } = require("../../utils/AsyncWrapper");
const ExpressError = require("../../utils/ExpressError");


// module.exports.addPrivacyAndPolicy = asyncWrapper(async (req, res) => {
//     const policyText = req.body.policyText;

//     if (!policyText) {
//         throw new ExpressError(401, "Field is required");
//     }

//     const newPolicy = await PrivacyAndPolicyModel.create({ policyText: policyText });

//     res.status(200).json({ newPolicy });
// })


module.exports.editPrivacyAndPolicy = asyncWrapper(async (req, res) => {
    const { policyText, id } = req.body;
    

    if (!policyText) {
        throw new ExpressError(401, "Field is required");
    }
    if(!id){
        throw new ExpressError(401, "Field is required");
    }

    const updatedPrivacyAndPolicy = await PrivacyAndPolicyModel.findByIdAndUpdate(
        id,
        { policyText: policyText },
        { new: true }
    );

    return res.status(200).json({ updatedPrivacyAndPolicy: updatedPrivacyAndPolicy });
})

module.exports.getPrivacyAndPolicy = asyncWrapper(async (req, res) => {
    const policyData = await PrivacyAndPolicyModel.find();

    res.status(200).json({ policyData });
})