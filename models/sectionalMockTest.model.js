const { required } = require('joi');
const mongoose = require('mongoose');
const { Schema } = mongoose;



const sectionalMockTestSchema = new Schema({
    type: {
        type: String,
        enum: ['speaking', 'writing', 'reading', 'listening'],
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    duration: {
        hours: {
            type: Number,
            required: true
        },
        minutes: {
            type: Number,
            required: true
        }
    },
    questions: [{
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });


module.exports = mongoose.model('SectionalMockTest', sectionalMockTestSchema);