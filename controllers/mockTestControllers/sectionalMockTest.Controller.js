const { sectionalMockTestSchemaValidator } = require("../../validations/schemaValidations");
const { asyncWrapper } = require("../../utils/AsyncWrapper");
const sectionalMockTestModel = require("../../models/sectionalMockTest.model");
const mockTestResultModel = require("../../models/mockTestResult.model");
const supscriptionModel = require("../../models/supscription.model");
const questionsModel = require("../../models/questions.model");
const { default: axios } = require("axios");
const { default: mongoose } = require("mongoose");
const practicedModel = require("../../models/practiced.model");
const fs = require('fs');

const subtypeApiUrls = {
    read_aloud: `${process.env.BACKENDURL}/test/speaking/read_aloud/result`,
    repeat_sentence: `${process.env.BACKENDURL}/test/speaking/repeat_sentence/result`,
    describe_image: `${process.env.BACKENDURL}/result/describe_image`,
    respond_to_situation: `${process.env.BACKENDURL}/test/speaking/respond-to-a-situation/result`,
    answer_short_question: `${process.env.BACKENDURL}/test/speaking/answer_short_question/result`,

    summarize_written_text: `${process.env.BACKENDURL}/test/writing/summerize-written-text/result`,
    write_email: `${process.env.BACKENDURL}/test/writing/write_email/result`,

    rw_fill_in_the_blanks: `${process.env.BACKENDURL}/result/rw_fill_in_the_blanks`,
    mcq_multiple: `${process.env.BACKENDURL}/test/reading/mcq_multiple/result`,
    reorder_paragraphs: `${process.env.BACKENDURL}/test/reading/reorder-paragraphs/result`,
    reading_fill_in_the_blanks: `${process.env.BACKENDURL}/test/reading/reading-fill-in-the-blanks/result`,
    mcq_single: `${process.env.BACKENDURL}/test/reading/mcq_single/result`,

    summarize_spoken_text: `${process.env.BACKENDURL}/test/listening/summarize-spoken-text/result`,
    listening_fill_in_the_blanks: `${process.env.BACKENDURL}/test/listening/listening-fill-in-the-blanks/result`,
    listening_multiple_choice_multiple_answers: `${process.env.BACKENDURL}/test/listening/multiple-choice-multiple-answers/result`,
    listening_multiple_choice_single_answers: `${process.env.BACKENDURL}/test/listening/multiple-choice-single-answers/result`
};

module.exports.addSectionalMockTest = asyncWrapper(async (req, res) => {
    const { error, value } = sectionalMockTestSchemaValidator.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    const { type, name, duration, questions } = value;

    // Create a new sectional mock test
    const sectionalMockTest = await sectionalMockTestModel.create({
        type,
        name,
        duration,
        questions,
        createdBy: req.user._id
    });

    return res.status(201).json({ message: 'Sectional Mock Test created successfully', sectionalMockTest });
})

module.exports.getAllSectionalMockTest = asyncWrapper(async (req, res) => {
    const { type } = req.params;
    if (!type) {
        return res.status(400).json({ message: 'Type is required' });
    }
    const sectionalMockTests = await sectionalMockTestModel.find({ type }, { name: 1, duration: 1 }).sort({ createdAt: -1 });

    const totalCount = await sectionalMockTestModel.countDocuments();
    if (!sectionalMockTests || sectionalMockTests.length === 0) {
        return res.status(404).json({ message: 'No sectional mock tests found for this type' });
    }

    return res.status(200).json({ message: 'Sectional Mock Tests retrieved successfully', totalCount, sectionalMockTests });
})

module.exports.getSingleSectionalMockTest = async (req, res) => {
    const { id } = req.params;
    try {
        const mockTest = await sectionalMockTestModel.findById(id).populate("questions");
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

module.exports.deleteSectionalMockTest = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }
    const sectionalMockTest = await sectionalMockTestModel.findByIdAndDelete(id);
    if (!sectionalMockTest) {
        return res.status(404).json({ message: 'Sectional Mock Test not found' });
    }

    return res.status(200).json({ message: 'Sectional Mock Test deleted successfully', sectionalMockTest });
})

module.exports.mockTestResult = async (req, res, next) => {
    const userId = req.user?._id;
    try {
        const { questionId, mockTestId } = req.body;

        console.log("User id is : ", userId);
        

        console.log(req.body);
        // console.log(req.file.size);
        
        if(req.file){
            console.log(req.file.path);
            
        }

        if (!questionId || !mockTestId)
            throw new ExpressError(400, 'questionId and mockTestId are required');

        const question = await questionsModel.findById(questionId).lean();
        if (!question) throw new ExpressError(404, 'Invalid questionId or question not found');

        const mockTest = await sectionalMockTestModel.findById(mockTestId).lean();
        if (!mockTest) throw new ExpressError(404, 'Invalid mockTestId or mock test not found');

        const isQuestionInMockTest = mockTest.questions.some(qId => qId.toString() === questionId);
        if (!isQuestionInMockTest)
            throw new ExpressError(400, 'This question does not belong to the specified mock test');

        const apiUrl = subtypeApiUrls[question.subtype];
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

        const subscription = await supscriptionModel.findOne({
            user: userId,
            isActive: true
        });

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Active subscription not found" });
        }

        if (subscription.mockTestLimit > 0) {
            await supscriptionModel.findOneAndUpdate(
                { _id: subscription._id },
                {
                    $inc: {
                        credits: 1,
                    }
                }
            );
        } else {
            return res.status(403).json({ success: false, message: "Your mock test limit is 0" });
        }



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
            response = await axios.post(apiUrl, newData, {
                headers: {
                    Authorization: req.headers.authorization || '',
                },
            });
        }

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

        if (subscription.mockTestLimit > 0) {
            await supscriptionModel.findOneAndUpdate(
                { _id: subscription._id },
                {
                    $inc: {
                        credits: -1,
                    }
                }
            );
        } else {
            return res.status(403).json({ success: false, message: "Your mock test limit is 0" });
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
        { $addToSet: { completedSectionalTests: mockTestId } },
        { upsert: true }
    );


    res.status(200).json({
        success: true,
        data: formattedResult,
    });
});