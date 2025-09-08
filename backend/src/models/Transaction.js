const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: ['income', 'expense'],
      message: 'Type must be either income or expense'
    },
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    max: [10000000, 'Amount cannot exceed ₹1 crore'],
    validate: {
      validator: function(v) {
        return Number.isFinite(v) && v > 0;
      },
      message: 'Amount must be a valid positive number'
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: {
      values: [
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
      ],
      message: 'Invalid category selected'
    },
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now,
    index: true,
    validate: {
      validator: function(v) {
        // Allow dates up to 1 year in the future for planning purposes
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        return v <= oneYearFromNow;
      },
      message: 'Transaction date cannot be more than 1 year in the future'
    }
  },
  receiptId: {
    type: String,
    trim: true,
    default: null
  },
  receiptUrl: {
    type: String,
    trim: true,
    default: null
  },
  isFromReceipt: {
    type: Boolean,
    default: false
  },
  isFromRecurring: {
    type: Boolean,
    default: false,
    index: true
  },
  recurringTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringTransaction',
    default: null,
    index: true
  },
  lastAccessed: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for common queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });

// Static method to get user analytics
transactionSchema.statics.getAnalytics = async function(userId, startDate, endDate, includeRecurring = false, includeTransactions = false) {
  console.log('getAnalytics called with:', { 
    userId, 
    startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
    endDate: endDate instanceof Date ? endDate.toISOString() : endDate,
    includeRecurring 
  });
  
  // Ensure dates are proper Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Log the date range being used for the query
  console.log('Analytics date range:', {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    startDateLocal: start.toString(),
    endDateLocal: end.toString()
  });
  
  // Build the base query
  const baseQuery = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: start, $lte: end }
  };
  
  // Add recurring filter if needed
  if (!includeRecurring) {
    baseQuery.$or = [
      { isFromRecurring: { $exists: false } },
      { isFromRecurring: false }
    ];
  }
  
  // If transactions are requested, fetch them first
  let transactions = [];
  if (includeTransactions) {
    transactions = await this.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: start, $lte: end },
      type: 'expense',
      amount: { $gt: 0 }
    })
    .select('amount date type category description')
    .sort({ date: 1 })
    .lean();
    
    console.log(`Fetched ${transactions.length} transactions for analytics`);
    if (transactions.length > 0) {
      console.log('Sample transaction:', {
        date: transactions[0].date,
        amount: transactions[0].amount,
        category: transactions[0].category
      });
    }
  }
  
  // Log the date range being used for the query
  console.log('Analytics date range:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startDateLocal: startDate.toString(),
    endDateLocal: endDate.toString()
  });

  // Debug: Get count of matching documents
  const countQuery = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { 
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (!includeRecurring) {
    countQuery.$or = [
      { isFromRecurring: { $exists: false } },
      { isFromRecurring: false }
    ];
  }

  const count = await this.countDocuments(countQuery);
  console.log(`Found ${count} transactions in date range`);

  // Get a sample of transactions for debugging
  const sampleExpenses = await this.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: start, $lte: end },
    type: 'expense',
    amount: { $gt: 0 }
  }).limit(3);
  
  console.log('Sample expense transactions:', JSON.stringify(sampleExpenses, null, 2));
  
  if (count === 0) {
    console.log('No transactions found for the given criteria');
    const result = {
      totalsByType: [
        { _id: 'income', total: 0, count: 0 },
        { _id: 'expense', total: 0, count: 0 }
      ],
      categoryBreakdown: [],
      monthlyTrend: []
    };
    
    // Add transactions to the result if requested
    if (includeTransactions) {
      result.transactions = [];
    }
    
    return [result];
  }

  // Convert dates to proper Date objects if they're strings
  if (typeof startDate === 'string') startDate = new Date(startDate);
  if (typeof endDate === 'string') endDate = new Date(endDate);
  
  // Ensure end date includes the entire day
  endDate.setHours(23, 59, 59, 999);
  
  console.log('Querying transactions between:', startDate, 'and', endDate);
  
  const pipeline = [
    // First match the documents
    { 
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
        $or: includeRecurring 
          ? [
              { isFromRecurring: { $exists: false } },
              { isFromRecurring: true }
            ]
          : [
              { isFromRecurring: { $exists: false } },
              { isFromRecurring: false }
            ]
      }
    },
    
    // Project to ensure we have the right fields
    {
      $project: {
        type: 1,
        amount: 1,
        category: 1,
        date: 1,
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' }
      }
    },
    
    // Then facet to get all analytics in one query
    {
      $facet: {
        // Totals by type (income/expense)
        totalsByType: [
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ],
        
        // Category breakdown for expenses
        categoryBreakdown: [
          { $match: { type: 'expense' } },
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { total: -1 } }
        ],
        
        // Monthly trend
        monthlyTrend: [
          {
            $group: {
              _id: {
                year: '$year',
                month: '$month',
                type: '$type'
              },
              total: { $sum: '$amount' }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ],
        
        // Heatmap data (daily expenses)
        heatmapData: [
          { $match: { type: 'expense' } },
          {
            $group: {
              _id: {
                year: '$year',
                month: '$month',
                day: '$day'
              },
              amount: { $sum: '$amount' },
              transactions: {
                $push: {
                  amount: '$amount',
                  category: '$category',
                  description: '$description'
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: {
                    $dateFromParts: {
                      year: '$_id.year',
                      month: '$_id.month',
                      day: '$_id.day'
                    }
                  }
                }
              },
              amount: 1,
              transactions: 1
            }
          },
          { $sort: { date: 1 } }
        ]
      }
    },
    
    // Ensure we always have income and expense entries in totalsByType
    {
      $addFields: {
        totalsByType: {
          $let: {
            vars: {
              income: {
                $filter: {
                  input: '$totalsByType',
                  as: 'item',
                  cond: { $eq: ['$$item._id', 'income'] }
                }
              },
              expense: {
                $filter: {
                  input: '$totalsByType',
                  as: 'item',
                  cond: { $eq: ['$$item._id', 'expense'] }
                }
              }
            },
            in: {
              $concatArrays: [
                '$$income',
                '$$expense',
                {
                  $cond: [
                    { $eq: [{ $size: { $filter: { input: '$totalsByType', as: 'item', cond: { $eq: ['$$item._id', 'income'] } } } }, 0] },
                    [{ _id: 'income', total: 0, count: 0 }],
                    []
                  ]
                },
                {
                  $cond: [
                    { $eq: [{ $size: { $filter: { input: '$totalsByType', as: 'item', cond: { $eq: ['$$item._id', 'expense'] } } } }, 0] },
                    [{ _id: 'expense', total: 0, count: 0 }],
                    []
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ];

  const aggregated = await this.aggregate(pipeline);
  // Attach transactions list if requested so frontend can compute weekly patterns/heatmap fallbacks
  if (includeTransactions && Array.isArray(aggregated) && aggregated.length > 0) {
    aggregated[0].transactions = transactions;
  }
  return aggregated;
};

// Instance method to format amount in Indian currency
transactionSchema.methods.getFormattedAmount = function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(this.amount);
};

module.exports = mongoose.model('Transaction', transactionSchema);