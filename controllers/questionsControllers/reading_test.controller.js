const mongoose = require('mongoose');
const Question = require('../../models/questions.model');
const {
    FillInTheBlanksQuestionSchemaValidator,
    mcqMultipleSchemaValidator,
    mcqSingleSchemaValidator,
    readingFillInTheBlanksSchemaValidator,
    reorderParagraphsSchemaValidator,
    EditFillInTheBlanksQuestionSchemaValidator,
    EditmcqMultipleSchemaValidator,
    EditmcqSingleSchemaValidator,
    editReadingFillInTheBlanksSchemaValidator,
    EditReorderParagraphsSchemaValidator
} = require('../../validations/schemaValidations');
const ExpressError = require('../../utils/ExpressError');
const { asyncWrapper } = require("../../utils/AsyncWrapper");
const practicedModel = require('../../models/practiced.model');
const { getQuestionByQuery } = require('../../common/getQuestionFunction');
const { evaluateMcqMultipleResult, evaluateMcqSingleResult, evaluateReadingFillInTheBlanksResult, evaluateReorderParagraphsResult } = require('../mockTestControllers/questionResultHelper/fullMockTest.result.controller');

// Helper to validate and save questions
async function validateAndSaveQuestion(validator, data, userId, subtype) {
    const { error, value } = validator.validate(data);
    if (error) throw new ExpressError(400, error.details[0].message);

    value.createdBy = userId;
    value.subtype = subtype;

    const newQuestion = await Question.create(value);
    return newQuestion;
}

// Helper to update a question
async function validateAndUpdateQuestion(validator, questionId, data) {
    const { error, value } = validator.validate(data);
    if (error) throw new ExpressError(400, error.details[0].message);

    const updatedQuestion = await Question.findByIdAndUpdate(questionId, value, { new: true });
    if (!updatedQuestion) throw new ExpressError(404, "Question not found!");

    return updatedQuestion;
}


// ---------------------- reading and writing fill in the blanks ----------------------
module.exports.addFillInTheBlanks = asyncWrapper(async (req, res) => {
    const newData = req.body;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if (newData.type != 'reading' || newData.subtype != 'rw_fill_in_the_blanks') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    const newQuestion = await validateAndSaveQuestion(FillInTheBlanksQuestionSchemaValidator, newData, req.user._id, 'rw_fill_in_the_blanks');
    res.json({ newQuestion });
});

module.exports.getAllFillInTheBlanks = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if(!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'rw_fill_in_the_blanks', page, limit, req, res);
});


module.exports.editFillIntheBlanks = asyncWrapper(async (req, res) => {
    const newData = req.body.newData;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if ((newData.type && newData.type != 'reading') || (newData.subtype && newData.subtype != 'rw_fill_in_the_blanks')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }
    const updatedQuestion = await validateAndUpdateQuestion(EditFillInTheBlanksQuestionSchemaValidator, req.body.questionId, newData);
    res.status(200).json({ message: "Question Updated Successfully", updatedQuestion });
});

// ---------------------- mcq_multiple ----------------------
module.exports.addMcqMultiple = asyncWrapper(async (req, res) => {
    const newData = req.body;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if (newData.type != 'reading' || newData.subtype != 'mcq_multiple') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }
    const newQuestion = await validateAndSaveQuestion(mcqMultipleSchemaValidator, newData, req.user._id, 'mcq_multiple');
    res.status(200).json({ data: newQuestion });
});

module.exports.getMcqMultiple = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if(!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'mcq_multiple', page, limit, req, res);
});


module.exports.editMcqMultiple = asyncWrapper(async (req, res) => {
    const newData = req.body.newData;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if ((newData.type && newData.type != 'reading') || (newData.subtype && newData.subtype != 'mcq_multiple')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }
    const updatedQuestion = await validateAndUpdateQuestion(EditmcqMultipleSchemaValidator, req.body.questionId, newData);
    res.status(200).json({ message: "Question Updated Successfully", updatedQuestion });
});

