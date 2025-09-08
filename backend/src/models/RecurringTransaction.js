const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
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
        'Rent/Mortgage',
        'Subscriptions',
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
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: {
      values: ['daily', 'weekly', 'monthly', 'yearly'],
      message: 'Frequency must be one of: daily, weekly, monthly, yearly'
    }
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
    validate: {
      validator: function(v) {
        if (this.frequency === 'monthly' && !v) {
          return false;
        }
        return true;
      },
      message: 'Day of month is required for monthly frequency'
    }
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    validate: {
      validator: function(v) {
        if (this.frequency === 'weekly' && v === undefined) {
          return false;
        }
        return true;
      },
      message: 'Day of week is required for weekly frequency'
    }
  },
  month: {
    type: Number,
    min: 0,
    max: 11,
    validate: {
      validator: function(v) {
        if (this.frequency === 'yearly' && v === undefined) {
          return false;
        }
        return true;
      },
      message: 'Month is required for yearly frequency'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastProcessed: {
    type: Date
  },
  nextOccurrence: {
    type: Date,
    required: true,
    index: true
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying of recurring transactions that need to be processed
recurringTransactionSchema.index({ isActive: 1, nextOccurrence: 1 });

// Method to calculate next occurrence
recurringTransactionSchema.methods.calculateNextOccurrence = function() {
  if (!this.isActive) return null;
  
  const now = new Date();
  let nextDate = new Date(this.nextOccurrence || this.startDate);
  
  // If next occurrence is in the future, use it as base
  if (this.nextOccurrence && this.nextOccurrence > now) {
    nextDate = new Date(this.nextOccurrence);
  }
  
  // Calculate next occurrence based on frequency
  switch (this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
      
    case 'weekly':
      // Find next occurrence of the specified day of week
      const targetDay = this.dayOfWeek;
      const currentDay = nextDate.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      daysToAdd = daysToAdd === 0 ? 7 : daysToAdd; // If same day, go to next week
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      break;
      
    case 'monthly':
      // Move to next month
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      // Handle end of month (e.g., Jan 31 -> Feb 28/29)
      const targetDayOfMonth = Math.min(this.dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate());
      nextDate.setDate(targetDayOfMonth);
      break;
      
    case 'yearly':
      // Move to next year
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  // If end date is set and next occurrence is after end date, return null
  if (this.endDate && nextDate > this.endDate) {
    return null;
  }
  
  return nextDate;
};

// Pre-save hook to set the next occurrence
recurringTransactionSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('frequency') || this.isModified('startDate') || this.isModified('endDate')) {
    this.nextOccurrence = this.startDate;
    
    // If the start date is in the past, calculate the next occurrence
    if (this.startDate < new Date()) {
      this.nextOccurrence = this.calculateNextOccurrence();
    }
  }
  
  next();
});

// Static method to get all recurring transactions that need to be processed
recurringTransactionSchema.statics.getTransactionsToProcess = async function() {
  const now = new Date();
  return this.find({
    isActive: true,
    nextOccurrence: { $lte: now },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: now } }
    ]
  });
};

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
