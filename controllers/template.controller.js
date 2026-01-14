const fs = require("fs/promises");
const path = require("path");
const cloudinary = require("../middleware/cloudinary.config");
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

const assertPdf = (file) => {
  if (!file) throw new ExpressError(400, "Please upload a PDF file");
};

const useCloudinary = () =>
  String(process.env.USE_CLOUDINARY || "").toLowerCase() === "true";

const uploadPdfToCloudinary = async (file, folderName) => {
  if (!file) throw new ExpressError(400, "Please upload a PDF file");
  const result = await cloudinary.uploader.upload(file.path, {
    folder: folderName,
    resource_type: "raw",
    access_mode: "public",
    use_filename: true,
    unique_filename: true,
  });
  return result;
};

const deleteCloudinaryAsset = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch (error) {
    // Ignore delete errors
  }
};

const getPublicDownloadUrl = (file) => {
  const publicId = file.publicId || "";
  if (!publicId) return null;
  const cloudName = cloudinary.config().cloud_name;
  const versionPart = file.version ? `/v${file.version}/` : "/";
  return `https://res.cloudinary.com/${cloudName}/raw/upload${versionPart}${publicId}`;
};

module.exports.uploadTemplate = async (req, res, next) => {
  try {
    const { category } = req.params;
    validateCategory(category);

    assertPdf(req.file);

    const existing = await TemplateFile.findOne({ category });

    if (useCloudinary()) {
      if (existing?.publicId) {
        await deleteCloudinaryAsset(existing.publicId);
      }

      const uploaded = await uploadPdfToCloudinary(
        req.file,
        `templates/${category}`
      );

      await safeUnlink(req.file?.path);

      const payload = {
        category,
        fileName: uploaded.public_id.split("/").pop(),
        originalName: req.file.originalname,
        filePath: "",
        fileUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        version: uploaded.version,
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
    }

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

    const updated = await TemplateFile.findOneAndUpdate({ category }, payload, {
      new: true,
      upsert: true,
    });

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

    if (useCloudinary()) {
      if (existing.publicId) {
        await deleteCloudinaryAsset(existing.publicId);
      }
    } else if (existing.filePath) {
      await safeUnlink(path.resolve(existing.filePath));
    }
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

    if (useCloudinary()) {
      if (!existing.publicId) {
        throw new ExpressError(404, "Template file not found");
      }

      const downloadUrl = getPublicDownloadUrl(existing);

      if (!downloadUrl) {
        throw new ExpressError(404, "Could not generate download URL");
      }

      return res.redirect(downloadUrl);
    }

    if (!existing.filePath) {
      throw new ExpressError(404, "Template file not found");
    }

    const absolutePath = path.resolve(existing.filePath);
    return res.download(absolutePath, existing.originalName);
  } catch (error) {
    next(error);
  }
};
