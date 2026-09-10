const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const renameCollection = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in server/.env');
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully to MongoDB Atlas.');

    const db = mongoose.connection.db;

    // List existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log('Current collections in database:', collectionNames);

    const hasUsers = collectionNames.includes('users');
    const hasBusinessUsers = collectionNames.includes('business-users');

    if (hasUsers && !hasBusinessUsers) {
      const userCount = await db.collection('users').countDocuments();
      console.log(`Found 'users' collection with ${userCount} document(s).`);
      console.log("Renaming collection 'users' -> 'business-users'...");

      await db.collection('users').rename('business-users');
      
      const newCount = await db.collection('business-users').countDocuments();
      console.log(`✅ Success! Renamed to 'business-users'. Document count: ${newCount}`);
    } else if (hasBusinessUsers) {
      const count = await db.collection('business-users').countDocuments();
      console.log(`ℹ️ Collection 'business-users' already exists with ${count} document(s).`);
      if (hasUsers) {
        console.log("⚠️ Note: Old 'users' collection is also present. Please review if cleanup is needed.");
      }
    } else {
      console.log("⚠️ Neither 'users' nor 'business-users' was found. Creating empty 'business-users' collection...");
      await db.createCollection('business-users');
      console.log("✅ Created 'business-users' collection.");
    }

    // Test model integration
    const User = require('../models/User');
    const sampleUser = await User.findOne();
    console.log('Test query using Mongoose User model:', sampleUser ? `Found user: ${sampleUser.email} (Role: ${sampleUser.role})` : 'No users found in collection yet.');

    await mongoose.connection.close();
    console.log('Database connection closed. Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

renameCollection();
