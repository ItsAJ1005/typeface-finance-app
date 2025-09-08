const mongoose = require('mongoose');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const { createTransaction } = require('./transactionController');

// Create a new recurring transaction
exports.createRecurringTransaction = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  logger.info(`Creating new recurring transaction for user ${userId}`);
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Validate day of month based on frequency
    if (req.body.frequency === 'monthly' && !req.body.dayOfMonth) {
      logger.warn('Monthly frequency requires day of month');
      return next(new AppError('Day of month is required for monthly frequency', 400));
    }
    
    // Validate day of week based on frequency
    if (req.body.frequency === 'weekly' && req.body.dayOfWeek === undefined) {
      logger.warn('Weekly frequency requires day of week');
      return next(new AppError('Day of week is required for weekly frequency', 400));
    }
    
    // Validate month based on frequency
    if (req.body.frequency === 'yearly' && req.body.month === undefined) {
      logger.warn('Yearly frequency requires month');
      return next(new AppError('Month is required for yearly frequency', 400));
    }
    
    // Create the recurring transaction
    const recurringTransaction = await RecurringTransaction.create([{
      ...req.body,
      userId
    }], { session });
    
    logger.info(`Created recurring transaction ${recurringTransaction[0]._id} for user ${userId}`);
    
    // If this is set to start now, create the first transaction
    if (req.body.createInitialTransaction !== false) {
      const { type, amount, category, description, nextOccurrence } = recurringTransaction[0];
      
      // Create a mock request/response for the transaction controller
      const mockReq = {
        body: {
          type,
          amount,
          category,
          description: description || `Recurring: ${category}`,
          date: nextOccurrence,
          isFromRecurring: true,
          recurringTransactionId: recurringTransaction[0]._id
        },
        userId: userId.toString()
      };
      
      const mockRes = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          if (this.statusCode >= 400) {
            throw new Error(data.message || 'Failed to create initial transaction');
          }
          return data;
        }
      };
      
      // Use the transaction controller to create the initial transaction
      await createTransaction(mockReq, mockRes);
      logger.info(`Created initial transaction for recurring record ${recurringTransaction[0]._id}`);
    }
    
    await session.commitTransaction();
    
    res.status(201).json({
      status: 'success',
      data: {
        recurringTransaction: recurringTransaction[0]
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error creating recurring transaction:', {
      error: error.message,
      stack: error.stack,
      userId,
      requestBody: req.body
    });
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return next(new AppError('A similar recurring transaction already exists', 400));
    }
    
    next(error);
  } finally {
    session.endSession();
  }
});

// Get all recurring transactions for the current user
exports.getAllRecurringTransactions = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  const query = { userId: req.user._id };
  
  // Filter by status if provided
  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }
  
  const recurringTransactions = await RecurringTransaction.find(query)
    .sort({ nextOccurrence: 1 });
  
  res.status(200).json({
    status: 'success',
    results: recurringTransactions.length,
    data: {
      recurringTransactions
    }
  });
});

// Get a single recurring transaction
exports.getRecurringTransaction = catchAsync(async (req, res, next) => {
  const recurringTransaction = await RecurringTransaction.findOne({
    _id: req.params.id,
    userId: req.user._id
  });
  
  if (!recurringTransaction) {
    return next(new AppError('No recurring transaction found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      recurringTransaction
    }
  });
});

// Update a recurring transaction
exports.updateRecurringTransaction = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  // Find and update the recurring transaction
  const recurringTransaction = await RecurringTransaction.findOneAndUpdate(
    { _id: id, userId },
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!recurringTransaction) {
    return next(new AppError('No recurring transaction found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      recurringTransaction
    }
  });
});

// Toggle active status
exports.toggleActiveStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find the recurring transaction
    const recurringTransaction = await RecurringTransaction.findOne({
      _id: id,
      userId: req.user._id
    }).session(session);
    
    if (!recurringTransaction) {
      await session.abortTransaction();
      return next(new AppError('No recurring transaction found with that ID', 404));
    }
    
    // Toggle the active status
    recurringTransaction.isActive = !recurringTransaction.isActive;
    
    // If we're reactivating, calculate the next occurrence if it's in the past
    if (recurringTransaction.isActive) {
      const now = new Date();
      if (!recurringTransaction.nextOccurrence || recurringTransaction.nextOccurrence < now) {
        // Find the next valid occurrence after now
        let nextOccurrence = new RecurringTransaction(recurringTransaction).calculateNextOccurrence(now);
        
        // If no valid next occurrence (e.g., past end date), don't activate
        if (!nextOccurrence) {
          await session.abortTransaction();
          return next(new AppError('Cannot activate - no valid future occurrences', 400));
        }
        
        recurringTransaction.nextOccurrence = nextOccurrence;
      }
    }
    
    await recurringTransaction.save({ session });
    await session.commitTransaction();
    
    res.status(200).json({
      status: 'success',
      data: {
        recurringTransaction
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error toggling active status:', {
      error: error.message,
      stack: error.stack,
      recurringTransactionId: id,
      userId: req.user._id
    });
    next(error);
  } finally {
    session.endSession();
  }
});

