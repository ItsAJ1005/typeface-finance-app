require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { processRecurringTransactions } = require('../src/controllers/recurringTransactionController');
const logger = require('../src/utils/logger');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/typeface-finance';

// Load models
require('../src/models/RecurringTransaction');
require('../src/models/Transaction');

async function main() {
  try {
    logger.info('Starting script...');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    logger.info('Connecting to MongoDB...');
    logger.debug(`MongoDB URI: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    logger.info('\n=== Starting recurring transaction processing ===');
    
    // Create mock request and response objects
    const mockReq = {
      user: { _id: 'system-process' },
      body: {}
    };
    
    const mockRes = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        logger.debug(`Response status: ${code}`);
        return this;
      },
      json: function(data) {
        logger.info('Processing result:', JSON.stringify(data, null, 2));
        return this;
      },
      end: function() {
        logger.info('Response sent');
      }
    };
    
    // Add error handling middleware
    const mockNext = (error) => {
      if (error) {
        logger.error('Error in processRecurringTransactions:', error);
        throw error;
      }
    };
    
    logger.debug('Calling processRecurringTransactions...');
    await processRecurringTransactions(mockReq, mockRes, mockNext);
    
    logger.info('✅ Processing completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error processing recurring transactions:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Process interrupted. Closing MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

main();
