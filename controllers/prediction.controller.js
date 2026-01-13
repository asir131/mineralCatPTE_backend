const fs = require("fs/promises");
const path = require("path");
const PredictionFile = require("../models/prediction.model");
const ExpressError = require("../utils/ExpressError");

const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore missing files
  }
};

module.exports.listPredictions = async (req, res, next) => {
  try {
    const predictions = await PredictionFile.find({})
      .sort({ createdAt: -1 })
      .select("name originalName createdAt");

    res.status(200).json({
      data: predictions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.createPrediction = async (req, res, next) => {
  try {
    const name = (req.body?.name || "").trim();

    if (!name) {
      throw new ExpressError(400, "Prediction name is required");
    }

    if (!req.file) {
      throw new ExpressError(400, "Please upload a PDF file");
    }

    const created = await PredictionFile.create({
      name,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json({
      message: "Prediction created successfully",
      data: {
        _id: created._id,
        name: created.name,
        originalName: created.originalName,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.deletePrediction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await PredictionFile.findById(id);

    if (!existing) {
      throw new ExpressError(404, "Prediction not found");
    }

    await safeUnlink(path.resolve(existing.filePath));
    await PredictionFile.deleteOne({ _id: existing._id });

    res.status(200).json({ message: "Prediction deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports.downloadPrediction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await PredictionFile.findById(id);

    if (!existing) {
      throw new ExpressError(404, "Prediction not found");
    }

    const absolutePath = path.resolve(existing.filePath);
    return res.download(absolutePath, existing.originalName);
  } catch (error) {
    next(error);
  }
};
