const fs = require("fs/promises");
const path = require("path");
const cloudinary = require("../middleware/cloudinary.config");
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

module.exports.listPredictions = async (req, res, next) => {
  try {
    const predictions = await PredictionFile.find({})
      .sort({ createdAt: -1 })
      .select("name originalName fileUrl publicId version createdAt");

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

    assertPdf(req.file);

    if (useCloudinary()) {
      const uploaded = await uploadPdfToCloudinary(req.file, "predictions");
      await safeUnlink(req.file?.path);

      const created = await PredictionFile.create({
        name,
        fileName: uploaded.public_id.split("/").pop(),
        originalName: req.file.originalname,
        filePath: "",
        fileUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        version: uploaded.version,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      return res.status(201).json({
        message: "Prediction created successfully",
        data: {
          _id: created._id,
          name: created.name,
          originalName: created.originalName,
          fileUrl: created.fileUrl,
          publicId: created.publicId,
          version: created.version,
        },
      });
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
        fileUrl: created.fileUrl || "",
        publicId: created.publicId || "",
        version: created.version || "",
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

    if (useCloudinary()) {
      if (existing.publicId) {
        await deleteCloudinaryAsset(existing.publicId);
      }
    } else if (existing.filePath) {
      await safeUnlink(path.resolve(existing.filePath));
    }
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

    if (useCloudinary()) {
      if (!existing.publicId) {
        throw new ExpressError(404, "Prediction file not found");
      }

      const downloadUrl = getPublicDownloadUrl(existing);

      if (!downloadUrl) {
        throw new ExpressError(404, "Could not generate download URL");
      }

      return res.redirect(downloadUrl);
    }

    if (!existing.filePath) {
      throw new ExpressError(404, "Prediction file not found");
    }

    const absolutePath = path.resolve(existing.filePath);
    return res.download(absolutePath, existing.originalName);
  } catch (error) {
    next(error);
  }
};
