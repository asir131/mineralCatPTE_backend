const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const userModels = require('./models/user.models');

const MONGO_URI = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/yourdbname';

const demoUsers = [];

const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
const roles = ['user', 'admin'];

function randomPhone() {
  return '+1' + Math.floor(1000000000 + Math.random() * 9000000000);
}

function randomEmail(name, index) {
  return `${name.toLowerCase().replace(/\s/g, '')}${index}@example.com`;
}

async function createDemoUsers() {
  for (let i = 1; i <= 20; i++) {
    const name = `Demo User ${i}`;
    const password = 'password123'; // default password for all demo users
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      name,
      email: randomEmail(name, i),
      password: hashedPassword,
      city: cities[Math.floor(Math.random() * cities.length)],
      phone: randomPhone(),
      role: i % 10 === 0 ? 'admin' : 'user', // every 10th user is admin
      status: 'progress',
    };

    demoUsers.push(user);
  }
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    // Optional: Clear existing users
    // await User.deleteMany({});
    // console.log('Existing users removed');

    await createDemoUsers();

    await userModels.insertMany(demoUsers);
    console.log('20 demo users inserted');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

// seed();

module.exports = seed;
