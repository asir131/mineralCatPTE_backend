const passport = require('passport');
const userModels = require('./models/user.models');
const googleStrategy = require('passport-google-oauth20').Strategy;


passport.use(new googleStrategy(
    {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done)=>{
        let user = await userModels.findOne({googleId: profile.id});

        if(!user){
            user = await userModels.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
            })
        }

        return done(null, user);
    }

))

passport.serializeUser((user, done)=>{
    done(null, user._id);
})

passport.deserializeUser(async(id, done)=>{
    const user = await userModels.findById(id);
    done(null, user);
})