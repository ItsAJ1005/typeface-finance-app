const cron = require('node-cron');
const { processRecurringTransactions } = require('../controllers/recurringTransactionController');
const logger = require('./logger');

// Schedule the job to run every day at 3 AM
const scheduleRecurringTransactions = () => {
  try {
    // Schedule the job
    const job = cron.schedule('0 3 * * *', async () => {  // Runs at 3 AM every day
      const startTime = new Date();
      logger.info('Starting scheduled processing of recurring transactions');
      
      try {
        const result = await processRecurringTransactions();
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000; // in seconds
        
        logger.info(`Successfully processed ${result.processed} recurring transactions in ${duration.toFixed(2)}s`);
      } catch (error) {
        logger.error('Error processing recurring transactions:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    }, {
      timezone: 'Asia/Kolkata',  // Set to your preferred timezone
      scheduled: true,
      recoverMissedExecutions: false
    });
    
    // Handle process termination
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down recurring transaction scheduler...');
      job.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down recurring transaction scheduler...');
      job.stop();
      process.exit(0);
    });
    
    logger.info('Recurring transaction scheduler initialized');
    return job;
  } catch (error) {
    logger.error('Failed to initialize recurring transaction scheduler:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
};

module.exports = scheduleRecurringTransactions;
