const cloudinary = require('../../middleware/cloudinary.config');
const path = require('path');
const ExpressError = require('../../utils/ExpressError');
const fs = require('node:fs');
const questionsModel = require("../../models/questions.model");
const { summarizeSpokenTextSchemaValidator, addMultipleChoiceAndMultipleAnswersSchemaValidator, addListeningFillInTheBlanksSchemaValidator, addMultipleChoiceSingleAnswerSchemaValidator, editSummarizeSpokenTextSchemaValidator, EditAddMultipleChoiceAndMultipleAnswersSchemaValidator, EditListeningFillInTheBlanksSchemaValidator, EditMultipleChoiceSingleAnswerSchemaValidator } = require('../../validations/schemaValidations');
const { asyncWrapper } = require("../../utils/AsyncWrapper");
const https = require('https');
const axios = require('axios');
const { OpenAI } = require('openai');
const practicedModel = require('../../models/practiced.model');
const { getQuestionByQuery } = require('../../common/getQuestionFunction');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// helper functions

const scoreWithChatGPT = async (originalTranscript, userSummary) => {
    try {
        const prompt = `
You are an expert English language assessor for PTE (Pearson Test of English) Academic's "Summarize Written Text" task.

TASK: Evaluate how well the user's summary captures the key information from the original text.

ORIGINAL TEXT:
"${originalTranscript}"

USER'S SUMMARY:
"${userSummary}"

SCORING CRITERIA (Total: 10 points):
1. Content (0-2 points): How well does the summary capture the main ideas and key supporting points?
2. Form (0-2 points): Is it a single sentence between 5-75 words?
3. Grammar (0-2 points): Are there grammatical errors?
4. Vocabulary (0-2 points): Is the vocabulary appropriate and accurate?
5. Coherence (0-2 points): Does the summary flow logically and connect ideas well?

Please provide:
1. Individual scores for each criterion (0-2 points each)
2. Total score out of 10
3. Brief feedback explaining the strengths and areas for improvement
4. Word count of the summary

Format your response as JSON:
{
  "scores": {
    "content": 0-2,
    "form": 0-2,
    "grammar": 0-2,
    "vocabulary": 0-2,
    "coherence": 0-2
  },
  "total_score": 0-10,
  "word_count": number,
  "feedback": {
    "strengths": "...",
    "improvements": "...",
    "overall": "..."
  }
}
`;

        // Request configuration to OpenAI GPT
        const response = await openai.chat.completions.create({
            model: "gpt-4",  // Use GPT-4 model
            messages: [
                { role: "system", content: "You are an expert PTE Academic assessor specializing in the 'Summarize Written Text' task. Provide accurate, fair, and constructive assessments." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('Error calling ChatGPT:', error);
        throw new Error('Failed to get ChatGPT assessment: ' + error.message);
    }
};

// --------------------------summarization spoken text-------------------------
module.exports.addSummarizeSpokenText = asyncWrapper(async (req, res) => {

    const newData = req.body;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if (newData.type != 'listening' || newData.subtype != 'summarize_spoken_text') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }


    if (req.file === undefined) throw new ExpressError(400, 'Please upload a file');

    const { error, value } = summarizeSpokenTextSchemaValidator.validate(newData);

    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }

    const { type = 'listening', subtype = 'summarize_spoken_text', heading } = value;

    const folderName = 'summarizeSpokenText';

    const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        folder: `listening_test/${folderName}`,
        type: 'authenticated',
    })

    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: 'whisper-1',
        response_format: 'text',
    });
    const ConvertedText = transcription;

    fs.unlinkSync(req.file.path);

    const data = {
        type,
        subtype,
        heading,
        audioUrl: result.secure_url,
        audioConvertedText: ConvertedText,
        createdBy: req.user._id
    };

    const newQuestion = await questionsModel.create(data)

    res.status(200).json(newQuestion);
})

module.exports.editSummarizeSpokenText = asyncWrapper(async (req, res) => {
    const newData = req.body;

    if (!newData) {
        throw new ExpressError(400, "New data is required");
    }

    if ((newData.type && newData.type != 'listening') || (newData.subtype && newData.subtype != 'summarize_spoken_text')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    const { questionId, ...data } = newData;

    if (!questionId) throw new ExpressError(400, "Question ID is required");

    // Validate incoming data (excluding questionId)
    const { error, value } = editSummarizeSpokenTextSchemaValidator.validate(data);
    if (error) throw new ExpressError(400, error.details[0].message);

    if (req.file !== undefined) {
        const folderName = 'summarizeSpokenText';

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'auto',
            public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            folder: `listening_test/${folderName}`,
            type: 'authenticated',
        });

        // Get transcription from Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: 'whisper-1',
            response_format: 'text',
        });

        fs.unlinkSync(req.file.path); // Clean up temp file

        value.audioUrl = result.secure_url;
        value.audioConvertedText = transcription; // Update audioConvertedText field
    }

    const question = await questionsModel.findByIdAndUpdate(questionId, value, { new: true });
    if (!question) throw new ExpressError(404, 'Question not found');

    res.status(200).json({
        message: "Question updated successfully",
        question: question,
    });
});

