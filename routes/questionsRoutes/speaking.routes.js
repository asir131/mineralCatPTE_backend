const { addReadAloud, getAllReadAloud, editReadAloud, addRepeatSentence, editRepeatSentence, getAllRepeatSentence, addRespondToASituation, editRespondToASituation, getAllRespondToASituation, addAnswerShortQuestion, editAnswerShortQuestion, getAllAnswerShortQuestion, readAloudResult, respondToASituationResult, repeatSentenceResult, answerShortQuestionResult } = require('../../controllers/questionsControllers/speaking.controller');
const { checkLimit } = require('../../middleware/checkLimit');
const { isUserLoggedIn, isAdminUser } = require('../../middleware/middlewares');
const createUploadMiddleware = require('../../middleware/upload');
// const upload = require('../../middleware/upload');

const router = require('express').Router();


router.route('/read_aloud')
    .get(isUserLoggedIn ,getAllReadAloud)
    .put(isUserLoggedIn , isAdminUser, editReadAloud)
    .post(isUserLoggedIn , isAdminUser,addReadAloud);


router.post('/read_aloud/result', isUserLoggedIn, createUploadMiddleware(['.mp3', '.wav']).single('voice'),checkLimit(['aicredits']),readAloudResult);

router.route('/repeat_sentence')
    .get(isUserLoggedIn ,getAllRepeatSentence)
    .put(isUserLoggedIn , isAdminUser, createUploadMiddleware(['.mp3', '.wav']).single('voice'),editRepeatSentence)
    .post(isUserLoggedIn , isAdminUser, createUploadMiddleware(['.mp3', '.wav']).single('voice'),addRepeatSentence);


router.post('/repeat_sentence/result', isUserLoggedIn, createUploadMiddleware(['.mp3', '.wav']).single('voice'),checkLimit(['aicredits']),repeatSentenceResult);

router.route('/respond-to-a-situation')
    .get(isUserLoggedIn ,getAllRespondToASituation)
    .put(isUserLoggedIn , isAdminUser, createUploadMiddleware(['.mp3', '.wav']).single('voice'),editRespondToASituation)
    .post(isUserLoggedIn , isAdminUser, createUploadMiddleware(['.mp3', '.wav']).single('voice'),addRespondToASituation);

router.post('/respond-to-a-situation/result', isUserLoggedIn, createUploadMiddleware(['.mp3', '.wav']).single('voice'),checkLimit(['aicredits']),respondToASituationResult);

router.route('/answer_short_question')
    .get(isUserLoggedIn ,getAllAnswerShortQuestion)
    .put(isUserLoggedIn , isAdminUser, createUploadMiddleware(['.mp3', '.wav']).single('voice'),editAnswerShortQuestion)
    .post(isUserLoggedIn , isAdminUser, createUploadMiddleware(['.mp3', '.wav']).single('voice'),addAnswerShortQuestion);


router.post('/answer_short_question/result', isUserLoggedIn, createUploadMiddleware(['.mp3', '.wav']).single('voice'),checkLimit(['aicredits']),answerShortQuestionResult);

module.exports = router;