module.exports.mcqMultipleChoiceResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;
    const userId = req.user._id;
    const result = await evaluateMcqMultipleResult({userId, questionId, answer});

    res.json(result);
});
// module.exports.mcqMultipleChoiceResult = asyncWrapper(async (req, res) => {
//     const { questionId, selectedAnswers } = req.body;
//     const question = await Question.findById(questionId).lean();
//     if (!question || question.subtype !== 'mcq_multiple') {
//         throw new ExpressError(404, "Question Not Found or Invalid Type");
//     }

//     const correctAnswers = question.correctAnswers;
//     const score = selectedAnswers.filter(answer => correctAnswers.includes(answer)).length;
//     const feedback = `You scored ${score} out of ${correctAnswers.length}.`;

//     await practicedModel.findOneAndUpdate(
//         {
//             user: req.user._id,
//             questionType: question.type,
//             subtype: question.subtype
//         },
//         {
//             $addToSet: { practicedQuestions: question._id }
//         },
//         { upsert: true, new: true }
//     );

//     return res.status(200).json({ score, feedback });
// });

// ---------------------- mcq_single ----------------------
module.exports.addMcqSingle = asyncWrapper(async (req, res) => {

    const newData = req.body;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if (newData.type != 'reading' || newData.subtype != 'mcq_single') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    if (newData.correctAnswers.length > 1) throw new ExpressError(400, "Multiple answers not allowed for mcq_single");

    const newQuestion = await validateAndSaveQuestion(mcqSingleSchemaValidator, newData, req.user._id, 'mcq_single');
    res.status(200).json({ data: newQuestion });
});

module.exports.getMcqSingle = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if(!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'mcq_single', page, limit, req, res);
});
;

module.exports.editMcqSingle = asyncWrapper(async (req, res) => {
    const newData = req.body.newData;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if ((newData.type && newData.type != 'reading') || (newData.subtype && newData.subtype != 'mcq_single')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    if (req.body.newData.correctAnswers.length > 1) throw new ExpressError(400, "Multiple answers not allowed for mcq_single");

    const updatedQuestion = await validateAndUpdateQuestion(EditmcqSingleSchemaValidator, req.body.questionId, newData);
    res.status(200).json({ message: "Question Updated Successfully", updatedQuestion });
});

module.exports.mcqSingleResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;

    const userId = req.user._id;
    const result = await evaluateMcqSingleResult({userId, questionId, answer});

    res.json(result);
});
// module.exports.mcqSingleResult = asyncWrapper(async (req, res) => {
//     const { questionId, userAnswer } = req.body;
//     const question = await Question.findById(questionId).lean();

//     if (!question || question.subtype !== 'mcq_single') {
//         throw new ExpressError(404, "Question not found or invalid type");
//     }

//     const isCorrect = question.correctAnswers.includes(userAnswer);
//     const score = isCorrect ? 1 : 0;

//     await practicedModel.findOneAndUpdate(
//         {
//             user: req.user._id,
//             questionType: question.type,
//             subtype: question.subtype
//         },
//         {
//             $addToSet: { practicedQuestions: question._id }
//         },
//         { upsert: true, new: true }
//     );

//     return res.status(200).json({
//         isCorrect,
//         score,
//         message: isCorrect ? "Correct answer!" : "Incorrect answer!"
//     });
// });


// ---------------------- reading_fill_in_the_blanks ----------------------
module.exports.addReadingFillInTheBlanks = asyncWrapper(async (req, res) => {
    const newData = req.body;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if (newData.type != 'reading' || newData.subtype != 'reading_fill_in_the_blanks') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    const newQuestion = await validateAndSaveQuestion(readingFillInTheBlanksSchemaValidator, newData, req.user._id, 'reading_fill_in_the_blanks');
    res.status(200).json({ data: newQuestion });
});

module.exports.editReadingFillInTheBlanks = asyncWrapper(async (req, res) => {
    const newData = req.body.newData;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if ((newData.type && newData.type != 'reading') || (newData.subtype && newData.subtype != 'reading_fill_in_the_blanks')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    const updatedQuestion = await validateAndUpdateQuestion(editReadingFillInTheBlanksSchemaValidator, req.body.questionId, newData);
    res.status(200).json({ message: "Question Updated Successfully", updatedQuestion });
});

module.exports.getReadingFillInTheBlanks = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if(!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'reading_fill_in_the_blanks', page, limit, req, res);
});


