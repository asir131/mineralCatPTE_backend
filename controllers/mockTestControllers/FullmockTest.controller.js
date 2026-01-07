const FullmockTestSchema = require("../../models/mock_test.model");
const { mockTestSchemaValidator } = require("../../validations/schemaValidations");
const questionsModel = require("../../models/questions.model");
const { default: axios } = require("axios");
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const ExpressError = require("../../utils/ExpressError");
const mockTestResultModel = require("../../models/mockTestResult.model");
const { asyncWrapper } = require("../../utils/AsyncWrapper");
const { default: mongoose } = require("mongoose");
const practicedModel = require("../../models/practiced.model");
const supscriptionModel = require("../../models/supscription.model");
const { log } = require("console");

const BACKENDURL = process.env.BACKENDURL;

const subtypeApiUrls = {
    read_aloud: `${BACKENDURL}/test/speaking/read_aloud/result`,
    repeat_sentence: `${BACKENDURL}/test/speaking/repeat_sentence/result`,
    describe_image: `${BACKENDURL}/result/describe_image`,
    respond_to_situation: `${BACKENDURL}/test/speaking/respond-to-a-situation/result`,
    answer_short_question: `${BACKENDURL}/test/speaking/answer_short_question/result`,

    summarize_written_text: `${BACKENDURL}/test/writing/summerize-written-text/result`,
    write_email: `${BACKENDURL}/test/writing/write_email/result`,

    rw_fill_in_the_blanks: `${BACKENDURL}/result/rw_fill_in_the_blanks`,
    mcq_multiple: `${BACKENDURL}/test/reading/mcq_multiple/result`,
    reorder_paragraphs: `${BACKENDURL}/test/reading/reorder-paragraphs/result`,
    reading_fill_in_the_blanks: `${BACKENDURL}/test/reading/reading-fill-in-the-blanks/result`,
    mcq_single: `${BACKENDURL}/test/reading/mcq_single/result`,

    summarize_spoken_text: `${BACKENDURL}/test/listening/summarize-spoken-text/result`,
    listening_fill_in_the_blanks: `${BACKENDURL}/test/listening/listening-fill-in-the-blanks/result`,
    listening_multiple_choice_multiple_answers: `${BACKENDURL}/test/listening/multiple-choice-multiple-answers/result`,
    listening_multiple_choice_single_answers: `${BACKENDURL}/test/listening/multiple-choice-single-answers/result`
};

module.exports.addMockTest = async (req, res) => {

    const { error, value } = mockTestSchemaValidator.validate(req.body);
    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }
    const { name, duration: { hours, minutes }, questions } = value;
    const userId = req.user._id;

    const newMockTest = await FullmockTestSchema.create({
        name,
        duration: {
            hours,
            minutes
        },
        questions,
        createdBy: userId
    });

    if (!newMockTest) {
        return res.status(500).json({
            success: false,
            message: "Failed to create mock test"
        });
    }
    return res.status(201).json({
        success: true,
        message: "Mock test created successfully",
        data: newMockTest
    });
}


