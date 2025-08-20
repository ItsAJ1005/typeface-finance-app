/**
 * Smart categorization service for automatic expense categorization
 */
const GeminiService = require('./geminiService');
require('dotenv').config();

const geminiService = new GeminiService(process.env.GEMINI_API_KEY);

// Predefined categories
const CATEGORIES = {
  INCOME: [
    'Salary',
    'Business',
    'Investment',
    'Others'
  ],
  EXPENSE: [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Utilities',
    'Education',
    'Travel',
    'Others'
  ]
};

// Merchant patterns for auto-categorization
const MERCHANT_PATTERNS = {
  'Food & Dining': [
    'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'dining',
    'mcdonalds', 'kfc', 'subway', 'dominos', 'swiggy', 'zomato',
    'hotel', 'bakery', 'sweet', 'juice', 'tea', 'bar', 'pub',
    'dhaba', 'biryani', 'tiffin', 'mess', 'canteen'
  ],
  
  'Transportation': [
    'uber', 'ola', 'taxi', 'auto', 'bus', 'metro', 'train', 'flight',
    'petrol', 'diesel', 'fuel', 'parking', 'toll', 'transport',
    'railway', 'airlines', 'indigo', 'spicejet', 'irctc',
    'rickshaw', 'rapido', 'bike', 'car'
  ],
  
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall',
    'supermarket', 'grocery', 'vegetables', 'market', 'store',
    'bigbasket', 'grofers', 'dmart', 'reliance', 'clothes',
    'fashion', 'electronics', 'mobile', 'laptop'
  ],
  
  'Entertainment': [
    'movie', 'cinema', 'theatre', 'pvr', 'inox', 'netflix',
    'prime', 'hotstar', 'spotify', 'youtube', 'game', 'gaming',
    'club', 'party', 'event', 'concert', 'show', 'subscription'
  ],
  
  'Healthcare': [
    'hospital', 'clinic', 'doctor', 'medical', 'pharmacy', 'medicine',
    'health', 'dental', 'eye', 'checkup', 'test', 'lab',
    'apollo', 'fortis', 'medplus', 'insurance', 'treatment'
  ],
  
  'Utilities': [
    'electricity', 'water', 'gas', 'internet', 'broadband', 'wifi',
    'mobile', 'phone', 'recharge', 'bill', 'utility', 'maintenance',
    'rent', 'society', 'apartment', 'jio', 'airtel', 'vodafone'
  ],
  
  'Education': [
    'school', 'college', 'university', 'course', 'book', 'study',
    'tuition', 'coaching', 'education', 'learning', 'training',
    'certification', 'exam', 'fee', 'library', 'stationery'
  ],
  
  'Travel': [
    'hotel', 'booking', 'travel', 'trip', 'vacation', 'holiday',
    'makemytrip', 'goibibo', 'cleartrip', 'airbnb', 'oyo',
    'resort', 'tour', 'sightseeing', 'visa', 'passport'
  ]
};

// Keywords that suggest income
const INCOME_KEYWORDS = [
  'salary', 'wage', 'payment', 'refund', 'cashback', 'bonus',
  'commission', 'interest', 'dividend', 'profit', 'income',
  'credit', 'deposit', 'transfer', 'received'
];

/**
 * Categorize transaction based on description and merchant info
 * @param {string} description - Transaction description
 * @param {string} merchant - Merchant name (optional)
 * @param {number} amount - Transaction amount
 * @returns {Object} - Category and confidence score
 */
const categorizeTransaction = (description = '', merchant = '', amount = 0) => {
  const text = `${description} ${merchant}`.toLowerCase();
  
  // Check if it's income first
  const isIncome = INCOME_KEYWORDS.some(keyword => text.includes(keyword)) || amount < 0;
  
  if (isIncome) {
    return {
      type: 'income',
      category: 'Salary', // Default income category
      confidence: 0.7
    };
  }
  
  // Find best matching expense category
  let bestMatch = { category: 'Others', confidence: 0 };
  
  for (const [category, patterns] of Object.entries(MERCHANT_PATTERNS)) {
    const matches = patterns.filter(pattern => text.includes(pattern));
    const confidence = matches.length / patterns.length;
    
    if (confidence > bestMatch.confidence) {
      bestMatch = { category, confidence };
    }
  }
  
  // If confidence is too low, use 'Others'
  if (bestMatch.confidence < 0.1) {
    bestMatch = { category: 'Others', confidence: 0.3 };
  }
  
  return {
    type: 'expense',
    category: bestMatch.category,
    confidence: Math.min(bestMatch.confidence * 100, 95), // Max 95% confidence
    matchedKeywords: MERCHANT_PATTERNS[bestMatch.category]?.filter(pattern => text.includes(pattern)) || []
  };
};

