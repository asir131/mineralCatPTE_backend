const questionModel = require('../../../models/questions.model');
const practicedModel = require('../../../models/practiced.model');
const ExpressError = require('../../../utils/ExpressError');
const path = require('path');
const fs = require('node:fs');
const { default: axios } = require("axios");
const fsPromises = require('fs').promises;
const { OpenAI } = require('openai');

async function evaluateMcqMultipleResult({ userId, questionId, answer }) {
  const question = await questionModel.findById(questionId).lean();

  if (!question || question.subtype !== 'mcq_multiple') {
    throw new ExpressError(404, "Question Not Found or Invalid Type");
  }

  const correctAnswers = question.correctAnswers;
  const score = answer.filter(a => correctAnswers.includes(a)).length;
  const feedback = `You scored ${score} out of ${correctAnswers.length}.`;

  await practicedModel.findOneAndUpdate(
    { user: userId, questionType: question.type, subtype: question.subtype },
    { $addToSet: { practicedQuestions: question._id } },
    { upsert: true, new: true }
  );

  return { score, feedback };
}

// MCQ Single result evaluator
async function evaluateMcqSingleResult({ userId, questionId, answer }) {
  
  const question = await questionModel.findById(questionId).lean();
  if (!question || question.subtype !== 'mcq_single') {
    throw new ExpressError(404, "Question not found or invalid type");
  }
  
  const isCorrect = question.correctAnswers.includes(answer);

  await practicedModel.findOneAndUpdate(
    { user: userId, questionType: question.type, subtype: question.subtype },
    { $addToSet: { practicedQuestions: question._id } },
    { upsert: true, new: true }
  );
  const score = isCorrect ? 1 : 0;

  return { isCorrect, message: isCorrect ? "Correct answer!" : "Incorrect answer!", score };
}

// Reading Fill in the Blanks result evaluator
async function evaluateReadingFillInTheBlanksResult({ userId, questionId, blanks }) {
  const question = await questionModel.findById(questionId).lean();
  if (!question || question.subtype !== 'reading_fill_in_the_blanks') {
    throw new ExpressError(404, "Question Not Found!");
  }

  let score = 0;
  const totalBlanks = question.blanks.length;

  blanks.forEach(userBlank => {
    const correctBlank = question.blanks.find(blank => blank.index === userBlank.index);
    if (correctBlank && userBlank.selectedAnswer === correctBlank.correctAnswer) {
      score++;
    }
  });

  const feedback = `You scored ${score} out of ${totalBlanks}.`;

  await practicedModel.findOneAndUpdate(
    { user: userId, questionType: question.type, subtype: question.subtype },
    { $addToSet: { practicedQuestions: question._id } },
    { upsert: true, new: true }
  );

  return { result: { score, totalBlanks }, feedback };
}

// Reorder Paragraphs result evaluator
async function evaluateReorderParagraphsResult({ userId, questionId, answer }) {
  const question = await questionModel.findById(questionId).lean();
  if (!question || question.subtype !== 'reorder_paragraphs') {
    throw new ExpressError(404, "Question not found or invalid type");
  }

  console.log(answer);
  
  const correctAnswers = question.options;
  let score = 0;

  answer.forEach((userAnswer, index) => {
    if (userAnswer === correctAnswers[index]) {
      score++;
    }
  });

  const totalScore = score;

  await practicedModel.findOneAndUpdate(
    { user: userId, questionType: question.type, subtype: question.subtype },
    { $addToSet: { practicedQuestions: question._id } },
    { upsert: true, new: true }
  );

  return {
    score: totalScore,
    message: `You scored ${score} out of ${correctAnswers.length} points.`,
    userAnswer: answer,
    correctAnswer: correctAnswers,
  };
}


// reading mcqsingle 
// async function evaluateMcqSingleResult({ userId, questionId, userAnswer }) {
//   const question = await questionModel.findById(questionId).lean();

//   if (!question || question.subtype !== 'mcq_single') {
//     throw new ExpressError(404, "Question not found or invalid type");
//   }

//   const isCorrect = question.correctAnswers.includes(userAnswer);
//   const score = isCorrect ? 1 : 0;

//   await practicedModel.findOneAndUpdate(
//     {
//       user: userId,
//       questionType: question.type,
//       subtype: question.subtype
//     },
//     {
//       $addToSet: { practicedQuestions: question._id }
//     },
//     { upsert: true, new: true }
//   );

//   return {
//     isCorrect,
//     score,
//     message: isCorrect ? "Correct answer!" : "Incorrect answer!"
//   };
// }

// speaking ----------------------------------------------------------------------
// ===============================================================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function safeDeleteFile(filePath) {
  if (filePath) {
    try {
      await fsPromises.unlink(filePath);
    } catch (err) {
      console.error("Failed to delete temp file:", err);
    }
  }
}

function readFileAsBase64(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
  } catch (readError) {
    console.error("Failed to read file from disk:", readError);
    throw new ExpressError(500, "Failed to read file from disk: " + readError.message);
  }
}



const detectAudioFormat = (audioUrl, contentType) => {
  const extension = path.extname(audioUrl).toLowerCase();

  if (extension === '.mp3' || contentType?.includes('mpeg')) return 'mp3';
  if (extension === '.wav' || contentType?.includes('wav')) return 'wav';
  if (extension === '.m4a' || contentType?.includes('m4a')) return 'm4a';
  if (extension === '.ogg' || contentType?.includes('ogg')) return 'ogg';

  return 'mp3';
};

