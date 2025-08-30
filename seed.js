const mongoose = require('mongoose');
const User = require('./models/user.models'); // Adjust path to your User model

// --- Configuration ---
// Replace with your MongoDB connection string
const mongoURI = 'mongodb+srv://keizyrabiredas:WgSxG5Kr5b8vLiec@mineralcatpte.whuvt8w.mongodb.net/?retryWrites=true&w=majority&appName=MineralCatPTE'; 

// Array of users to seed
const usersToSeed = [
    {
        name: 'Admin User',
        email: 'admin@example.com',
        password: '1qazxsw2',
        role: 'admin',
        city: 'Dhaka',
        phone: '01700000000',
    },
    {
        name: 'Regular User One',
        email: 'user1@example.com',
        password: 'userPassword123',
        role: 'user',
        city: 'Chittagong',
        phone: '01811111111',
    },
    {
        name: 'Regular User Two',
        email: 'user2@example.com',
        password: 'userPassword456', // This will be hashed
        role: 'user',
        city: 'Sylhet',
        phone: '01922222222',
    },
    // Add more users as needed
];
// --- End Configuration ---

async function seedUsers() {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully.');

        console.log('Seeding users...');

        let seededCount = 0;
        for (const userData of usersToSeed) {
            try {
                const newUser = new User(userData);
                await newUser.save();
                console.log(`User "${newUser.email}" (${newUser.role}) seeded successfully.`);
                seededCount++;
            } catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    console.warn(`User "${userData.email}" already exists. Skipping.`);
                } else {
                    console.error(`Error seeding user "${userData.email}":`, error.message);
                }
            }
        }

        console.log(`\nSeeding complete. ${seededCount} new user(s) added.`);

    } catch (error) {
        console.error('Database connection or seeding failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

// Optional: Add a check to prevent accidental seeding in production
if (process.env.NODE_ENV === 'production') {
    console.warn('WARNING: You are about to seed users in a production environment.');
    console.warn('This script should generally only be run in development or testing environments.');
    console.warn('To proceed, set NODE_ENV to "development" or remove this check.');
    process.exit(1);
} else {
    seedUsers();
}