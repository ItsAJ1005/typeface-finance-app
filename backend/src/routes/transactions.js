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
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction'
    });
  }
});

// Get transactions with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category, startDate, endDate, search } = req.query;
    
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
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
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
    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    let transactions = [];
    
    try {
      // Get transactions for the period
      transactions = await Transaction.find({
        userId: req.userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });
    } catch (dbError) {
      console.log('Database not available for analytics, returning empty data');
      // Return empty analytics when database is not available
             return res.json({
         success: true,
         data: {
           totalIncome: 0,
           totalExpenses: 0,
           categoryBreakdown: [],
           monthlyTrend: [],
           topCategories: [],
           averageDailySpending: 0,
           largestTransaction: 0,
           totalTransactions: 0,
           expenseToIncomeRatio: 0,
           daysAnalyzed: 0,
           dataCompleteness: 0,
           heatmapData: [],
           weeklyPattern: [],
           maxDailySpending: 0,
           recommendations: ["Start adding transactions to see detailed financial analysis and insights."]
         }
       });
    }

    // Calculate basic metrics
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Category breakdown
    const categoryBreakdown = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!categoryBreakdown[t.category]) {
          categoryBreakdown[t.category] = 0;
        }
        categoryBreakdown[t.category] += t.amount;
      });

    const categoryBreakdownArray = Object.entries(categoryBreakdown)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? amount / totalExpenses : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly trend
    const monthlyTrend = [];
    const months = {};
    
    transactions.forEach(t => {
      const monthKey = t.date.toISOString().slice(0, 7); // YYYY-MM
      if (!months[monthKey]) {
        months[monthKey] = { expenses: 0, income: 0 };
      }
      if (t.type === 'expense') {
        months[monthKey].expenses += t.amount;
      } else {
        months[monthKey].income += t.amount;
      }
    });

    Object.entries(months).forEach(([month, data]) => {
      monthlyTrend.push({
        month: new Date(month + '-01').toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        }),
        expenses: data.expenses,
        income: data.income
      });
    });

    // Top categories
    const topCategories = categoryBreakdownArray.slice(0, 5);

    // Spending patterns
    const daysAnalyzed = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const averageDailySpending = daysAnalyzed > 0 ? totalExpenses / daysAnalyzed : 0;
    const largestTransaction = transactions.length > 0 
      ? Math.max(...transactions.map(t => t.amount))
      : 0;

    // Financial health metrics
    const expenseToIncomeRatio = totalIncome > 0 ? totalExpenses / totalIncome : 0;
    const dataCompleteness = transactions.length > 0 ? Math.min(1, transactions.length / 30) : 0;

    // Generate heatmap data
    const heatmapData = [];
    const weeklyPattern = [];
    const maxDailySpending = Math.max(...transactions
      .filter(t => t.type === 'expense')
      .map(t => t.amount), 0);

    // Create daily spending data for heatmap
    const dailySpending = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const dateKey = t.date.toISOString().split('T')[0];
        if (!dailySpending[dateKey]) {
          dailySpending[dateKey] = 0;
        }
        dailySpending[dateKey] += t.amount;
      });

    // Fill in missing days with 0 spending
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
      const formattedDate = currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      heatmapData.push({
        date: formattedDate,
        amount: dailySpending[dateKey] || 0,
        dayOfWeek: currentDate.getDay()
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate weekly pattern
    const weeklySpending = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const dayOfWeek = t.date.getDay();
        const dayName = t.date.toLocaleDateString('en-US', { weekday: 'long' });
        if (!weeklySpending[dayOfWeek]) {
          weeklySpending[dayOfWeek] = { day: dayName, amount: 0 };
        }
        weeklySpending[dayOfWeek].amount += t.amount;
      });

    // Fill in all days of the week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 7; i++) {
      if (!weeklySpending[i]) {
        weeklySpending[i] = { day: dayNames[i], amount: 0 };
      }
    }

    // Sort by day of week (Sunday = 0)
    Object.values(weeklySpending)
      .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day))
      .forEach(day => {
        weeklyPattern.push(day);
      });

    // Generate recommendations
    const recommendations = [];
    
    if (expenseToIncomeRatio > 0.8) {
      recommendations.push("Your expenses are high relative to income. Consider reducing non-essential spending.");
    }
    
    if (expenseToIncomeRatio > 1) {
      recommendations.push("You're spending more than you earn. Focus on increasing income or reducing expenses.");
    }

    const topCategory = categoryBreakdownArray[0];
    if (topCategory && topCategory.percentage > 0.4) {
      recommendations.push(`Your top spending category (${topCategory.name}) represents ${(topCategory.percentage * 100).toFixed(1)}% of expenses. Consider if this aligns with your financial goals.`);
    }

    if (totalIncome > 0 && (totalIncome - totalExpenses) / totalIncome < 0.2) {
      recommendations.push("Your savings rate is below 20%. Aim to save at least 20% of your income for financial security.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Great job! Your financial habits look healthy. Keep up the good work!");
    }

    const analytics = {
      totalIncome,
      totalExpenses,
      categoryBreakdown: categoryBreakdownArray,
      monthlyTrend,
      topCategories,
      averageDailySpending,
      largestTransaction,
      totalTransactions: transactions.length,
      expenseToIncomeRatio,
      daysAnalyzed,
      dataCompleteness,
      heatmapData,
      weeklyPattern,
      maxDailySpending,
      recommendations
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics'
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
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction'
    });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
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
});

module.exports = router;