// Delete a recurring transaction
exports.deleteRecurringTransaction = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find and delete the recurring transaction
    const recurringTransaction = await RecurringTransaction.findOneAndDelete(
      { _id: id, userId },
      { session }
    );
    
    if (!recurringTransaction) {
      await session.abortTransaction();
      return next(new AppError('No recurring transaction found with that ID', 404));
    }
    
    // Optionally, you might want to delete any future transactions created by this recurring transaction
    // This is commented out as it depends on your business logic
    // await Transaction.deleteMany(
    //   {
    //     recurringTransactionId: id,
    //     date: { $gt: new Date() },
    //     userId
    //   },
    //   { session }
    // );
    
    await session.commitTransaction();
    
    res.status(204).json({
      status: 'success',
      data: null
    });
    
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error deleting recurring transaction:', {
      error: error.message,
      stack: error.stack,
      recurringTransactionId: id,
      userId
    });
    next(error);
  } finally {
    session.endSession();
  }
});

// Toggle active status of a recurring transaction
exports.toggleActiveStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find the recurring transaction
    const recurringTransaction = await RecurringTransaction.findOne({
      _id: id,
      userId
    }).session(session);
    
    if (!recurringTransaction) {
      await session.abortTransaction();
      return next(new AppError('No recurring transaction found with that ID', 404));
    }
    
    // Toggle the active status
    recurringTransaction.isActive = !recurringTransaction.isActive;
    
    // If we're reactivating, calculate the next occurrence if it's in the past
    if (recurringTransaction.isActive) {
      const now = new Date();
      if (!recurringTransaction.nextOccurrence || recurringTransaction.nextOccurrence < now) {
        // Find the next valid occurrence after now
        let nextOccurrence = new RecurringTransaction(recurringTransaction).calculateNextOccurrence(now);
        
        // If no valid next occurrence (e.g., past end date), don't activate
        if (!nextOccurrence) {
          await session.abortTransaction();
          return next(new AppError('Cannot activate - no valid future occurrences', 400));
        }
        
        recurringTransaction.nextOccurrence = nextOccurrence;
      }
    }
    
    await recurringTransaction.save({ session });
    await session.commitTransaction();
    
    res.status(200).json({
      status: 'success',
      data: {
        recurringTransaction
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error toggling active status:', {
      error: error.message,
      stack: error.stack,
      recurringTransactionId: id,
      userId
    });
    next(error);
  } finally {
    session.endSession();
  }
});

// Process all due recurring transactions
exports.processRecurringTransactions = catchAsync(async () => {
  const now = new Date();
  logger.info('Starting to process recurring transactions', { timestamp: now });
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find all recurring transactions that need to be processed
    const recurringTransactions = await RecurringTransaction.getTransactionsToProcess()
      .session(session)
      .lean();
    
    logger.info(`Found ${recurringTransactions.length} recurring transactions to process`);
    
    let processedCount = 0;
    const recurringUpdates = [];
    
    for (const rt of recurringTransactions) {
      try {
        // Create a new transaction using the transaction controller
        const { _id, userId, type, amount, category, description } = rt;
        
        // Create a mock request object for the transaction controller
        const mockReq = {
          body: {
            type,
            amount,
            category,
            description: description || `Recurring: ${category}`,
            date: rt.nextOccurrence
          },
          userId: userId.toString()
        };
        
        // Create a mock response object
        const mockRes = {
          status: function(code) {
            this.statusCode = code;
            return this;
          },
          json: function(data) {
            if (this.statusCode >= 400) {
              throw new Error(data.message || 'Failed to create transaction');
            }
            return data;
          }
        };
        
        // Use the transaction controller to create the transaction
        await createTransaction(mockReq, mockRes);
        
        logger.info(`Created transaction for recurring record ${_id} (${category} - ${amount})`);
        processedCount++;
        
        // Calculate the next occurrence
        const nextOccurrence = new RecurringTransaction(rt).calculateNextOccurrence();
        
        // If there's no next occurrence (e.g., past end date), mark as inactive
        const isActive = !!nextOccurrence;
        
        recurringUpdates.push({
          updateOne: {
            filter: { _id },
            update: {
              $set: {
                lastProcessed: now,
                nextOccurrence: nextOccurrence || rt.nextOccurrence,
                isActive
              }
            }
          }
        });
        
        logger.info(`Next occurrence for ${_id}: ${nextOccurrence || 'NONE (inactive)'}`);
        
      } catch (processError) {
        logger.error('Error processing recurring transaction:', {
          error: processError.message,
          stack: processError.stack,
          recurringTransactionId: rt?._id
        });
        // Continue with the next transaction even if one fails
      }
    }
    
    // Bulk update recurring transactions
    if (recurringUpdates.length > 0) {
      logger.info(`Updating ${recurringUpdates.length} recurring transactions`);
      await RecurringTransaction.bulkWrite(recurringUpdates, { session });
    } else {
      logger.info('No recurring transactions to update');
    }
    
    await session.commitTransaction();
    logger.info('Successfully committed transaction');
    
    return {
      success: true,
      processed: processedCount,
      timestamp: new Date()
    };
    
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error processing recurring transactions:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
    
  } finally {
    session.endSession();
  }
});
