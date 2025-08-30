const { Schema, default: mongoose } = require('mongoose');

const notificationSchema = new Schema({
  title: String,
  description: String,
  time: {
    type: Date,
    default: Date.now,
  },
  targetSubscription: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'all'],
    required: true,
  }
});


notificationSchema.index({ targetSubscription: 1 });
notificationSchema.index({ time: -1 });


module.exports = mongoose.model('Notification', notificationSchema);
