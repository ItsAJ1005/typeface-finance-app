const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { validationResult } = require('express-validator');

// Create new transaction
const createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, amount, category, description, date, receiptId, receiptUrl } = req.body;

    const transaction = new Transaction({
      userId: req.userId,
      type,
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date(),
      receiptId: receiptId || null,
      receiptUrl: receiptUrl || null,
      isFromReceipt: !!receiptId
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction'
    });
  }
};

// Get all transactions with pagination and filters
const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = { 
      userId: req.userId,
      // Include all transactions by default, including recurring ones
      $or: [
        { isFromRecurring: { $exists: false } }, // Regular transactions
        { isFromRecurring: false } // Explicitly included recurring transactions
      ]
    };

    if (type && ['income', 'expense'].includes(type)) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        filter.date.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalTransactions: total,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions'
    });
  }
};

// Get single transaction
const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      userId: req.userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction'
    });
  }
};

// Update transaction
const updateTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { type, amount, category, description, date } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId: req.userId },
      {
        type,
        amount: parseFloat(amount),
        category,
        description: description || '',
        date: date ? new Date(date) : undefined
      },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction }
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction'
    });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction'
    });
  }
};

// Get analytics data
const getAnalytics = async (req, res) => {
  try {
    // Parse dates with proper timezone handling
    let startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    
    let endDate = req.query.endDate 
      ? new Date(req.query.endDate)
      : new Date();
    endDate.setUTCHours(23, 59, 59, 999);
    
    const includeRecurring = req.query.includeRecurring !== 'false'; // true by default
    const period = req.query.period || '30d'; // Default to 30 days

    console.log('Analytics request details:', {
      userId: req.userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period,
      includeRecurring
    });
    
    // Check if transactions should be included in the response
    const includeTransactions = req.query.includeTransactions === 'true';
    
    const analytics = await Transaction.getAnalytics(
      req.userId, 
      startDate, 
      endDate,
      includeRecurring,
      includeTransactions
    );
    
    console.log('Analytics query complete. Include transactions:', includeTransactions);
    
    console.log('Raw analytics result from model:', JSON.stringify(analytics, null, 2));
    
    // Process the aggregation results
    const result = analytics[0];
    console.log('First result from analytics:', JSON.stringify(result, null, 2));
    
    // Calculate totals by type
    const totals = { income: 0, expense: 0 };
    if (result?.totalsByType) {
      result.totalsByType.forEach(item => {
        console.log(`Processing total for type ${item._id}:`, item.total);
        totals[item._id] = item.total;
      });
    } else {
      console.warn('No totalsByType in analytics result');
    }

    // Format category breakdown
    const categoryBreakdown = result.categoryBreakdown.map(item => ({
      category: item._id,
      amount: item.total,
      count: item.count,
      percentage: totals.expense > 0 ? ((item.total / totals.expense) * 100).toFixed(1) : 0
    }));

    // Format monthly trend data
    const monthlyTrend = [];
    const monthlyData = {};
    
    if (result.monthlyTrend) {
      result.monthlyTrend.forEach(item => {
        const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            income: 0,
            expense: 0
          };
        }
        monthlyData[monthKey][item._id.type] = item.total;
      });
      
      // Convert to array and sort by month
      Object.values(monthlyData).forEach(month => {
        monthlyTrend.push({
          month: month.month,
          income: month.income,
          expense: month.expense,
          balance: month.income - month.expense
        });
      });
      
      monthlyTrend.sort((a, b) => a.month.localeCompare(b.month));
    }
    
    // Generate heatmap data from transactions
    console.log('Querying transactions for heatmap between:', startDate, 'and', endDate);
    console.log('User ID:', req.userId);
    
    // Use the same date range as the analytics query
    const heatmapQuery = {
      userId: new mongoose.Types.ObjectId(req.userId),
      date: { 
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      type: 'expense',
      amount: { $gt: 0 }
    };
    
    console.log('Heatmap query:', JSON.stringify({
      ...heatmapQuery,
      userId: '...',
      date: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString()
      }
    }, null, 2));
    
    const transactions = await Transaction.find(heatmapQuery)
      .select('amount date category description')
      .sort({ date: 1 })
      .lean();
      
    console.log(`Found ${transactions.length} expense transactions for heatmap`);
    if (transactions.length > 0) {
      console.log('Sample transaction:', {
        date: transactions[0].date,
        amount: transactions[0].amount,
        category: transactions[0].category
      });
    }
    
    // Group transactions by date
    const dailySpending = {};
    
    // Initialize all dates in range with 0 amount
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailySpending[dateStr] = {
        date: dateStr,
        amount: 0,
        transactions: []
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add actual transaction data
    transactions.forEach(tx => {
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      if (!dailySpending[dateStr]) {
        dailySpending[dateStr] = {
          date: dateStr,
          amount: 0,
          transactions: []
        };
      }
      dailySpending[dateStr].amount += Math.abs(Number(tx.amount));
      dailySpending[dateStr].transactions.push({
        amount: Math.abs(Number(tx.amount)),
        category: tx.category,
        description: tx.description || ''
      });
    });
    
    // Convert to array and sort by date
    const heatmapData = Object.values(dailySpending)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(day => ({
        ...day,
        amount: Number(day.amount.toFixed(2))
      }));
    
    console.log('Generated heatmap data points:', heatmapData.length);
    if (heatmapData.length > 0) {
      console.log('Sample heatmap data:', JSON.stringify(heatmapData[0], null, 2));
    }

    // Prepare response data
    const responseData = {
      success: true,
      data: {
        summary: {
          totalIncome: totals.income,
          totalExpense: totals.expense,
          balance: totals.income - totals.expense,
          period: {
            start: startDate,
            end: endDate,
            days: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
          }
        },
        categoryBreakdown,
        monthlyTrend,
        heatmapData,
        totalTransactions: (totals.income_count || 0) + (totals.expense_count || 0)
      }
    };

    // Include transactions in the response if requested
    if (includeTransactions && result.transactions) {
      responseData.data.transactions = result.transactions;
      console.log(`Included ${result.transactions.length} transactions in response`);
    }

    res.json(responseData);

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics'
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getAnalytics
};