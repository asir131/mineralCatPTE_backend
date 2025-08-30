const nodemailer = require('nodemailer');

const {asyncWrapper} = require('../utils/AsyncWrapper');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER_MAIL,
        pass: process.env.USER_MAIL_PASS,
    }
})

const sendOTPEmail = asyncWrapper(async(toEmail, otp)=>{
    const mailOptions = {
        from: process.env.USER_MAIL,
        to: toEmail,
        subject: 'Your Otp Code',
        text: `Your OTP code is: ${otp}. OTP will expires in 5 minutes`,
    }

    await transporter.sendMail(mailOptions);
})

module.exports = sendOTPEmail;