module.exports.getSingleMockTest = async (req, res) => {
    const { id } = req.params;
    try {
        const mockTest = await FullmockTestSchema.findById(id).populate("questions");
        console.log(mockTest);

        if (!mockTest) {
            return res.status(404).json({ message: "Mock test not found" });
        }
        res.status(200).json(mockTest);
    } catch (error) {
        console.error("Error fetching mock test:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


module.exports.updateMockTest = async (req, res) => {
    const { id } = req.params;
    const { name, duration: { hours, minutes } } = req.body;

    try {
        const updatedMockTest = await FullmockTestSchema.findByIdAndUpdate(
            id,
            {
                name,
                duration: {
                    hours,
                    minutes
                }
            },
            { new: true }
        );

        if (!updatedMockTest) {
            return res.status(404).json({ message: "Mock test not found" });
        }

        res.status(200).json(updatedMockTest);
    } catch (error) {
        console.error("Error updating mock test:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


module.exports.deleteMockTest = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedMockTest = await FullmockTestSchema.findByIdAndDelete(id);

        if (!deletedMockTest) {
            return res.status(404).json({ message: "Mock test not found" });
        }

        res.status(200).json({ message: "Mock test deleted successfully" });
    } catch (error) {
        console.error("Error deleting mock test:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


module.exports.getAllMockTests = async (req, res) => {
    try {
        const FullmockTests = await FullmockTestSchema.find({}, { name: 1, duration: 1 })
            .sort({ createdAt: -1 });

        const totalCount = await FullmockTestSchema.countDocuments();

        res.status(200).json({
            totalCount,
            FullmockTests
        });
    } catch (error) {
        console.error("Error fetching mock tests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports.mockTestResult = async (req, res, next) => {
    const userId = req.user?._id;
    let creditsDeducted = false;
    try {
        const { questionId, mockTestId } = req.body;

        console.log("User id is : ", userId);
        

        console.log(req.body);
        // console.log(req.file.size);
        
        if(req.file){
            console.log(req.file.path);
            
        }

        console.log("Hello 1");
        

        if (!questionId || !mockTestId)
            throw new ExpressError(400, 'questionId and mockTestId are required');

        console.log("Hello 2");
        const question = await questionsModel.findById(questionId).lean();
        console.log("Hello 3");
        if (!question) throw new ExpressError(404, 'Invalid questionId or question not found');

        const mockTest = await FullmockTestSchema.findById(mockTestId).lean();
        if (!mockTest) throw new ExpressError(404, 'Invalid mockTestId or mock test not found');

        const isQuestionInMockTest = mockTest.questions.some(qId => qId.toString() === questionId);
        if (!isQuestionInMockTest)
            throw new ExpressError(400, 'This question does not belong to the specified mock test');

        const apiUrl = subtypeApiUrls[question.subtype];
        console.log(apiUrl);
        
        if (!apiUrl) throw new ExpressError(400, 'Unsupported question subtype');

        const newData = { ...req.body };
        for (let key in newData) {
            if (
                typeof newData[key] === 'string' &&
                newData[key].startsWith('[') &&
                newData[key].endsWith(']')
            ) {
                try {
                    newData[key] = JSON.parse(newData[key]);
                } catch (e) {
                    console.warn(`Failed to parse ${key} as JSON array`);
                }
            }
        }

        console.log("Hello 4");
        

        const subscription = await supscriptionModel.findOne({
            user: userId,
            isActive: true
        });

        console.log("Hello 5");

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Active subscription not found" });
        }

        console.log("Hello 6");

        if (subscription.credits > 0) {
            await supscriptionModel.findOneAndUpdate(
                { _id: subscription._id },
                {
                    $inc: {
                        credits: -1,
                    }
                }
            );
            creditsDeducted = true;
        } else {
            return res.status(403).json({ success: false, message: "Your AI credits are 0" });
        }

        console.log("Hello 7");


        let response;
        if (req.file) {
            const form = new FormData();
            for (const key in newData) {
                form.append(key, typeof newData[key] === 'object' ? JSON.stringify(newData[key]) : newData[key]);
            }
            form.append('voice', fs.createReadStream(req.file.path));

            response = await axios.post(apiUrl, form, {
                headers: {
                    ...form.getHeaders(),
                    Authorization: req.headers.authorization || '',
                },
            });

            fs.unlink(req.file.path, err => {
                if (err) console.warn('Failed to delete file:', err);
            });
        } else {
            console.log(newData);
            
            response = await axios.post(apiUrl, newData, {
                headers: {
                    Authorization: req.headers.authorization || '',
                },
            });
            console.log("response is : ", response.data);
            if (response.data.error) {
                return res.status(400).json({ success: false, message: response.data.error });
            }
        }

        console.log("Hello 8");

        const scoreData = response.data;
        const subtype = question.subtype;
        console.log(subtype);

        let score = 0;

        if (subtype === 'read_aloud') {
            const speaking = scoreData.data.speakingScore || 0;
            const reading = scoreData.data.readingScore || 0;
            score = Math.round(((speaking + (reading * 100)) / 2));
        }
        else if (subtype === 'repeat_sentence') {
            if (scoreData && scoreData.pronunciation && typeof scoreData.pronunciation === 'number') {
                score = scoreData.pronunciation;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in summarize_written_text response");
            }
        } else if (subtype === 'respond_to_situation') {
            const speaking = scoreData.data.speakingScore || 0;
            const fluency = scoreData.data.fluency || 0;
            const pronunciation = scoreData.data.pronunciation || 0;

            score = Math.round((speaking + fluency + pronunciation) / 3);
        }
        else if (subtype === 'answer_short_question') {
            const result = scoreData?.result;

            if (result) {
                const speaking = result.Speaking ?? 0;
                const listening = result.Listening ?? 0;

                score = ((speaking + listening) / 2) * 100;
                score = Math.round(score);
            } else {
                score = 0;
            }
        } else if (subtype === 'summarize_written_text') {

            if (scoreData && scoreData.score && typeof scoreData.score === 'number') {
                score = scoreData.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in summarize_written_text response");
            }
        }

        else if (subtype === 'write_email') {
            if (scoreData && scoreData.score && typeof scoreData.score === 'number') {
                score = scoreData.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in write_email response");
            }
        } else if (subtype === 'mcq_multiple') {

            if (scoreData && scoreData.score && typeof scoreData.score === 'number') {
                score = scoreData.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in mcq_multiple response");
            }
        } else if (subtype === 'reorder_paragraphs') {

            if (scoreData && scoreData.score && typeof scoreData.score === 'number') {
                score = scoreData.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in reorder_paragraphs response");
            }
        } else if (subtype === 'reading_fill_in_the_blanks') {
            if (scoreData && scoreData.result.score && typeof scoreData.result.score === 'number') {
                score = scoreData.result.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in reading_fill_in_the_blanks response");
            }
        } else if (subtype === 'mcq_single') {

            if (scoreData && scoreData.score && typeof scoreData.score === 'number') {
                score = scoreData.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in mcq_single response");
            }
        } else if (subtype === 'summarize_spoken_text') {
            if (scoreData && scoreData.summarize_text_score.total_score && typeof scoreData.summarize_text_score.total_score === 'number') {
                score = scoreData.summarize_text_score.total_score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in summarize_spoken_text response");
            }
        } else if (subtype === 'listening_fill_in_the_blanks') {
            console.log("Hello");
            
            if (scoreData && scoreData.result.score && typeof scoreData.result.score === 'number') {
                score = scoreData.result.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in listening_fill_in_the_blanks response");
            }
        } else if (subtype === 'listening_multiple_choice_multiple_answers') {
            if (scoreData && scoreData.result.score && typeof scoreData.result.score === 'number') {
                score = scoreData.result.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in listening_multiple_choice_multiple_answers response");
            }
        } else if (subtype === 'listening_multiple_choice_single_answers') {
            if (scoreData && scoreData.result.score && typeof scoreData.result.score === 'number') {
                score = scoreData.result.score;
                console.log("Extracted score:", score);
            } else {
                console.warn("No score found in listening_multiple_choice_single_answers response");
            }
        } else {
            console.warn("Unhandled subtype:", subtype);
        }

        // Save to DB (example)
        let mockTestResult = await mockTestResultModel.findOne({ user: userId, mockTest: mockTestId });

        const attempt = {
            questionId,
            questionSubtype: question.subtype,
            score,
            submittedAt: new Date(),
        };

        if (!mockTestResult) {
            // Create new doc with first result entry
            mockTestResult = await mockTestResultModel.create({
                user: userId,
                mockTest: mockTestId,
                results: [
                    {
                        type: question.type,
                        averageScore: score,
                        attempts: [attempt],
                    },
                ],
            });
        } else {
            // Check if a result entry for this question type exists
            const existingResult = mockTestResult.results.find(r => r.type === question.type);
            if (existingResult) {
                existingResult.attempts.push(attempt);
                // Recalculate averageScore
                const total = existingResult.attempts.reduce((acc, a) => acc + a.score, 0);
                existingResult.averageScore = total / existingResult.attempts.length;
            } else {
                // Add new result entry for this type
                mockTestResult.results.push({
                    type: question.type,
                    averageScore: score,
                    attempts: [attempt],
                });
            }
            await mockTestResult.save();
        }

        return res.status(200).json({
            success: true,
            data: scoreData,
            score,
        });
    } catch (error) {
        const subscription = await supscriptionModel.findOne({
            user: userId,
            isActive: true
        });

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Active subscription not found" });
        }

        if (creditsDeducted) {
            await supscriptionModel.findOneAndUpdate(
                { _id: subscription._id },
                {
                    $inc: {
                        credits: 1,
                    }
                }
            );
        }
        next(error);
    }
};



module.exports.getFormattedMockTestResult = asyncWrapper(async (req, res) => {
    const { mockTestId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(mockTestId)) {
        return res.status(400).json({ success: false, message: 'Invalid mock test ID' });
    }

    const mockTestResultDoc = await mockTestResultModel.findOne({ mockTest: mockTestId, user: userId });

    if (!mockTestResultDoc) {
        return res.status(404).json({ success: false, message: 'Mock test result not found' });
    }

    const results = mockTestResultDoc.results;

    const getScore = (type) => {
        const result = results.find(r => r.type === type);
        return result ? result.averageScore || 0 : 0;
    };

    const speaking = getScore('speaking');
    const listening = getScore('listening');
    const reading = getScore('reading');
    const writing = getScore('writing');

    const sectionScores = [speaking, listening, reading, writing];
    const nonZeroScores = sectionScores.filter(score => score > 0);

    const totalScore = nonZeroScores.length > 0
        ? Number((nonZeroScores.reduce((sum, s) => sum + s, 0) / nonZeroScores.length).toFixed(2))
        : 0;

    const formattedResult = {
        speaking,
        listening,
        reading,
        writing,
        totalScore,
        testDate: new Date().toISOString()
    };

    await practicedModel.updateOne(
        { user: userId },
        { $addToSet: { completedMockTests: mockTestId } },
        { upsert: true }
    );


    res.status(200).json({
        success: true,
        data: formattedResult,
    });
});
