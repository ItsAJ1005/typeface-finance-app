require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const RecurringTransaction = require('../src/models/RecurringTransaction');
const Transaction = require('../src/models/Transaction');
const { processRecurringTransactions } = require('../src/controllers/recurringTransactionController');
const logger = require('../src/utils/logger');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Ensure logs directory exists
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Function to check if MongoDB is running
async function isMongoDBRunning() {
  try {
    // Try to connect to MongoDB
    const mongoUri = 'mongodb://127.0.0.1:27017';
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 2000,
    });
    await mongoose.connection.close();
    return true;
  } catch (error) {
    return false;
  }
}

// Function to start MongoDB service
async function startMongoDB() {
  try {
    logger.info('Attempting to start MongoDB service...');
    const { stdout, stderr } = await execPromise('net start MongoDB');
    logger.info('MongoDB service started successfully');
    return true;
  } catch (error) {
    logger.error('Failed to start MongoDB service:', error.message);
    return false;
  }
}

async function testRecurringTransactions() {
  try {
    // Check if MongoDB is running
    logger.info('Checking if MongoDB is running...');
    const isRunning = await isMongoDBRunning();
    
    if (!isRunning) {
      logger.warn('MongoDB is not running. Attempting to start it...');
      const started = await startMongoDB();
      
      if (!started) {
        logger.error('\nMongoDB could not be started automatically. Please start it manually.');
        logger.error('1. Open Services (press Win + R, type "services.msc", and press Enter)');
        logger.error('2. Find "MongoDB" in the list');
        logger.error('3. Right-click and select "Start"');
        logger.error('4. Try running this script again');
        process.exit(1);
      }
      
      // Give MongoDB a moment to start up
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Connect to MongoDB with direct connection string
    const mongoUri = 'mongodb://127.0.0.1:27017/finance-app';
    logger.info('Connecting to MongoDB...');
    logger.info(`MongoDB URI: ${mongoUri}`);
    
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // 5 second timeout
      });
      logger.info('Successfully connected to MongoDB');
      
      // Test the connection
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      logger.info('Available collections:', collections.map(c => c.name));
      
    } catch (dbError) {
      logger.error('Failed to connect to MongoDB:', {
        message: dbError.message,
        name: dbError.name,
        code: dbError.code,
        codeName: dbError.codeName,
        stack: dbError.stack
      });
      
      // Check if MongoDB is running
      logger.error('\nTroubleshooting:');
      logger.error('1. Make sure MongoDB is installed and running');
      logger.error('2. Try connecting using MongoDB Compass or mongo shell');
      logger.error('3. Check if the database name is correct');
      
      throw dbError;
    }

    // Create a test user ID
    const testUserId = new mongoose.Types.ObjectId();
    logger.info(`Using test user ID: ${testUserId}`);
    
    // Create a test recurring transaction
    const testRecurringTransaction = {
      userId: testUserId,
      type: 'expense',
      amount: 100,
      category: 'Utilities',
      description: 'Monthly internet bill',
      startDate: new Date(),
      frequency: 'monthly',
      dayOfMonth: new Date().getDate(),
      isActive: true,
      nextOccurrence: new Date() // Set to now for testing
    };

    logger.info('Creating test recurring transaction with data:', JSON.stringify(testRecurringTransaction, null, 2));
    
    try {
      const createdRecurring = await RecurringTransaction.create(testRecurringTransaction);
      logger.info('Successfully created test recurring transaction:', JSON.stringify(createdRecurring, null, 2));
    } catch (createError) {
      logger.error('Failed to create test recurring transaction:', createError);
      throw createError;
    }

    // Process recurring transactions
    logger.info('\nProcessing recurring transactions...');
    try {
      const result = await processRecurringTransactions();
      logger.info('Processing result:', result);
    } catch (processError) {
      logger.error('Error processing recurring transactions:', processError);
      throw processError;
    }

    // Check if the transaction was created
    try {
      const transactions = await Transaction.find({ recurringTransactionId: createdRecurring._id });
      logger.info('\nCreated transactions:', JSON.stringify(transactions, null, 2));
    } catch (findError) {
      logger.error('Error finding created transactions:', findError);
    }

    // Check if the next occurrence was updated
    try {
      const updatedRecurring = await RecurringTransaction.findById(createdRecurring._id);
      logger.info('\nUpdated recurring transaction:', {
        lastProcessed: updatedRecurring.lastProcessed,
        nextOccurrence: updatedRecurring.nextOccurrence,
        isActive: updatedRecurring.isActive
      });
    } catch (updateError) {
      logger.error('Error finding updated recurring transaction:', updateError);
    }

    // Clean up
    logger.info('\nCleaning up test data...');
    try {
      await RecurringTransaction.deleteMany({ userId: testUserId });
      await Transaction.deleteMany({ userId: testUserId });
      logger.info('Cleanup completed');
    } catch (cleanupError) {
      logger.error('Error during cleanup:', cleanupError);
    }
    
    logger.info('Test completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Ensure the MongoDB connection is closed
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (closeError) {
      logger.error('Error closing MongoDB connection:', closeError);
    }
  }
}

testRecurringTransactions();
