const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String },
    fileUrl: { type: String },
    publicId: { type: String },
    version: { type: Number },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PredictionFile", predictionSchema);
