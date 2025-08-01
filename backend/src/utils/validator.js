const { body, query, param } = require('express-validator');

// Common validation rules
const commonValidations = {
  // Email validation
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  // Password validation
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  // Name validation
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  // Amount validation
  amount: body('amount')
    .isFloat({ min: 0.01, max: 10000000 })
    .withMessage('Amount must be between ₹0.01 and ₹1,00,00,000')
    .custom((value) => {
      if (!Number.isFinite(parseFloat(value))) {
        throw new Error('Amount must be a valid number');
      }
      return true;
    }),

  // Date validation
  date: body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format')
    .custom((value) => {
      const date = new Date(value);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date > tomorrow) {
        throw new Error('Date cannot be in the future');
      }
      return true;
    }),

  // Transaction type validation
  transactionType: body('type')
    .isIn(['income', 'expense'])
    .withMessage('Transaction type must be either "income" or "expense"'),

  // Category validation
  category: body('category')
    .isIn([
      'Food & Dining',
      'Transportation', 
      'Shopping',
      'Entertainment',
      'Healthcare',
      'Utilities',
      'Education',
      'Travel',
      'Salary',
      'Business',
      'Investment',
      'Others'
    ])
    .withMessage('Invalid category selected'),

  // Description validation
  description: body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),

  // MongoDB ObjectId validation
  objectId: (field) => param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`)
};

// Query parameter validations
const queryValidations = {
  // Pagination
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // Date range
  startDate: query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in valid ISO format'),

  endDate: query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in valid ISO format')
    .custom((value, { req }) => {
      if (req.query.startDate && value && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  // Transaction type filter
  typeFilter: query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type filter must be either "income" or "expense"'),

  // Category filter
  categoryFilter: query('category')
    .optional()
    .isIn([
      'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
      'Healthcare', 'Utilities', 'Education', 'Travel', 'Salary',
      'Business', 'Investment', 'Others'
    ])
    .withMessage('Invalid category filter'),

  // Search term
  search: query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
};

// Validation rule sets for different operations
const validationSets = {
  // User registration
  register: [
    commonValidations.name,
    commonValidations.email,
    commonValidations.password
  ],

  // User login
  login: [
    commonValidations.email,
    body('password').notEmpty().withMessage('Password is required')
  ],

  // Create transaction
  createTransaction: [
    commonValidations.transactionType,
    commonValidations.amount,
    commonValidations.category,
    commonValidations.description,
    commonValidations.date
  ],

  // Update transaction
  updateTransaction: [
    commonValidations.objectId('id'),
    commonValidations.transactionType,
    commonValidations.amount,
    commonValidations.category,
    commonValidations.description,
    commonValidations.date
  ],

  // Get transactions with filters
  getTransactions: [
    queryValidations.page,
    queryValidations.limit,
    queryValidations.typeFilter,
    queryValidations.categoryFilter,
    queryValidations.startDate,
    queryValidations.endDate,
    queryValidations.search
  ],

  // Get analytics
  getAnalytics: [
    queryValidations.startDate,
    queryValidations.endDate
  ],

  // Delete transaction
  deleteTransaction: [
    commonValidations.objectId('id')
  ]
};

// Custom validation functions
const customValidators = {
  // Check if email is unique (for registration)
  isEmailUnique: async (email) => {
    const User = require('../models/User');
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('Email is already registered');
    }
    return true;
  },

  // Validate Indian mobile number
  indianMobile: (value) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(value)) {
      throw new Error('Please provide a valid Indian mobile number');
    }
    return true;
  },

  // Validate Indian currency amount
  indianCurrency: (value) => {
    const amount = parseFloat(value);
    if (amount < 0.01 || amount > 10000000) {
      throw new Error('Amount must be between ₹0.01 and ₹1 crore');
    }
    return true;
  },

  // Check if date is not too far in the past (optional validation)
  recentDate: (value, maxDaysBack = 365) => {
    const date = new Date(value);
    const maxPastDate = new Date();
    maxPastDate.setDate(maxPastDate.getDate() - maxDaysBack);
    
    if (date < maxPastDate) {
      throw new Error(`Date cannot be more than ${maxDaysBack} days in the past`);
    }
    return true;
  }
};

// Helper function to format validation errors
const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));
};

module.exports = {
  commonValidations,
  queryValidations,
  validationSets,
  customValidators,
  formatValidationErrors
};