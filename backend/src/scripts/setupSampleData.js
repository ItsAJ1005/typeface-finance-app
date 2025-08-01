const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
require('dotenv').config();

const setupSampleData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find or create demo user
    let demoUser = await User.findOne({ email: 'demo@finance.com' });
    if (!demoUser) {
      demoUser = new User({
        name: 'Demo User',
        email: 'demo@finance.com',
        password: 'demo123'
      });
      await demoUser.save();
      console.log('✅ Demo user created');
    } else {
      console.log('✅ Demo user already exists');
    }

    // Check if sample transactions already exist
    const existingTransactions = await Transaction.find({ userId: demoUser._id });
    if (existingTransactions.length > 0) {
      console.log('✅ Sample transactions already exist');
      return;
    }

    // Create sample transactions with receipts
    const sampleTransactions = [
      {
        userId: demoUser._id,
        type: 'expense',
        amount: 1250.00,
        category: 'Food & Dining',
        description: 'Lunch at McDonald\'s - Burger, Fries, Coke',
        date: new Date('2024-01-15'),
        receiptId: 'receipt-mcdonalds-20240115.pdf',
        receiptUrl: '/uploads/receipt-mcdonalds-20240115.pdf',
        isFromReceipt: true
      },
      {
        userId: demoUser._id,
        type: 'expense',
        amount: 850.00,
        category: 'Transportation',
        description: 'Uber ride to office',
        date: new Date('2024-01-16'),
        receiptId: 'receipt-uber-20240116.pdf',
        receiptUrl: '/uploads/receipt-uber-20240116.pdf',
        isFromReceipt: true
      },
      {
        userId: demoUser._id,
        type: 'expense',
        amount: 2500.00,
        category: 'Shopping',
        description: 'Amazon purchase - Electronics',
        date: new Date('2024-01-17'),
        receiptId: 'receipt-amazon-20240117.pdf',
        receiptUrl: '/uploads/receipt-amazon-20240117.pdf',
        isFromReceipt: true
      },
      {
        userId: demoUser._id,
        type: 'income',
        amount: 50000.00,
        category: 'Salary',
        description: 'Monthly salary - January 2024',
        date: new Date('2024-01-01')
      },
      {
        userId: demoUser._id,
        type: 'expense',
        amount: 1200.00,
        category: 'Healthcare',
        description: 'Pharmacy - Medicines',
        date: new Date('2024-01-18'),
        receiptId: 'receipt-pharmacy-20240118.pdf',
        receiptUrl: '/uploads/receipt-pharmacy-20240118.pdf',
        isFromReceipt: true
      }
    ];

    await Transaction.insertMany(sampleTransactions);
    console.log('✅ Sample transactions created successfully');
    console.log('📊 Sample data includes:');
    console.log('   • 4 receipt-based transactions');
    console.log('   • 1 salary income');
    console.log('   • Various categories (Food, Transport, Shopping, Healthcare)');

  } catch (error) {
    console.error('❌ Error setting up sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

setupSampleData(); 