/**
 * Get all available categories
 * @param {string} type - 'income' or 'expense'
 * @returns {Array} - List of categories
 */
const getCategories = (type = 'expense') => {
  return type === 'income' ? CATEGORIES.INCOME : CATEGORIES.EXPENSE;
};

/**
 * Validate if category exists
 * @param {string} category - Category to validate
 * @param {string} type - 'income' or 'expense'
 * @returns {boolean} - True if valid category
 */
const isValidCategory = (category, type = 'expense') => {
  const categories = getCategories(type);
  return categories.includes(category);
};

/**
 * Get category suggestions based on partial text
 * @param {string} text - Partial text to match
 * @param {string} type - 'income' or 'expense'
 * @returns {Array} - Suggested categories
 */
const getCategorySuggestions = (text = '', type = 'expense') => {
  const categories = getCategories(type);
  const searchText = text.toLowerCase();
  
  return categories.filter(category => 
    category.toLowerCase().includes(searchText)
  );
};

/**
 * Analyze spending patterns to suggest budget categories
 * @param {Array} transactions - User's transaction history
 * @returns {Object} - Category analysis with spending patterns
 */
const analyzeSpendingPatterns = (transactions = []) => {
  const categoryStats = {};
  const monthlyStats = {};
  
  transactions.forEach(transaction => {
    const { category, amount, date, type } = transaction;
    
    if (type !== 'expense') return;
    
    // Category stats
    if (!categoryStats[category]) {
      categoryStats[category] = {
        total: 0,
        count: 0,
        average: 0,
        transactions: []
      };
    }
    
    categoryStats[category].total += amount;
    categoryStats[category].count += 1;
    categoryStats[category].transactions.push({ amount, date });
    
    // Monthly stats
    const monthKey = new Date(date).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = {};
    }
    if (!monthlyStats[monthKey][category]) {
      monthlyStats[monthKey][category] = 0;
    }
    monthlyStats[monthKey][category] += amount;
  });
  
  // Calculate averages and trends
  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category];
    stats.average = stats.total / stats.count;
    
    // Calculate monthly trend
    const monthlyAmounts = Object.values(monthlyStats)
      .map(month => month[category] || 0)
      .filter(amount => amount > 0);
    
    if (monthlyAmounts.length > 1) {
      const recent = monthlyAmounts.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const older = monthlyAmounts.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(monthlyAmounts.length - 3, 1);
      stats.trend = recent > older ? 'increasing' : 'decreasing';
      stats.trendPercentage = Math.round(((recent - older) / older) * 100);
    } else {
      stats.trend = 'stable';
      stats.trendPercentage = 0;
    }
  });
  
  return {
    categoryStats,
    monthlyStats,
    topCategories: Object.entries(categoryStats)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 5)
      .map(([category, stats]) => ({ category, ...stats }))
  };
};

// Get financial insights for a set of transactions
async function getFinancialInsights(transactions, options = {}) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
    if (!transactions || transactions.length === 0) {
      return { 
        success: true, 
        insights: "No transactions available for analysis. Add some transactions to get personalized insights." 
      };
    }

    const insights = await geminiService.getFinancialInsights(transactions, options);
    return { success: true, insights };
  } catch (error) {
    console.error('Error getting financial insights:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to generate insights',
      details: error.stack
    };
  }
}

// Get financial advice based on user context
async function getFinancialAdvice(userContext) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    if (!userContext) {
      return {
        success: true,
        advice: "No financial context available. Add transactions to receive personalized advice."
      };
    }

    const advice = await geminiService.getFinancialAdvice(userContext);
    return { success: true, advice };
  } catch (error) {
    console.error('Error getting financial advice:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate advice',
      details: error.stack
    };
  }
}

module.exports = {
  categorizeTransaction,
  getCategories,
  isValidCategory,
  getCategorySuggestions,
  analyzeSpendingPatterns,
  CATEGORIES,
  MERCHANT_PATTERNS,
  getFinancialInsights,
  getFinancialAdvice
};