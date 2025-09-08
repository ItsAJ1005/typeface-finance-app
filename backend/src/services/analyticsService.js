const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

/**
 * Get spending by category for a specific time period
 * @param {string} userId - The ID of the user
 * @param {Date} startDate - Start date for the period
 * @param {Date} endDate - End date for the period
 * @returns {Promise<Object>} Object with categories as keys and total amounts as values
 */
const getSpendingByCategory = async (userId, startDate, endDate) => {
  try {
    console.log('getSpendingByCategory - Input:', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const matchStage = {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      type: 'expense'
    };

    console.log('MongoDB Match Query:', JSON.stringify(matchStage, null, 2));

    const result = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 },
          sampleIds: { $push: '$_id' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    console.log('Aggregation result:', JSON.stringify(result, null, 2));

    // Get sample transactions for debugging
    const sampleTransactions = await Transaction.find({
      userId: userId,
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    }).limit(5);

    console.log('Sample transactions:', sampleTransactions.map(t => ({
      _id: t._id,
      amount: t.amount,
      category: t.category,
      date: t.date,
      description: t.description
    })));

    // Convert array to object with category names as keys
    const categoryTotals = result.reduce((acc, { _id, total }) => {
      acc[_id || 'Uncategorized'] = total;
      return acc;
    }, {});

    console.log('Category totals:', JSON.stringify(categoryTotals, null, 2));
    return categoryTotals;
  } catch (error) {
    console.error('Error in getSpendingByCategory:', error);
    return {};
  }
};

/**
 * Get income vs expenses for a specific time period
 * @param {string} userId - The ID of the user
 * @param {Date} startDate - Start date for the period
 * @param {Date} endDate - End date for the period
 * @returns {Promise<Object>} Object with income, expenses, and net amounts
 */
const getIncomeVsExpenses = async (userId, startDate, endDate) => {
  try {
    console.log('getIncomeVsExpenses - Input:', { 
      userId, 
      startDate, 
      endDate,
      startDateType: typeof startDate,
      endDateType: typeof endDate
    });

    // Log sample transactions for debugging
    const sampleTransactions = await Transaction.find({
      userId: userId,
      date: { $gte: startDate, $lte: endDate }
    }).limit(5);
    
    console.log('Sample transactions found:', sampleTransactions.map(t => ({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      description: t.description
    })));

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: '$type',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('Aggregation result:', result);

    const summary = {
      income: 0,
      expense: 0,
      net: 0,
      incomeCount: 0,
      expenseCount: 0
    };

    result.forEach(item => {
      if (item._id === 'income') {
        summary.income = item.amount;
        summary.incomeCount = item.count;
      } else if (item._id === 'expense') {
        summary.expense = item.amount;
        summary.expenseCount = item.count;
      }
    });

    summary.net = summary.income - summary.expense;
    console.log('Returning summary:', summary);
    return summary;
  } catch (error) {
    console.error('Error in getIncomeVsExpenses:', error);
    return { income: 0, expense: 0, net: 0 };
  }
};

/**
 * Get recent transactions
 * @param {string} userId - The ID of the user
 * @param {number} limit - Maximum number of transactions to return
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<Array>} Array of recent transactions
 */
const getRecentTransactions = async (userId, limit = 5, startDate, endDate) => {
  try {
    const query = { userId };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    console.log('getRecentTransactions query:', {
      userId,
      limit,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      query
    });
    
    const transactions = await Transaction.find(query)
      .sort({ date: -1, _id: -1 })
      .limit(limit)
      .lean();
      
    console.log(`Found ${transactions.length} recent transactions`);
    return transactions;
  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    return [];
  }
};

/**
 * Get spending trends over time
 * @param {string} userId - The ID of the user
 * @param {Date} startDate - Start date for the period
 * @param {Date} endDate - End date for the period
 * @param {string} groupBy - Grouping period ('day', 'week', 'month')
 * @returns {Promise<Array>} Array of spending data points
 */
const getSpendingTrends = async (userId, startDate, endDate, groupBy = 'month') => {
  try {
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%U';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
    }

    return await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startDate, $lte: endDate },
          type: 'expense'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$date'
            }
          },
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
  } catch (error) {
    console.error('Error in getSpendingTrends:', error);
    return [];
  }
};

/**
 * Get top N transactions by amount
 * @param {string} userId - The ID of the user
 * @param {number} limit - Maximum number of transactions to return
 * @param {Date} [startDate] - Optional start date filter
 * @param {Date} [endDate] - Optional end date filter
 * @returns {Promise<Array>} Array of transactions sorted by amount (descending)
 */
const getTopTransactions = async (userId, limit = 5, startDate, endDate) => {
  try {
    const match = { userId };
    
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    return await Transaction.find(match)
      .sort({ amount: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error in getTopTransactions:', error);
    return [];
  }
};

/**
 * Count transactions for a specific time period
 * @param {string} userId - The ID of the user
 * @param {Date} [startDate] - Optional start date filter
 * @param {Date} [endDate] - Optional end date filter
 * @returns {Promise<number>} Count of transactions
 */
const countTransactions = async (userId, startDate, endDate) => {
  try {
    const match = { userId };
    
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    return await Transaction.countDocuments(match);
  } catch (error) {
    console.error('Error in countTransactions:', error);
    return 0;
  }
};

module.exports = {
  getSpendingByCategory,
  getIncomeVsExpenses,
  getRecentTransactions,
  countTransactions,
  getTopTransactions,
  getSpendingTrends
};
