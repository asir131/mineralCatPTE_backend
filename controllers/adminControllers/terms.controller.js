const termsAndConditionModel = require("../../models/terms.model");
const { asyncWrapper } = require("../../utils/AsyncWrapper");
const ExpressError = require("../../utils/ExpressError");


// module.exports.addTermsAndCondition = asyncWrapper(async (req, res) => {
//     const termText = req.body.termText;

//     if (!termText) {
//         throw new ExpressError(401, "Field is required");
//     }

//     const newTerms = await termsAndConditionModel.create({ termText: termText });

//     res.status(200).json({ newTerms });
// })


module.exports.editTermsAndCondition = asyncWrapper(async (req, res) => {
    const { termText, id } = req.body;
    

    if (!termText) {
        throw new ExpressError(401, "Field is required");
    }
    if(!id){
        throw new ExpressError(401, "Field is required");
    }

    const updatedTermText = await termsAndConditionModel.findByIdAndUpdate(
        id,
        { termText: termText },
        { new: true }
    );

    return res.status(200).json({ updatedTermText: updatedTermText });
})

module.exports.getTermsAndCondition = asyncWrapper(async (req, res) => {
    const termData = await termsAndConditionModel.find();

    res.status(200).json({ termData });
})