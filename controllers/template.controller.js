const fs = require("fs/promises");
const path = require("path");
const TemplateFile = require("../models/template.model");
const ExpressError = require("../utils/ExpressError");

const ALLOWED_CATEGORIES = new Set([
  "describe-image",
  "respond-to-situation",
  "write-email",
  "summarize-spoken-text",
]);

const validateCategory = (category) => {
  if (!ALLOWED_CATEGORIES.has(category)) {
    throw new ExpressError(400, "Invalid template category");
  }
};

const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore missing files
  }
};

module.exports.uploadTemplate = async (req, res, next) => {
  try {
    const { category } = req.params;
    validateCategory(category);

    if (!req.file) {
      throw new ExpressError(400, "Please upload a PDF file");
    }

    const existing = await TemplateFile.findOne({ category });

    if (existing?.filePath) {
      await safeUnlink(path.resolve(existing.filePath));
    }

    const payload = {
      category,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    const updated = await TemplateFile.findOneAndUpdate(
      { category },
      payload,
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Template uploaded successfully",
      category: updated.category,
      fileName: updated.originalName,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteTemplate = async (req, res, next) => {
  try {
    const { category } = req.params;
    validateCategory(category);

    const existing = await TemplateFile.findOne({ category });

    if (!existing) {
      throw new ExpressError(404, "Template not found");
    }

    await safeUnlink(path.resolve(existing.filePath));
    await TemplateFile.deleteOne({ _id: existing._id });

    return res.status(200).json({
      message: "Template deleted successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.downloadTemplate = async (req, res, next) => {
  try {
    const { category } = req.params;
    validateCategory(category);

    const existing = await TemplateFile.findOne({ category });

    if (!existing) {
      throw new ExpressError(404, "Template not found");
    }

    const absolutePath = path.resolve(existing.filePath);

    return res.download(absolutePath, existing.originalName);
  } catch (error) {
    next(error);
  }
};
