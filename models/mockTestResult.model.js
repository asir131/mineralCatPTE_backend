const mongoose = require('mongoose');
const { Schema } = mongoose;

const TypeScoreSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['speaking', 'writing', 'reading', 'listening']
  },
  attempts: [
    {
      questionId: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true
      },
      questionSubtype: {
        type: String,
        required: true,
        enum: [
      // Speaking
      'read_aloud', 'repeat_sentence', 'describe_image',
      'respond_to_situation', 'answer_short_question',

      // Writing
      'summarize_written_text', 'write_email',

      // Reading
      'rw_fill_in_the_blanks', 'mcq_multiple', 'reorder_paragraphs',
      'reading_fill_in_the_blanks', 'mcq_single',

      // Listening
      'summarize_spoken_text', 'listening_fill_in_the_blanks',
      'listening_multiple_choice_multiple_answers', 'listening_multiple_choice_single_answers'
        ]
      },
      score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  averageScore: {
    type: Number,
    default: 0
  }
});

const MockTestResultSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mockTest: {
    type: Schema.Types.ObjectId,
    ref: 'FullmockTest',
    required: true
  },
  results: [TypeScoreSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

MockTestResultSchema.index({ user: 1, mockTest: 1 }, { unique: true });

MockTestResultSchema.pre('save', function (next) {
  this.results.forEach(result => {
    const total = result.attempts.reduce((sum, att) => sum + att.score, 0);
    result.averageScore = result.attempts.length ? total / result.attempts.length : 0;
  });
  next();
});

module.exports = mongoose.model('MockTestResult', MockTestResultSchema);
