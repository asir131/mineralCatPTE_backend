const passport = require('passport');
const { signUpUser, loginUser, refreshToken, signupWithGoogle } = require('../../controllers/userControllers/user.controllers');

const router = require('express').Router();

router.post('/signup', signUpUser);

router.post('/login', loginUser);

router.post('/refresh-token', refreshToken);

router.get('/google',
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );
  

router.get('/google/callback', 
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/'
      }),
    signupWithGoogle
)

module.exports = router;