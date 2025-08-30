const router = require("express").Router();
const { addSectionalMockTest, getAllSectionalMockTest, deleteSectionalMockTest, getSingleSectionalMockTest, mockTestResult, getFormattedMockTestResult } = require("../../controllers/mockTestControllers/sectionalMockTest.Controller");
const { checkLimit } = require("../../middleware/checkLimit");

const { isUserLoggedIn , isAdminUser} = require('../../middleware/middlewares');
const createUploadMiddleware = require("../../middleware/upload");

router.post('/add', isUserLoggedIn, isAdminUser, addSectionalMockTest);

router.get('/getAll/:type', isUserLoggedIn, getAllSectionalMockTest);

router.get('/getSingleSectionalMockTest/:id', isUserLoggedIn, getSingleSectionalMockTest);

router.delete('/delete/:id', isUserLoggedIn, isAdminUser, deleteSectionalMockTest);

router.post('/result-single-question', isUserLoggedIn, createUploadMiddleware(['.mp3', '.wav']).single('voice'), mockTestResult);

router.get('/get-mock-test-result/:mockTestId', isUserLoggedIn,checkLimit(['mock']), getFormattedMockTestResult);

module.exports = router;
