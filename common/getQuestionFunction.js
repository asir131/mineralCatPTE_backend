const { default: mongoose } = require('mongoose');
const bookmarkModel = require('../models/bookmark.model');
const practicedModel = require('../models/practiced.model');
const questionsModel = require('../models/questions.model');

module.exports.getQuestionByQuery = (async (query, subtype, page = 1, limit = 10, req, res) => {
    if (query == 'all') {
        const skip = (page - 1) * limit;

        const questions = await questionsModel.find({ subtype })
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });
        const questionsCount = await questionsModel.countDocuments({ subtype });
        res.status(200).json({ questions, questionsCount });
    } else if (query == 'not_practiced') {
        const userId = req.user._id;
        const practiceDoc = await practicedModel.findOne({ user: userId, subtype });
        const practicedIds = practiceDoc?.practicedQuestions || [];

        const query = {
            subtype,
            _id: { $nin: practicedIds }
        };

        const skip = (page - 1) * limit;

        const [questions, total] = await Promise.all([
            questionsModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            questionsModel.countDocuments(query)
        ]);

        if (!questions.length) {
            return res.status(404).json({ message: "No not-practiced questions found." });
        }

        res.status(200).json({
            questions,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } else if (query === 'bookmark') {
        const skip = (page - 1) * limit;
        const userId = req.user._id;

        const [result] = await bookmarkModel.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    subtype: subtype
                }
            },
            {
                $lookup: {
                    from: 'questions',
                    localField: 'bookmarkedQuestions',
                    foreignField: '_id',
                    as: 'questions'
                }
            },
            { $unwind: '$questions' },
            { $sort: { 'questions.createdAt': -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $group: {
                    _id: '$_id',
                    questions: { $push: '$questions' },
                    total: { $sum: 1 }
                }
            }
        ]);

        if (!result || !result.questions.length) {
            return res.status(404).json({ message: 'No bookmarked questions found.' });
        }

        return res.status(200).json({
            questions: result.questions,
            total: result.total,
            page: Number(page),
            pages: Math.ceil(result.total / limit)
        });
    }
    else {
        res.status(401).json({ message: "Invalid Query" })
    }
})