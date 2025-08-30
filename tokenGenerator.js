const userModels = require("./models/user.models")
const jwt = require('jsonwebtoken');

module.exports.accessTokenAndRefreshTokenGenerator = async function(userId){
    const user = await userModels.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    return {accessToken, refreshToken};
}


module.exports.resetTokenGenerator = async(email)=>{
    return jwt.sign(
        {
            email,
        },
        process.env.RESET_TOKEN_SECRET,
        {
            expiresIn: process.env.RESET_TOKEN_EXPIRES,
        }
    )
}