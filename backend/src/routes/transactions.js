const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Validation rules
const transactionValidation = [
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense'),
  body('amount')
    .isFloat({ min: 0.01, max: 10000000 })
    .withMessage('Amount must be between ₹0.01 and ₹1,00,00,000'),
  body('category')
    .isIn([
      'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
      'Healthcare', 'Utilities', 'Education', 'Travel', 'Salary',
      'Business', 'Investment', 'Others'
    ])
    .withMessage('Invalid category selected'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date')
];

// Create transaction
router.post('/', auth, transactionValidation, async (req, res) => {
  try {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, amount, category, description, date } = req.body;

    const transaction = new Transaction({
      userId: req.userId,
      type,
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date()
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
});

// Update transaction
router.put('/:id', auth, transactionValidation, async (req, res) => {
  try {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, amount, category, description, date } = req.body;
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        type,
        amount: parseFloat(amount),
        category,
        description: description || '',
        date: date ? new Date(date) : new Date()
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
      message: 'Failed to update transaction',
      error: error.message
    });
  }
});

// Get transactions with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category, startDate, endDate, search } = req.query;
    const filter = { userId: req.userId };
    
    if (type && ['income', 'expense'].includes(type)) filter.type = type;
    if (category) filter.category = category;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    
    if (search) filter.description = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
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
});

// Analytics endpoint
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period, startDate: startDateParam, endDate: endDateParam } = req.query;
    // Optional flags
    const includeTransactions = String(req.query.includeTransactions || '').toLowerCase() === 'true';
    const includeRecurring = String(req.query.includeRecurring || '').toLowerCase() === 'true';

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    let startDate;

    if (startDateParam) {
      startDate = new Date(startDateParam);
    } else {
      startDate = new Date(endDate);
      switch (period) {
        case '7d': startDate.setDate(endDate.getDate() - 7); break;
        case '30d': startDate.setDate(endDate.getDate() - 30); break;
        case '90d': startDate.setDate(endDate.getDate() - 90); break;
        case '6m': startDate.setMonth(endDate.getMonth() - 6); break;
        case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
        default: startDate.setDate(endDate.getDate() - 30);
      }
    }

    // Use model helper to compute analytics, including heatmap facet
    const analyticsArr = await Transaction.getAnalytics(
      req.userId,
      startDate,
      endDate,
      includeRecurring,
      includeTransactions
    );

    const result = analyticsArr && analyticsArr[0] ? analyticsArr[0] : {
      totalsByType: [],
      categoryBreakdown: [],
      monthlyTrend: [],
      heatmapData: [],
      transactions: includeTransactions ? [] : undefined
    };

    const totals = { income: 0, expense: 0 };
    (result.totalsByType || []).forEach(item => { totals[item._id] = item.total || 0; });

    const categoryBreakdown = (result.categoryBreakdown || []).map(item => ({
      name: item._id,
      amount: item.total || 0,
      percentage: totals.expense > 0 ? (item.total / totals.expense) * 100 : 0
    }));

    const monthlyTrendMap = {};
    (result.monthlyTrend || []).forEach(item => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthlyTrendMap[key]) monthlyTrendMap[key] = { income: 0, expense: 0 };
      monthlyTrendMap[key][item._id.type] = item.total || 0;
    });

    const monthlyTrend = Object.entries(monthlyTrendMap).map(([month, d]) => ({
      month,
      income: d.income || 0,
      expense: d.expense || 0,
      balance: (d.income || 0) - (d.expense || 0)
    }));

    // Heatmap data prepared in the aggregation
    const heatmapData = Array.isArray(result.heatmapData) ? result.heatmapData : [];

    // Build response
    const responseData = {
      summary: {
        totalIncome: totals.income,
        totalExpense: totals.expense,
        balance: totals.income - totals.expense,
        period: { startDate, endDate }
      },
      categoryBreakdown,
      monthlyTrend,
      heatmapData,
      totalTransactions: (result.totalsByType || []).reduce((sum, t) => sum + (t.count || 0), 0)
    };

    if (includeTransactions && Array.isArray(result.transactions)) {
      responseData.transactions = result.transactions;
    }

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
      error: error.message
    });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete transaction' });
  }
});

module.exports = router;
