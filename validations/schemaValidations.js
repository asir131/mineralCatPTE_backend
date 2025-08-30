const { text } = require('body-parser');
const Joi = require('joi');

module.exports.userSchemaValidator = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
})

module.exports.LoginFormValidator = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
})

module.exports.subscriptionSchemaValidator = Joi.object({
    user: Joi.string().required(),
    planType: Joi.string().valid('free', 'premium').required(),
    isActive: Joi.boolean().default(false),
    mockTestLimit: Joi.number().min(0).default(1),
    aiScoringLimit: Joi.number().min(0).default(5),
    sectionalMockTestLimit: Joi.number().min(0).default(1),
    cyoMockTestLimit: Joi.number().min(0).default(1),
    templates: Joi.number().min(0).default(5),
    studyPlan: Joi.string().valid('authorized', 'unauthorized').required(),
    performanceProgressDetailed: Joi.string().valid('authorized', 'unauthorized').required(),
    startedAt: Joi.date().default(() => new Date()),
    expiresAt: Joi.date().required(),
    paymentInfo: Joi.object({
        transactionId: Joi.string().required(),
        provider: Joi.string().required(),
        amount: Joi.number().required(),
        currency: Joi.string().required()
    }).required()
});

module.exports.FillInTheBlanksQuestionSchemaValidator = Joi.object({
    type: Joi.string().required(),
    subtype: Joi.string().required(),
    heading: Joi.string().required(),
    prompt: Joi.string().required(),
    blanks: Joi.array().required(),
})
module.exports.EditFillInTheBlanksQuestionSchemaValidator = Joi.object({
    type: Joi.string().optional(),
    subtype: Joi.string().optional(),
    heading: Joi.string().optional(),
    prompt: Joi.string().optional(),
    blanks: Joi.array().optional(),
})


module.exports.mcqMultipleSchemaValidator = Joi.object({
    type: Joi.string().required(),
    subtype: Joi.string().required(),
    heading: Joi.string().required(),
    prompt: Joi.string().required(),
    text: Joi.string().required(),
    options: Joi.array().required(),
    correctAnswers: Joi.array().required(),
})
module.exports.editmcqMultipleSchemaValidator = Joi.object({
    type: Joi.string().optional(),
    subtype: Joi.string().optional(),
    heading: Joi.string().optional(),
    prompt: Joi.string().optional(),
    text: Joi.string().optional(),
    options: Joi.array().optional(),
    correctAnswers: Joi.array().optional(),
})

module.exports.mcqSingleSchemaValidator = Joi.object({
    type: Joi.string().required(),
    subtype: Joi.string().required(),
    heading: Joi.string().required(),
    prompt: Joi.string().required(),
    text: Joi.string().required(),
    options: Joi.array().required(),
    correctAnswers: Joi.array().required(),
})
module.exports.EditmcqSingleSchemaValidator = Joi.object({
    type: Joi.string().optional(),
    subtype: Joi.string().optional(),
    heading: Joi.string().optional(),
    prompt: Joi.string().optional(),
    text: Joi.string().optional(),
    options: Joi.array().optional(),
    correctAnswers: Joi.array().optional(),
})
module.exports.EditmcqMultipleSchemaValidator = Joi.object({
    type: Joi.string().optional(),
    subtype: Joi.string().optional(),
    heading: Joi.string().optional(),
    prompt: Joi.string().optional(),
    text: Joi.string().optional(),
    options: Joi.array().optional(),
    correctAnswers: Joi.array().optional(),
})




module.exports.readingFillInTheBlanksSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
        blanks: Joi.array()
            .items(
                Joi.object({
                    index: Joi.number().required(),
                    options: Joi.array().required(),
                    correctAnswer: Joi.string().required()
                })
            )
            .required(),
    }
)
module.exports.editReadingFillInTheBlanksSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
        blanks: Joi.array()
            .items(
                Joi.object({
                    index: Joi.number().required(),
                    options: Joi.array().required(),
                    correctAnswer: Joi.string().required()
                })
            )
            .optional(),
    }
)


module.exports.reorderParagraphsSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
        options: Joi.array().required(),
    }
)
module.exports.EditReorderParagraphsSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
        options: Joi.array().optional(),
    }
)


module.exports.addSummarizeTextSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
    }
)

module.exports.writeEmailSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
    }
)
module.exports.EditWriteEmailSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
    }
)


module.exports.summarizeSpokenTextSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
    }
)
module.exports.editSummarizeSpokenTextSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
    }
)


module.exports.addMultipleChoiceAndMultipleAnswersSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
        options: Joi.array().required(),
        correctAnswers: Joi.array().required(),
    }
)
module.exports.EditAddMultipleChoiceAndMultipleAnswersSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
        options: Joi.array().optional(),
        correctAnswers: Joi.array().optional(),
    }
)

module.exports.addListeningFillInTheBlanksSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
        blanks: Joi.array().required(),
    }
)
module.exports.EditListeningFillInTheBlanksSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
        blanks: Joi.array().optional(),
    }
)

module.exports.addMultipleChoiceSingleAnswerSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
        options: Joi.array().required(),
        correctAnswers: Joi.array().required(),
    }
)
module.exports.EditMultipleChoiceSingleAnswerSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
        options: Joi.array().optional(),
        correctAnswers: Joi.array().optional(),
    }
)



module.exports.readAloudSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
    }
)
module.exports.editreadAloudSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
    }
)
module.exports.repeatSentenceSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
    }
)
module.exports.editrepeatSentenceSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
    }
)


module.exports.respondToASituationSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
        prompt: Joi.string().required(),
    }
)
module.exports.editrespondToASituationSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
        prompt: Joi.string().optional(),
    }
)


module.exports.answerShortQuestionSchemaValidator = Joi.object(
    {
        type: Joi.string().required(),
        subtype: Joi.string().required(),
        heading: Joi.string().required(),
    }
)

module.exports.editanswerShortQuestionSchemaValidator = Joi.object(
    {
        type: Joi.string().optional(),
        subtype: Joi.string().optional(),
        heading: Joi.string().optional(),
    }
)



module.exports.mockTestSchemaValidator = Joi.object({
    name: Joi.string().required(),
    duration: Joi.object({
        hours: Joi.number().required(),
        minutes: Joi.number().required()
    }).required(),
    questions: Joi.array().required()
})


module.exports.sectionalMockTestSchemaValidator = Joi.object({
    type: Joi.string().valid('speaking', 'writing', 'reading', 'listening').required(),
    name: Joi.string().required(),
    duration: Joi.object({
        hours: Joi.number().required(),
        minutes: Joi.number().required()
    }).required(),
    questions: Joi.array().required()
})




module.exports.readAloudResultSchemaValidator = Joi.object({
    
})