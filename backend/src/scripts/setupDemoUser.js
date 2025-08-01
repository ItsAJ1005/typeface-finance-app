const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const setupDemoUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({ email: 'demo@finance.com' });
    
    if (existingUser) {
      console.log('✅ Demo user already exists');
      return;
    }

    // Create demo user
    const demoUser = new User({
      name: 'Demo User',
      email: 'demo@finance.com',
      password: 'demo123'
    });

    await demoUser.save();
    console.log('✅ Demo user created successfully');
    console.log('📧 Email: demo@finance.com');
    console.log('🔑 Password: demo123');

  } catch (error) {
    console.error('❌ Error setting up demo user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the setup
setupDemoUser(); 