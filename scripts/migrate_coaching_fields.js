if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const mongoose = require('mongoose');

async function run() {
  const mongoUrl = process.env.MONGO_DB_URL;

  if (!mongoUrl) {
    throw new Error('MONGO_DB_URL is not set');
  }

  await mongoose.connect(mongoUrl);

  const collection = mongoose.connection.collection('subscriptions');

  const result = await collection.updateMany(
    {},
    [
      {
        $set: {
          coachingPlanType: { $ifNull: ['$coachingPlanType', null] },
          coachingUnlimited: { $ifNull: ['$coachingUnlimited', false] },
          coachingStartedAt: { $ifNull: ['$coachingStartedAt', null] },
          coachingExpiresAt: { $ifNull: ['$coachingExpiresAt', null] },
          coachingDays: { $ifNull: ['$coachingDays', 0] },
        },
      },
    ]
  );

  console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
