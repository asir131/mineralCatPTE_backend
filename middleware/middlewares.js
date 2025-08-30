const jwt = require('jsonwebtoken');
const ExpressError = require('../utils/ExpressError');
const blackListedTokenModel = require('../models/blackListedToken.model');

module.exports.isUserLoggedIn = async(req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: "Access Token Missing" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Access Token Missing" });
  }

  const blacklisted = await blackListedTokenModel.findOne({ token });
  if (blacklisted) {
    return res.status(403).json({ message: 'Token is blacklisted' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded;
    next();
  });
};

module.exports.isAdminUser = (req, res, next) => {
  if (!req.user) throw new ExpressError(401, 'Unauthorized - User not logged in');

  if (req.user.role !== 'admin') throw new ExpressError(403, 'Forbidden - Admins only');

  next();
};
