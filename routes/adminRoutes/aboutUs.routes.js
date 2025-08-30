const router = require("express").Router();
const { createAboutUs, getAboutUs, updateAboutUs } = require("../../controllers/adminControllers/aboutUs.controller");
const { isUserLoggedIn, isAdminUser } = require("../../middleware/middlewares");


router.route('/')
    .get(getAboutUs)
    .put(isUserLoggedIn, isAdminUser, updateAboutUs);


module.exports = router;