module.exports.getAllSummarizeSpokenText = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if (!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'summarize_spoken_text', page, limit, req, res);
});



module.exports.summerizeSpokenTextResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;
    

    if (!questionId || !answer) {
        return res.status(400).json({ message: 'questionId and answer are required.' });
    }

    try {
        const question = await questionsModel.findById(questionId);
        if (!question) {
            throw new ExpressError(404, 'Question not found!');
        }

        if (question.subtype !== 'summarize_spoken_text') {
            throw new ExpressError(401, "this is not valid questionType for this route!")
        }

        const originalTranscript = question.audioConvertedText;;
        if (!originalTranscript) {
            throw new Error('Could not extract transcript from API response');
        }

        const chatGPTAssessment = await scoreWithChatGPT(originalTranscript, answer);

        const finalResult = {

            original_transcript: originalTranscript,
            user_summary: answer,

            summarize_text_score: chatGPTAssessment,

            summary: {
                // pronunciation_score: apiResponse.data.pronunciation?.overall_score || 0,
                // fluency_score: apiResponse.data.fluency?.overall_score || 0,
                // grammar_score: apiResponse.data.grammar?.overall_score || 0,
                // vocabulary_score: apiResponse.data.vocabulary?.overall_score || 0,
                // overall_language_score: apiResponse.data.overall?.overall_score || 0,
                summary_quality_score: chatGPTAssessment.total_score,
                combined_assessment: {
                    summary_writing_ability: `${chatGPTAssessment.total_score}/10`
                }
            }
        };

        await practicedModel.findOneAndUpdate(
            {
                user: req.user._id,
                questionType: question.type,
                subtype: question.subtype
            },
            {
                $addToSet: { practicedQuestions: question._id }
            },
            { upsert: true, new: true }
        );


        return res.status(200).json(finalResult);

    } catch (error) {
        console.error('Error during audio processing:', error);

        if (error.response) {
            console.error('API Response Status:', error.response.status);
            console.error('API Response Data:', error.response.data);

            return res.status(error.response.status).json({
                message: 'API request failed',
                details: error.response.data,
                status: error.response.status
            });
        } else {
            return res.status(500).json({
                message: 'Error processing request',
                details: error.message
            });
        }
    }
});
// --------------------------multiple choice and multiple answers---------------

module.exports.addMultipleChoicesAndMultipleAnswers = asyncWrapper(async (req, res) => {

    if (req.file === undefined) throw new ExpressError(400, 'Please upload a file');

    if (req.body.type != 'listening' || req.body.subtype != 'listening_multiple_choice_multiple_answers') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    if (typeof req.body.options === 'string' || typeof req.body.correctAnswers === 'string') {
        req.body.options = JSON.parse(req.body.options);
        req.body.correctAnswers = JSON.parse(req.body.correctAnswers);
    }
    const { error, value } = addMultipleChoiceAndMultipleAnswersSchemaValidator.validate(req.body);

    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }

    const { type = 'listening', subtype = 'listening_multiple_choice_multiple_answers', heading, prompt, options, correctAnswers } = value;

    const folderName = 'multiplechoicesmultipleanswers';

    const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        folder: `listening_test/${folderName}`,
        type: 'authenticated',
    })

    fs.unlinkSync(req.file.path);

    const data = {
        type,
        subtype,
        heading,
        prompt,
        options,
        correctAnswers,
        audioUrl: result.secure_url,
        createdBy: req.user._id
    };

    const newQuestion = await questionsModel.create(data)

    res.status(200).json(newQuestion);
})

module.exports.editMultipleChoicesAndMultipleAnswers = asyncWrapper(async (req, res) => {

    if ((req.body.type && req.body.type != 'listening') || (req.body.subtype && req.body.subtype != 'listening_multiple_choice_multiple_answers')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    if (typeof req.body.options === 'string' || typeof req.body.correctAnswers === 'string') {
        req.body.options = JSON.parse(req.body.options);
        req.body.correctAnswers = JSON.parse(req.body.correctAnswers);
    }
    const { questionId, ...data } = req.body;

    const { error, value } = EditAddMultipleChoiceAndMultipleAnswersSchemaValidator.validate(data);
    if (error) throw new ExpressError(400, error.details[0].message);

    if (!questionId) throw new ExpressError(400, "Question ID is required");

    if (req.file !== undefined) {
        const folderName = 'multiplechoicesmultipleanswers';
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'auto',
            public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            folder: `listening_test/${folderName}`,
            type: 'authenticated',
        })

        fs.unlinkSync(req.file.path);
        value.audioUrl = result.secure_url;
    }
    const question = await questionsModel.findByIdAndUpdate(questionId, value, { new: true });
    if (!question) throw new ExpressError(404, 'Question not found');


    res.status(200).json({
        message: "Question updated successfully",
        question: question,
    });
})