async function callSpeechAssessmentAPI(audioBase64, audioFormat, expectedText, accent) {
  const data = JSON.stringify({
    "audio_base64": audioBase64,
    "audio_format": audioFormat,
    "expected_text": expectedText,
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${process.env.LANGUAGE_CONFIDENCE_BASE_URL}/speech-assessment/scripted/${accent}`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api-key': process.env.LANGUAGE_CONFIDENCE_SECONDARY_API,
    },
    data: data
  };

  try {
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error("Error from Language Confidence API:", error.response ? error.response.data : error.message);

    const errorMessage = error.response
      ? JSON.stringify(error.response.data)
      : error.message;

    throw new ExpressError(500, "Error assessing speech: " + errorMessage);
  }
}

async function handleSpeechAssessment(req, res, expectedSubtype, useDirectPrompt = true) {
  const { questionId, accent = 'us', format } = req.body;
  let userFilePath = req.file?.path;

  try {
    if (!questionId) throw new ExpressError(400, "questionId is required!");
    if (!req.file) throw new ExpressError(400, "voice is required!");

    const question = await questionModel.findById(questionId);
    if (!question) throw new ExpressError(404, "Question not found!");

    if (question.subtype !== expectedSubtype) {
      throw new ExpressError(401, "This is not a valid questionType for this route!");
    }

    const userFileBase64 = readFileAsBase64(userFilePath);
    const audioFormat = format || detectAudioFormat(userFilePath);
    const expectedText = useDirectPrompt ? question.prompt : question.prompt;

    const fullResponse = await callSpeechAssessmentAPI(
      userFileBase64,
      audioFormat,
      expectedText,
      accent
    );

    await safeDeleteFile(userFilePath);

    // Save practice
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

    // Extract fields
    const { overall, pronunciation, fluency, reading, metadata } = fullResponse || {};

    const wordScores = pronunciation?.words || [];
    const goodWords = wordScores.filter(w => w.word_score >= 90).length;
    const averageWords = wordScores.filter(w => w.word_score >= 60 && w.word_score < 90).length;
    const badWords = wordScores.filter(w => w.word_score < 60).length;


    const response = {
      speakingScore: overall?.overall_score || 0,
      readingScore: reading?.accuracy || 0,
      content: metadata?.content_relevance || 0,
      fluency: fluency?.overall_score || 0,
      pronunciation: pronunciation?.overall_score || 0,
      goodWords,
      averageWords,
      badWords
    };

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    await safeDeleteFile(userFilePath);
    throw error;
  }
}

async function speakingReadAloudResult({ req, res }) {
  return handleSpeechAssessment(req, res, 'read_aloud');
};


async function speakingevaluateRepeatSentenceResult({ userId, questionId, userFilePath, accent = 'us' }) {
  if (!questionId) throw new ExpressError(400, "questionId is required!");
  if (!userFilePath) throw new ExpressError(400, "voice file path is required!");

  const question = await questionModel.findById(questionId);
  if (!question) throw new ExpressError(404, "Question Not Found!");

  const userfileBase64 = readFileAsBase64(userFilePath);
  const expectedText = question.audioConvertedText;
  const finalFormat = detectAudioFormat(userFilePath);

  let finalResponse;
  try {
    finalResponse = await callSpeechAssessmentAPI(
      userfileBase64,
      finalFormat,
      expectedText,
      accent
    );
  } finally {
    await safeDeleteFile(userFilePath);
  }

  await practicedModel.findOneAndUpdate(
    {
      user: userId,
      questionType: question.type,
      subtype: question.subtype
    },
    {
      $addToSet: { practicedQuestions: question._id }
    },
    { upsert: true, new: true }
  );

  const data = finalResponse;

  let goodWords = 0;
  let averageWords = 0;
  let badWords = 0;

  if (data?.pronunciation?.words && Array.isArray(data.pronunciation.words)) {
    data.pronunciation.words.forEach(word => {
      const score = word.word_score ?? 0;
      if (score >= 85) {
        goodWords++;
      } else if (score >= 60) {
        averageWords++;
      } else {
        badWords++;
      }
    });
  }

  const contentRelevance = (data?.metadata?.content_relevance ?? 0) / 100; // normalize 0-1
  let listeningScore = data?.fluency?.english_proficiency_scores?.mock_pte?.prediction ?? null;
  if (contentRelevance < 0.3) {
    listeningScore = 0;
  }

  return {
    speakingScore: data?.overall?.english_proficiency_scores?.mock_pte?.prediction ?? null,
    listeningScore,
    content: contentRelevance,
    fluency: data?.fluency?.overall_score ?? null,
    pronunciation: data?.pronunciation?.overall_score ?? null,
    predictedText: data?.metadata?.predicted_text ?? "",
    totalWords: data?.reading?.words_read ?? 0,
    goodWords,
    averageWords,
    badWords
  };
}



async function speakingrespondToASituationResult({ req, res }) {

  return handleSpeechAssessment(req, res, 'respond_to_situation');
};


module.exports = {
  evaluateMcqMultipleResult,
  evaluateReadingFillInTheBlanksResult,
  evaluateReorderParagraphsResult,
  evaluateMcqSingleResult,
  speakingReadAloudResult,
  speakingevaluateRepeatSentenceResult,
  speakingrespondToASituationResult
};
