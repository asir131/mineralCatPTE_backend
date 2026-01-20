const router = require("express").Router();
const {
    get5Faq,
    createFAQ,
    updateFAQ,
    getAllFaqs,
    getHomeFaqs,
    getAllHomeFaqs,
    deleteHomeFaq,
} = require("../../controllers/adminControllers/faqs.controller");
const { isUserLoggedIn, isAdminUser } = require("../../middleware/middlewares");


router.route('/')
    .get(get5Faq)
    .post(isUserLoggedIn, isAdminUser, createFAQ)
    .put(isUserLoggedIn, isAdminUser, updateFAQ);


router.get('/all-faq', getAllFaqs);
router.route('/home')
    .get(getHomeFaqs)
    .post(isUserLoggedIn, isAdminUser, (req, res, next) => {
        req.body.placement = "home";
        next();
    }, createFAQ);

router.get('/home/all', getAllHomeFaqs);
router.delete('/home/:id', isUserLoggedIn, isAdminUser, deleteHomeFaq);
module.exports = router;
