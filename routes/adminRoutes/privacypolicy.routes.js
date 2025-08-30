const { getPrivacyAndPolicy, editPrivacyAndPolicy } = require('../../controllers/adminControllers/privacyPolicy.controller');
const { isUserLoggedIn, isAdminUser } = require('../../middleware/middlewares');
const PrivacyAndPolicyModel = require('../../models/privacypolicy.models');
const router = require('express').Router();


router.route('/privacy-edit')
    .put(isUserLoggedIn, isAdminUser, editPrivacyAndPolicy);

// router.post('/add-privacy', addPrivacyAndPolicy);

router.get('/get-privacy', getPrivacyAndPolicy);

router.delete('/delete-privacy', async(req, res)=>{
    const deleteData = await PrivacyAndPolicyModel.deleteMany();

    res.status(200).json({Message: "success", deleteData})
})

module.exports = router;