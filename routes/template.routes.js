const express = require("express");
const {
  uploadTemplate,
  deleteTemplate,
  downloadTemplate,
} = require("../controllers/template.controller");
const createUploadMiddleware = require("../middleware/upload");
const { isUserLoggedIn, isAdminUser } = require("../middleware/middlewares");

const router = express.Router();
const uploadPdf = createUploadMiddleware([".pdf"]);

router.get("/:category", isUserLoggedIn, downloadTemplate);
router.post("/:category", isUserLoggedIn, isAdminUser, uploadPdf.single("file"), uploadTemplate);
router.delete("/:category", isUserLoggedIn, isAdminUser, deleteTemplate);

module.exports = router;
