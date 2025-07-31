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
    const filter = { userId: req.userId };

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
    const {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate = new Date()
    } = req.query;

    const analytics = await Transaction.getAnalytics(req.userId, startDate, endDate);
    
    // Process the aggregation results
    const result = analytics[0];
    
    // Calculate totals by type
    const totals = { income: 0, expense: 0 };
    result.totalsByType.forEach(item => {
      totals[item._id] = item.total;
    });

    // Format category breakdown
    const categoryBreakdown = result.categoryBreakdown.map(item => ({
      category: item._id,
      amount: item.total,
      count: item.count,
      percentage: totals.expense > 0 ? ((item.total / totals.expense) * 100).toFixed(1) : 0
    }));

    // Format monthly trend
    const monthlyTrend = {};
    result.monthlyTrend.forEach(item => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthlyTrend[key]) {
        monthlyTrend[key] = { income: 0, expense: 0 };
      }
      monthlyTrend[key][item._id.type] = item.total;
    });

    const monthlyData = Object.keys(monthlyTrend)
      .sort()
      .map(month => ({
        month,
        income: monthlyTrend[month].income,
        expense: monthlyTrend[month].expense,
        balance: monthlyTrend[month].income - monthlyTrend[month].expense
      }));

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome: totals.income,
          totalExpense: totals.expense,
          balance: totals.income - totals.expense,
          period: {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          }
        },
        categoryBreakdown,
        monthlyTrend: monthlyData
      }
    });

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