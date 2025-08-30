const { addSummarizeWrittenText, editSummarizeWrittenText, getSummarizeWrittenText, addWriteEmail, editWriteEmail, getWriteEmail, summarizeWrittenTextResult, writeEmailResult } = require('../../controllers/questionsControllers/written_test.controller');
const { checkLimit } = require('../../middleware/checkLimit');
const { isUserLoggedIn, isAdminUser } = require('../../middleware/middlewares');

const router = require('express').Router();


router.route('/summarize-written-text')
    .get(isUserLoggedIn, getSummarizeWrittenText)
    .post(isUserLoggedIn, isAdminUser,addSummarizeWrittenText)
    .put(isUserLoggedIn, isAdminUser, editSummarizeWrittenText);


router.post('/summerize-written-text/result', isUserLoggedIn, checkLimit(['aicredits']),summarizeWrittenTextResult);

router.route('/write_email')
    .get(isUserLoggedIn, getWriteEmail)
    .post(isUserLoggedIn, isAdminUser, addWriteEmail)
    .put(isUserLoggedIn, isAdminUser, editWriteEmail);


router.post('/write_email/result', isUserLoggedIn, checkLimit(['aicredits']),writeEmailResult);
module.exports = router;