const mongoose = require('mongoose');
const { Schema } = mongoose;

const FullmockTestSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  duration: {
    hours: {
      type: Number,
      required: true,
    },
    minutes: {
      type: Number,
      required: true,
    }
  },
  questions: [{
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('FullmockTest', FullmockTestSchema);