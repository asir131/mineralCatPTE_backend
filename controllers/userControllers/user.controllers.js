const mongoose = require('mongoose');
const userModels = require('../../models/user.models');
const { userSchemaValidator, LoginFormValidator } = require('../../validations/schemaValidations');
const { accessTokenAndRefreshTokenGenerator } = require('../../tokenGenerator');
const jwt = require('jsonwebtoken');
const { asyncWrapper } = require('../../utils/AsyncWrapper');
const supscriptionModel = require('../../models/supscription.model');
const fs = require('node:fs');
const cloudinary = require('../../middleware/cloudinary.config');
const path = require('node:path');
const questionModel = require('../../models/questions.model');
const ExpressError = require('../../utils/ExpressError');
const bookmarkModel = require('../../models/bookmark.model');
const notificationModel = require('../../models/notification.model');
const practicedModel = require('../../models/practiced.model');
const mock_testModel = require('../../models/mock_test.model');
const sectionalMockTestModel = require('../../models/sectionalMockTest.model');
const PaymentHistory = require('../../models/paymenthistory.model');
const blackListedTokenModel = require('../../models/blackListedToken.model');
const bcrypt = require('bcryptjs');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 * 5 });

module.exports.signUpUser = asyncWrapper(async (req, res) => {
  const { error, value } = userSchemaValidator.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, password } = value;

  const checkUser = await userModels.findOne({ email });
  if (checkUser) return res.json({ message: "A user already exists with this email" });

  const newUser = await userModels.create({
    name,
    email,
    password,
  });

  const subscription = await supscriptionModel.create({
    user: newUser._id,
    planType: "Free",
    isActive: true,
    studyPlan: "unauthorized",
    performanceProgressDetailed: "unauthorized"
  });

  newUser.userSubscription = subscription;
  await newUser.save();

  const { accessToken, refreshToken } = await accessTokenAndRefreshTokenGenerator(newUser._id);

  return res
    .status(200)
    .json({
      user: {
        ...newUser.toObject(),
      },
      accessToken,
      refreshToken,
    });
});


module.exports.loginUser = asyncWrapper(async (req, res) => {
  const { error, value } = LoginFormValidator.validate(req.body);

  if (error) {
    throw new ExpressError(400, error.details[0].message);
  }

  const { email, password } = value;

  const user = await userModels.findOne({ email });
  if (!user) return res.status(400).json({ message: "Wrong email or password" });

  const checkPassword = await user.verifyPassword(password);

  if (!checkPassword) return res.status(400).json({ message: "Wrong email or password" });

  const { accessToken, refreshToken } = await accessTokenAndRefreshTokenGenerator(user._id);

  return res
    .status(200)
    .json(
      {
        user: user,
        accessToken,
        refreshToken,
      }
    )
})


module.exports.refreshToken = asyncWrapper(async (req, res) => {
  const token = req.headers['x-refresh-token'];

  if (!token) {
    return res.status(401).json({ message: "Refresh token is missing. Please log in." });
  }

  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    const userData = await userModels.findById(user._id).select('-password');
    if (!userData) {
      return res.status(404).json({ message: "User not found." });
    }

    const newAccessToken = jwt.sign(
      {
        _id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      }
    );

    return res.status(200).json({
      accessToken: newAccessToken,
      message: "Access token refreshed.",
    });
  });
});


module.exports.signupWithGoogle = (req, res) => {
  const user = req.user;
  const accessToken = jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },

    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  )
  const refreshToken = jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },

    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  )

  res.status(200).json({ accessToken, refreshToken });
}



module.exports.userInfo = asyncWrapper(async (req, res) => {
  const user = req.user;
  const userData = await userModels.findById(user._id).select(['-password']).populate("userSubscription");
  return res.status(200).json({ user: userData });
});



