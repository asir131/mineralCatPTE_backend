const { addFillInTheBlanks, getAllFillInTheBlanks, editFillIntheBlanks, addMcqMultiple, getMcqMultiple, editMcqMultiple, deleteMcqMultiple, deleteQuestion, addMcqSingle, getMcqSingle, editMcqSingle, addReOrderParagraphs, editReorderParagraphs, getReorderParagraphs, addReadingFillInTheBlanks, getReadingFillInTheBlanks, editReadingFillInTheBlanks, readingFillInTheBlanksResult, mcqMultipleChoiceResult, reorderParagraphsResult, getAReorderParagraph, mcqSingleResult } = require('../../controllers/questionsControllers/reading_test.controller');
const { checkLimit } = require('../../middleware/checkLimit');
const { isAdminUser, isUserLoggedIn } = require('../../middleware/middlewares');

const router = require('express').Router();


router.route('/fill-in-the-blanks')
    .post(isUserLoggedIn, isAdminUser, addFillInTheBlanks)
    .get(isUserLoggedIn, getAllFillInTheBlanks)
    .put(isUserLoggedIn, isAdminUser, editFillIntheBlanks);


router.route('/mcq_multiple')
    .post(isUserLoggedIn, isAdminUser, addMcqMultiple)
    .get(isUserLoggedIn, getMcqMultiple)
    .put(isUserLoggedIn, isAdminUser, editMcqMultiple);


router.post('/mcq_multiple/result', isUserLoggedIn, checkLimit(['aicredits']), mcqMultipleChoiceResult);


router.route('/mcq_single')
    .post(isUserLoggedIn, isAdminUser, addMcqSingle)
    .get(isUserLoggedIn, getMcqSingle)
    .put(isUserLoggedIn, isAdminUser, editMcqSingle);


router.post('/mcq_single/result', isUserLoggedIn, checkLimit(['aicredits']), mcqSingleResult);

router.route('/reading-fill-in-the-blanks')
    .post(isUserLoggedIn, isAdminUser, addReadingFillInTheBlanks)
    .get(isUserLoggedIn, getReadingFillInTheBlanks)
    .put(isUserLoggedIn, isAdminUser, editReadingFillInTheBlanks);


router.post('/reading-fill-in-the-blanks/result', isUserLoggedIn, checkLimit(['aicredits']), readingFillInTheBlanksResult);

router.route('/reorder-paragraphs')
    .post(isUserLoggedIn, isAdminUser, addReOrderParagraphs)
    .get(isUserLoggedIn, getReorderParagraphs)
    .put(isUserLoggedIn, isAdminUser, editReorderParagraphs);

router.get('/reorder-a-paragraph/:questionId', isUserLoggedIn, getAReorderParagraph);

router.post('/reorder-paragraphs/result', isUserLoggedIn, checkLimit(['aicredits']),reorderParagraphsResult);

// router.delete('/delete/question', isUserLoggedIn, isAdminUser,deleteQuestion);

module.exports = router;
