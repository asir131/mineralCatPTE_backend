const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, unique: true },
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

module.exports = mongoose.model("TemplateFile", templateSchema);