module.exports.updateUser = asyncWrapper(async (req, res) => {
  const data = req.body;
  const user = req.user;

  if (data.email && data.email !== user.email) {
    return res.status(400).json({
      success: false,
      message: 'Email cannot be changed.',
    });
  }
  if (data.blocked && data.email !== user.email) {
    return res.status(400).json({
      success: false,
      message: 'Cannot Block yourself.',
    });
  }

  const folderName = 'userProfile';
  let updateFields = { ...data };

  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        public_id: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        folder: `listening_test/${folderName}`,
        type: 'authenticated',
      });

      updateFields.profile = result.secure_url;

      fs.unlinkSync(req.file.path);

    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      return res.status(500).json({ message: 'Image upload failed. Please try again.' });
    }
  }

  // Handle password change
  if (data.password) {
    if (!data.oldPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password is required to set a new password.',
      });
    }

    if (data.password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const dbUser = await userModels.findById(user._id);

    const isMatch = await bcrypt.compare(data.oldPassword, dbUser.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect.',
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    updateFields.password = hashedPassword;
  }


  const updatedUser = await userModels.findByIdAndUpdate(user._id, updateFields, { new: true }).select('-password');

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    user: updatedUser
  });
});

module.exports.getAQuestion = asyncWrapper(async (req, res) => {
  const question = await questionModel.findById(req.params.id);

  console.log(question);

  res.status(200).json({ question });
})


module.exports.toggleBookmark = asyncWrapper(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.body;

  if (!id) {
    throw new ExpressError(400, "Question ID is required");
  }

  const question = await questionModel.findById(id);
  if (!question) {
    throw new ExpressError(404, "Question not found");
  }

  const { type: questionType, subtype } = question;

  let bookmark = await bookmarkModel.findOne({ user: userId, questionType, subtype });
  
  if (bookmark) {
    const index = bookmark.bookmarkedQuestions.indexOf(id);

    if (index > -1) {
      bookmark.bookmarkedQuestions.splice(index, 1);

      if (bookmark.bookmarkedQuestions.length === 0) {
        await bookmark.deleteOne();
        return res.status(200).json({ message: "Bookmark removed completely" });
      }

      await bookmark.save();
      return res.status(200).json({ message: "Removed from bookmarks", data: bookmark });
    } else {
      bookmark.bookmarkedQuestions.push(id);
      await bookmark.save();
      return res.status(200).json({ message: "Bookmarked successfully", data: bookmark });
    }
  } else {
    bookmark = await bookmarkModel.create({
      user: userId,
      questionType,
      subtype,
      bookmarkedQuestions: [id]
    });
    return res.status(200).json({ message: "Bookmarked successfully", data: bookmark });
  }
});



module.exports.getBookMark = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const user = await userModels.findById(userId).populate('bookmark');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.status(200).json({
    message: 'Bookmarked questions fetched successfully',
    bookmarks: user.bookmark,
  });
});




module.exports.getNotifications = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const user = await userModels
    .findById(userId)
    .populate('userSubscription', 'planType')
    .select('notifications');

  const seenIds = user.notifications.map(id => id.toString());
  const tier = user.userSubscription?.planType?.toLowerCase();

  if (!tier) {
    return res.status(400).json({ success: false, message: "User subscription not found." });
  }

  const notifications = await notificationModel.aggregate([
    {
      $match: {
        $or: [
          { targetSubscription: tier },
          { targetSubscription: 'all' }
        ]
      }
    },
    {
      $sort: { time: -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $addFields: {
        seen: {
          $in: ['$_id', seenIds.map(id => new mongoose.Types.ObjectId(id))]
        }
      }
    }
  ]);

  const fetchedIds = notifications.map(n => n._id);
  const newSeenIds = fetchedIds.filter(id => !seenIds.includes(id.toString()));

  if (newSeenIds.length > 0) {
    await userModels.findByIdAndUpdate(userId, {
      $addToSet: {
        notifications: { $each: newSeenIds }
      }
    });
  }

  const unseenCount = notifications.filter(n => !n.seen).length;

  res.status(200).json({
    success: true,
    unseenCount,
    page,
    limit,
    data: notifications
  });
});


