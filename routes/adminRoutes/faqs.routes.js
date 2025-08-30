const router = require("express").Router();
const { get5Faq, createFAQ, updateFAQ, getAllFaqs } = require("../../controllers/adminControllers/faqs.controller");
const { isUserLoggedIn, isAdminUser } = require("../../middleware/middlewares");


router.route('/')
    .get(get5Faq)
    .post(isUserLoggedIn, isAdminUser, createFAQ)
    .put(isUserLoggedIn, isAdminUser, updateFAQ);


router.get('/all-faq', getAllFaqs);
module.exports = router;