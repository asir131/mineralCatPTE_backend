const mongoose = require('mongoose');
const { Schema } = mongoose;


const faqsSchema = new Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  placement: {
    type: String,
    enum: ["pricing", "home"],
    default: "pricing",
  },
}, {
  timestamps: true,
});


module.exports = mongoose.model('FAQs', faqsSchema);
