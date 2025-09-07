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
transactionSchema.statics.getAnalytics = async function(userId, startDate, endDate, includeRecurring = false) {
  console.log('getAnalytics called with:', { userId, startDate, endDate, includeRecurring });
  
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  // Exclude recurring transactions unless explicitly included
  if (!includeRecurring) {
    matchStage.isFromRecurring = { $ne: true };
  }
  
  console.log('Match stage:', JSON.stringify(matchStage, null, 2));
  console.log('Date range:', {
    startDate: new Date(startDate),
    endDate: new Date(endDate)
  });

  try {
    // First, check if there are any matching documents
    const count = await this.countDocuments(matchStage);
    console.log(`Found ${count} matching transactions`);
    
    if (count === 0) {
      console.log('No transactions found for the given criteria');
      return [{
        totalsByType: [],
        categoryBreakdown: [],
        monthlyTrend: []
      }];
    }
    
    // Log sample of matching documents
    const sample = await this.find(matchStage).limit(2);
    console.log('Sample transactions:', sample.map(t => ({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      isFromRecurring: t.isFromRecurring
    })));
  } catch (err) {
    console.error('Error checking transaction count:', err);
  }

  const pipeline = [
    {
      $match: matchStage
    },
    {
      $facet: {
        totalsByType: [
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ],
        categoryBreakdown: [
          {
            $match: { type: 'expense' }
          },
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { total: -1 }
          }
        ],
        monthlyTrend: [
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' },
                type: '$type'
              },
              total: { $sum: '$amount' }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1 }
          }
        ]
      }
    }
  ];

  return await this.aggregate(pipeline);
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