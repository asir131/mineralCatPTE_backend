const { Schema, default: mongoose } = require('mongoose');

const bookmark = Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    questionType: {
        type: String,
        enum: ['speaking', 'writing', 'reading', 'listening'],
        required: true
    },
    subtype: {
        type: String,
        required: true
    },
    bookmarkedQuestions: [{
        type: Schema.Types.ObjectId,
        ref: 'Question',
    }]
});

bookmark.index({ user: 1, questionType: 1, subtype: 1 }, { unique: true });
bookmark.index({ bookmarkedQuestions: 1 });


module.exports = mongoose.model('Bookmark', bookmark);