module.exports.getAllMultipleChoicesAndMultipleAnswers = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if (!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'listening_multiple_choice_multiple_answers', page, limit, req, res);
});

module.exports.multipleChoicesAndMultipleAnswersResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;

    const question = await questionsModel.findById(questionId);
    if (!question) {
        throw new ExpressError(404, "Question Not Found!");
    }
    if (question.subtype !== 'listening_multiple_choice_multiple_answers') {
        throw new ExpressError(401, "this is not valid questionType for this route!")
    }

    const correctAnswers = question.correctAnswers;
    let score = 0;

    answer.forEach((userAnswer) => {
        if (correctAnswers.includes(userAnswer)) {
            score++;
        }
    });

    const result = {
        score,
        totalCorrectAnswers: correctAnswers.length,
        correctAnswersGiven: score === correctAnswers.length,
    };

    const feedback = `You scored ${score} out of ${correctAnswers.length}.`;

    await practicedModel.findOneAndUpdate(
        {
            user: req.user._id,
            questionType: question.type,
            subtype: question.subtype
        },
        {
            $addToSet: { practicedQuestions: question._id }
        },
        { upsert: true, new: true }
    );

    return res.status(200).json({
        result,
        feedback,
    });
})

// --------------------------listening fill in the blanks-----------------
module.exports.addListeningFillInTheBlanks = asyncWrapper(async (req, res) => {
    if (req.file === undefined) throw new ExpressError(400, 'Please upload a file');

    if (req.body.type != 'listening' || req.body.subtype != 'listening_fill_in_the_blanks') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    if (typeof req.body.blanks === 'string') {
        req.body.blanks = JSON.parse(req.body.blanks);
    }

    const { error, value } = addListeningFillInTheBlanksSchemaValidator.validate(req.body);
    if (error) throw new ExpressError(400, error.details[0].message);

    const { type = 'listening', subtype = 'listening_fill_in_the_blanks', heading, prompt, blanks } = value;

    const folderName = 'listeningfillintheblanks';

    const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        folder: `listening_test/${folderName}`,
        type: 'authenticated',
    });

    fs.unlinkSync(req.file.path);

    const data = {
        type,
        subtype,
        heading,
        prompt,
        blanks,
        audioUrl: result.secure_url,
        createdBy: req.user._id
    };

    const newQuestion = await questionsModel.create(data);

    res.status(200).json(newQuestion);
});

module.exports.editListeningFillInTheBlanks = asyncWrapper(async (req, res) => {
    if ((req.body.type && req.body.type != 'listening') || (req.body.subtype && req.body.subtype != 'listening_fill_in_the_blanks')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    if (typeof req.body.blanks === 'string') {
        req.body.blanks = JSON.parse(req.body.blanks);
    }
    const { questionId, ...data } = req.body;

    const { error, value } = EditListeningFillInTheBlanksSchemaValidator.validate(data);
    if (error) throw new ExpressError(400, error.details[0].message);

    if (!questionId) throw new ExpressError(400, "Question ID is required");

    if (req.file !== undefined) {
        const folderName = 'listeningfillintheblanks';
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'auto',
            public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            folder: `listening_test/${folderName}`,
            type: 'authenticated',
        })

        fs.unlinkSync(req.file.path);
        value.audioUrl = result.secure_url;
    }
    const question = await questionsModel.findByIdAndUpdate(questionId, value, { new: true });
    if (!question) throw new ExpressError(404, 'Question not found');


    res.status(200).json({
        message: "Question updated successfully",
        question: question,
    });
})

module.exports.getAllListeningFillInTheBlanks = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if (!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'listening_fill_in_the_blanks', page, limit, req, res);
});


module.exports.listeningFillInTheBlanksResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;

    const question = await questionsModel.findById(questionId);
    if (!question) {
        throw new ExpressError(404, "Question Not Found!");
    }

    if (question.subtype !== 'listening_fill_in_the_blanks') {
        throw new ExpressError(401, "This is not a valid questionType for this route!");
    }

    const blanks = question.blanks;

    let score = 0;

    answer.forEach((userAnswer, index) => {
        const correctAnswer = blanks[index]?.correctAnswer;

        if (correctAnswer && correctAnswer === userAnswer) {
            score++;
        }
    });

    const result = {
        score,
        totalCorrectAnswers: blanks.length,
        correctAnswersGiven: score === blanks.length,
    };

    const feedback = `You scored ${score} out of ${blanks.length}.`;

    await practicedModel.findOneAndUpdate(
        {
            user: req.user._id,
            questionType: question.type,
            subtype: question.subtype
        },
        {
            $addToSet: { practicedQuestions: question._id }
        },
        { upsert: true, new: true }
    );


    return res.status(200).json({
        result,
        feedback,
    });
});