module.exports.readingFillInTheBlanksResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;
    const userId = req.user._id;
    const blanks = answer;
    const result = await evaluateReadingFillInTheBlanksResult({userId, questionId, blanks});
    
    res.status(200).json(result);
});
// module.exports.readingFillInTheBlanksResult = asyncWrapper(async (req, res) => {
//     const { questionId, blanks } = req.body;
//     const question = await Question.findById(questionId).lean();
//     if (!question || question.subtype !== 'reading_fill_in_the_blanks') {
//         throw new ExpressError(404, "Question Not Found!");
//     }

//     let score = 0;
//     const totalBlanks = question.blanks.length;

//     blanks.forEach((userBlank) => {
//         const correctBlank = question.blanks.find((blank) => blank.index === userBlank.index);
//         if (correctBlank && userBlank.selectedAnswer === correctBlank.correctAnswer) {
//             score++;
//         }
//     });

//     const result = { score, totalBlanks };
//     const feedback = `You scored ${score} out of ${totalBlanks}.`;

//     await practicedModel.findOneAndUpdate(
//         {
//             user: req.user._id,
//             questionType: question.type,
//             subtype: question.subtype
//         },
//         {
//             $addToSet: { practicedQuestions: question._id }
//         },
//         { upsert: true, new: true }
//     );

//     return res.status(200).json({ result, feedback });
// });

// ---------------------- reorder_paragraphs ----------------------
module.exports.addReOrderParagraphs = asyncWrapper(async (req, res) => {
    const newData = req.body;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if (newData.type != 'reading' || newData.subtype != 'reorder_paragraphs') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    const newQuestion = await validateAndSaveQuestion(reorderParagraphsSchemaValidator, newData, req.user._id, 'reorder_paragraphs');
    res.status(200).json({ data: newQuestion });
});

module.exports.editReorderParagraphs = asyncWrapper(async (req, res) => {
    const newData = req.body.newData;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if ((newData.type && newData.type != 'reading') || (newData.subtype && newData.subtype != 'reorder_paragraphs')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    const updatedQuestion = await validateAndUpdateQuestion(EditReorderParagraphsSchemaValidator, req.body.questionId, newData);
    res.status(200).json({ message: "Question Updated Successfully", updatedQuestion });
});

module.exports.getReorderParagraphs = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if(!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'reorder_paragraphs', page, limit, req, res);
});


module.exports.getAReorderParagraph = asyncWrapper(async (req, res) => {
    const { questionId } = req.params;
    const question = await Question.findById(questionId).lean();

    if (!question) {
        throw new ExpressError(404, "Question not found!");
    }

    // Fisher-Yates Shuffle function to randomize the options
    const shuffleArray = (array) => {
        let shuffledArray = array.slice();
        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
        }
        return shuffledArray;
    };

    const randomizedOptions = shuffleArray(question.options);
    res.status(200).json({
        data: { ...question, options: randomizedOptions }
    });
});

module.exports.reorderParagraphsResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;

    const userId = req.user._id;
    const result = await evaluateReorderParagraphsResult({userId, questionId, answer});

    res.status(200).json(result);
});
// module.exports.reorderParagraphsResult = asyncWrapper(async (req, res) => {
//     const { questionId, userReorderedOptions } = req.body;
//     const question = await Question.findById(questionId).lean();

//     if (!question || question.subtype !== 'reorder_paragraphs') {
//         throw new ExpressError(404, "Question not found or invalid type");
//     }

//     const correctAnswers = question.options;
//     let score = 0;

//     userReorderedOptions.forEach((userAnswer, index) => {
//         if (userAnswer === correctAnswers[index]) {
//             score++;
//         }
//     });

//     const totalScore = (score / correctAnswers.length) * 100;

//     await practicedModel.findOneAndUpdate(
//         {
//             user: req.user._id,
//             questionType: question.type,
//             subtype: question.subtype
//         },
//         {
//             $addToSet: { practicedQuestions: question._id }
//         },
//         { upsert: true, new: true }
//     );

//     return res.status(200).json({
//         score: totalScore,
//         message: `You scored ${score} out of ${correctAnswers.length} points.`,
//         userAnswer: userReorderedOptions,
//         correctAnswer: correctAnswers
//     });
// });


