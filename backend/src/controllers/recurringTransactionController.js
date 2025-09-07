const mongoose = require('mongoose');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

// Create a new recurring transaction
exports.createRecurringTransaction = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  logger.info(`Creating new recurring transaction for user ${userId}`);
  
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
    const recurringTransaction = await RecurringTransaction.create({
      ...req.body,
      userId
    });
    
    logger.info(`Created recurring transaction ${recurringTransaction._id} for user ${userId}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        recurringTransaction
      }
    });
    
  } catch (error) {
    logger.error('Error creating recurring transaction:', {
      error: error.message,
      stack: error.stack,
      userId,
      requestBody: req.body
    });
    next(error);
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

// Delete a recurring transaction
exports.deleteRecurringTransaction = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  const recurringTransaction = await RecurringTransaction.findOneAndDelete({
    _id: id,
    userId
  });
  
  if (!recurringTransaction) {
    return next(new AppError('No recurring transaction found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Toggle active status of a recurring transaction
exports.toggleActiveStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  const recurringTransaction = await RecurringTransaction.findOne({
    _id: id,
    userId
  });
  
  if (!recurringTransaction) {
    return next(new AppError('No recurring transaction found with that ID', 404));
  }
  
  recurringTransaction.isActive = !recurringTransaction.isActive;
  await recurringTransaction.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      recurringTransaction
    }
  });
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
    
    const transactionsToCreate = [];
    const recurringUpdates = [];
    
    for (const rt of recurringTransactions) {
      try {
        // Create a new transaction based on the recurring transaction
        const { _id, userId, type, amount, category, description } = rt;
        
        transactionsToCreate.push({
          userId,
          type,
          amount,
          category,
          description: description || `Recurring: ${category}`,
          date: rt.nextOccurrence,
          isFromRecurring: true,
          recurringTransactionId: _id
        });
        
        logger.info(`Prepared transaction for recurring record ${_id} (${category} - ${amount})`);
        
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
    
    // Bulk create transactions
    if (transactionsToCreate.length > 0) {
      logger.info(`Creating ${transactionsToCreate.length} new transactions`);
      await Transaction.insertMany(transactionsToCreate, { session });
    } else {
      logger.info('No new transactions to create');
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
      processed: transactionsToCreate.length,
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
