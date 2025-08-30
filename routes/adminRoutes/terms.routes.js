const { addTermsAndCondition, editTermsAndCondition, getTermsAndCondition } = require('../../controllers/adminControllers/terms.controller');
const { isUserLoggedIn, isAdminUser } = require('../../middleware/middlewares');
const termsAndConditionModel = require('../../models/terms.model');
const router = require('express').Router();


router.route('/terms-action')
    .get(getTermsAndCondition)
    .put(isUserLoggedIn, isAdminUser, editTermsAndCondition);


router.get('/get-terms', getTermsAndCondition);

router.delete('/delete-terms', async(req, res)=>{
    const deleteData = await termsAndConditionModel.deleteMany();

    res.status(200).json({Message: "success", deleteData})
})

module.exports = router;