module.exports.getUnseenNotificationCount = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const user = await userModels
    .findById(userId)
    .populate('userSubscription', 'planType')
    .select('notifications');

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const seenIds = user.notifications.map(id => new mongoose.Types.ObjectId(id));
  const tier = user.userSubscription?.planType?.toLowerCase();

  if (!tier) {
    return res.status(400).json({ success: false, message: "User subscription not found." });
  }

  const unseenCount = await notificationModel.countDocuments({
    _id: { $nin: seenIds },
    $or: [
      { targetSubscription: tier },
      { targetSubscription: 'all' }
    ]
  });

  res.status(200).json({
    success: true,
    unseenCount
  });
});




module.exports.userProgress = asyncWrapper(async (req, res) => {
  const userId = req.user._id.toString();

  const cachedData = cache.get(userId);
  if (cachedData) {
    return res.status(200).json({
      success: true,
      data: cachedData.data,
      userTarget: cachedData.userTarget,
      cached: true,
    });
  }

  const questionTypes = ['speaking', 'writing', 'reading', 'listening'];
  const typeProgress = {};
  const typeCounts = {};

  for (const type of questionTypes) {
    const subtypes = await questionModel.distinct('subtype', { type });

    let totalQuestionsAll = 0;
    let completedAll = 0;

    typeCounts[type] = {};

    for (const subtype of subtypes) {
      const totalQuestions = await questionModel.countDocuments({ type, subtype });
      const practiceDoc = await practicedModel.findOne({ user: userId, questionType: type, subtype });
      const completed = practiceDoc?.practicedQuestions?.length || 0;

      totalQuestionsAll += totalQuestions;
      completedAll += completed;

      typeCounts[type][subtype] = { total: totalQuestions, completed };
    }

    const percent = totalQuestionsAll === 0 ? 0 : Math.round((completedAll / totalQuestionsAll) * 100);
    typeProgress[type] = `${percent}%`;
  }

  const totalMockTests = await mock_testModel.countDocuments();
  const completedMockTests = await practicedModel.distinct('completedMockTests', { user: userId });

  const totalSectionalMockTests = await sectionalMockTestModel.countDocuments();
  const completedSectionalTests = await practicedModel.distinct('completedSectionalTests', { user: userId });

  const userSub = await supscriptionModel.findOne({ user: userId });

  const progressData = {
    typeProgress,
    typeCounts,
    mockTests: { total: totalMockTests, completed: completedMockTests.length },
    sectionalMockTests: { total: totalSectionalMockTests, completed: completedSectionalTests.length }
  };

  cache.set(userId, { data: progressData, userTarget: userSub.aiScoringLimit });

  res.status(200).json({
    success: true,
    data: progressData,
    userTarget: userSub.aiScoringLimit,
    cached: false,
  });
});








module.exports.userPaymentHistory = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const history = await PaymentHistory.find({ user: userId })
    .sort({ paymentDate: -1 }) // latest first
    .lean();

  if (!history || history.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No payment history found.',
      data: [],
    });
  }

  res.status(200).json({
    success: true,
    message: 'Payment history fetched successfully.',
    data: history,
  });
});



module.exports.logout = async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(400).json({ message: 'No token provided' });

  const decoded = jwt.decode(token);
  const expiry = new Date(decoded.exp * 1000);

  await blackListedTokenModel.create({
    token,
    expiresAt: expiry,
  });

  res.status(200).json({ message: 'Successfully logged out' });
};



module.exports.questionsCounts = asyncWrapper(async (req, res) => {
  const counts = await questionModel.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    listening: 0,
    speaking: 0,
    writing: 0,
    reading: 0,
  };

  counts.forEach(item => {
    result[item._id] = item.count;
  });

  res.status(200).json({
    success: true,
    data: result
  });
});