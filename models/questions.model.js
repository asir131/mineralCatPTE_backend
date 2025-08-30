const mongoose = require('mongoose');
const { Schema } = mongoose;
const Counter = require('./Counter');

const BlankSchema = new Schema({
  index: Number,
  options: [String],
  correctAnswer: String
}, { _id: false });

const QuestionSchema = new Schema({
  type: {
    type: String,
    enum: ['speaking', 'writing', 'reading', 'listening'],
    required: true
  },
  subtype: {
    type: String,
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
    ],
    required: true
  },

  heading: String,

  prompt: { type: String },

  // For questions with text/audio/image
  audioUrl: String,
  audioConvertedText: String,
  imageUrl: String,
  text: String,

  // For blanks-type questions
  blanks: [BlankSchema],

  // For MCQs and reorder
  options: [String],
  correctAnswers: [String], // multiple correct for MCQ-MA, one for MCQ-SA

  // For essay/text responses
  correctText: String, // optional for AI scoring

  questionNumber: {
    type: Number,
    unique: true,
  },

  // Admin/meta
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
}
);

QuestionSchema.pre('save', async function (next) {
  if (this.isNew && !this.questionNumber) {
    const counter = await Counter.findOneAndUpdate(
      { name: 'question' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.questionNumber = counter.seq;
  }
  next();
});



QuestionSchema.index({ type: 1, subtype: 1 });
QuestionSchema.index({ createdAt: -1 });
QuestionSchema.index({ subtype: 1, createdAt: -1 });

module.exports = mongoose.model('Question', QuestionSchema);
