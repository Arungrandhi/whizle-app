require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/whistleapp';
    console.log('Connecting to database:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const superAdminEmail = 'superadmin@whistlez.com';
    const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

    if (existingSuperAdmin) {
      console.log(`Super Admin already exists with email: ${superAdminEmail}`);
    } else {
      await User.create({
        name: 'System Super Admin',
        email: superAdminEmail,
        password: 'SuperAdmin123!', // Will be hashed by pre-save middleware
        role: 'superadmin'
      });
      console.log(`Super Admin successfully created!`);
      console.log(`Email: ${superAdminEmail}`);
      console.log(`Password: SuperAdmin123!`);
    }

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Super Admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
