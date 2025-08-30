const { Schema, default: mongoose } = require('mongoose');

const practicedSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    questionType: {
        type: String,
        enum: ['speaking', 'writing', 'reading', 'listening'],
        required: true,
    },
    subtype: {
        type: String,
        required: true,
    },
    practicedQuestions: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Question',
        }
    ],

    completedMockTests: [
        {
            type: Schema.Types.ObjectId,
            ref: 'FullmockTest',
        }
    ],

    completedSectionalTests: [
        {
            type: Schema.Types.ObjectId,
            ref: 'SectionalMockTest',
        }
    ]
}, {
    timestamps: true
});

practicedSchema.index({ user: 1, questionType: 1, subtype: 1 }, { unique: true });

module.exports = mongoose.model('Practice', practicedSchema);