// --------------------------multiple choice single answers-----------------
module.exports.addMultipleChoiceSingleAnswers = asyncWrapper(async (req, res) => {
    if (req.file === undefined) throw new ExpressError(400, 'Please upload a file');

    // Add type/subtype validation
    if (req.body.type != 'listening' || req.body.subtype != 'listening_multiple_choice_single_answers') {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    if (typeof req.body.options === 'string' || typeof req.body.correctAnswers === 'string') {
        req.body.options = JSON.parse(req.body.options);
        req.body.correctAnswers = JSON.parse(req.body.correctAnswers);
    }
    const { error, value } = addMultipleChoiceSingleAnswerSchemaValidator.validate(req.body);
    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }
    const { type = 'listening', subtype = 'listening_multiple_choice_single_answers', heading, prompt, options, correctAnswers } = value;

    const folderName = 'multiplechoicesingleanswers';

    const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        folder: `listening_test/${folderName}`,
        type: 'authenticated',
    })

    fs.unlinkSync(req.file.path);

    const data = {
        type,
        subtype,
        heading,
        prompt,
        options,
        correctAnswers,
        audioUrl: result.secure_url,
        createdBy: req.user._id
    };

    const newQuestion = await questionsModel.create(data)

    res.status(200).json(newQuestion);
})


module.exports.editMultipleChoiceSingleAnswers = asyncWrapper(async (req, res) => {
    if ((req.body.type && req.body.type != 'listening') || (req.body.subtype && req.body.subtype != 'listening_multiple_choice_single_answers')) {
        throw new ExpressError(400, "question type or subtype is not valid!");
    }

    // Parse the options and correctAnswers if they are passed as strings
    if (typeof req.body.options === 'string' || typeof req.body.correctAnswers === 'string') {
        req.body.options = JSON.parse(req.body.options);
        req.body.correctAnswers = JSON.parse(req.body.correctAnswers);
    }

    const { questionId, ...data } = req.body;

    // Validate the data using the schema validator
    const { error, value } = EditMultipleChoiceSingleAnswerSchemaValidator.validate(data);
    if (error) throw new ExpressError(400, error.details[0].message);

    if (!questionId) throw new ExpressError(400, "Question ID is required");

    // Handle file upload (optional)
    if (req.file !== undefined) {
        const folderName = 'multiplechoicesingleanswers';
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'auto',
            public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            folder: `listening_test/${folderName}`,
            type: 'authenticated',
        });

        fs.unlinkSync(req.file.path);
        value.audioUrl = result.secure_url;
    }

    // Explicitly retain the 'heading' field in the update
    value.type = 'listening';
    value.subtype = 'listening_multiple_choice_single_answers';

    // Retrieve the question and update it
    const question = await questionsModel.findByIdAndUpdate(questionId, { $set: value }, { new: true });
    if (!question) throw new ExpressError(404, 'Question not found');

    // Respond with the updated question
    res.status(200).json({
        message: "Question updated successfully",
        updatedQuestion: question,
    });
});

module.exports.getAllMultipleChoiceSingleAnswers = asyncWrapper(async (req, res) => {
    let query = req.query.query;
    if (!query) query = 'all';
    const { page, limit } = req.query;

    getQuestionByQuery(query, 'listening_multiple_choice_single_answers', page, limit, req, res);
});


module.exports.multipleChoiceSingleAnswerResult = asyncWrapper(async (req, res) => {
    const { questionId, answer } = req.body;


    if (answer.length > 1) {
        throw new ExpressError(401, "multiple answer is not allowed!");
    }


    const question = await questionsModel.findById(questionId);
    if (!question) {
        throw new ExpressError(404, "Question Not Found!");
    }
    if (question.subtype !== 'listening_multiple_choice_single_answers') {
        throw new ExpressError(401, "this is not valid questionType for this route!")
    }

    const correctAnswers = question.correctAnswers;
    let score = 0;

    answer.forEach((userAnswer) => {
        if (correctAnswers.includes(userAnswer)) {
            score++;
        }
    });

    const result = {
        score,
        totalCorrectAnswers: correctAnswers.length,
        correctAnswersGiven: score === correctAnswers.length,
    };

    const feedback = `You scored ${score} out of ${correctAnswers.length}.`;

    await practicedModel.findOneAndUpdate(
        {
            user: req.user._id,
            questionType: question.type,
            subtype: question.subtype
        },
        {
            $addToSet: { practicedQuestions: question._id }
        },
        { upsert: true, new: true }
    );

    return res.status(200).json({
        result,
        feedback,
    });
})