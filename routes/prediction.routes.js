const express = require("express");
const {
  listPredictions,
  createPrediction,
  deletePrediction,
  downloadPrediction,
} = require("../controllers/prediction.controller");
const createUploadMiddleware = require("../middleware/upload");
const { isUserLoggedIn, isAdminUser } = require("../middleware/middlewares");

const router = express.Router();
const uploadPdf = createUploadMiddleware([".pdf"]);

router.get("/", isUserLoggedIn, listPredictions);
router.post("/", isUserLoggedIn, isAdminUser, uploadPdf.single("file"), createPrediction);
router.delete("/:id", isUserLoggedIn, isAdminUser, deletePrediction);
router.get("/:id", isUserLoggedIn, downloadPrediction);

module.exports = router;
