const express = require('express');
const { auth } = require('../middleware/auth');
const categoryService = require('../services/categoryService');
const Transaction = require('../models/Transaction');
const { handleChatMessage, clearChatHistory } = require('../controllers/aiChatController');

const router = express.Router();

// Simple in-memory cache (per-process)
const aiCache = new Map(); // key -> { data, expiresAt }
const setCache = (key, data, ttlMs = 3 * 60 * 1000) => {
  aiCache.set(key, { data, expiresAt: Date.now() + ttlMs });
};
const getCache = (key) => {
  const entry = aiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aiCache.delete(key);
    return null;
  }
  return entry.data;
};

// Get AI-powered financial insights
router.get('/insights', auth, async (req, res) => {
  try {
    const cacheKey = `insights:${req.userId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Fetch user's transactions for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await Transaction.find({
      userId: req.userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 }).lean();

    // Build date range label for the insights header
    const endDate = new Date();
    const formatMonthYear = (d) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const dateRangeLabel = `${formatMonthYear(thirtyDaysAgo)} - ${formatMonthYear(endDate)}`;

    const insights = await categoryService.getFinancialInsights(transactions, { dateRangeLabel });

    if (!insights || insights.success === false) {
      return res.status(500).json({
        success: false,
        message: insights?.error || 'Failed to generate financial insights',
        details: insights?.details
      });
    }

    const insightsText = typeof insights === 'string'
      ? insights
      : (insights.insights || insights.data || '');

    setCache(cacheKey, insightsText, 60 * 1000); // cache 60s
    return res.json({ success: true, data: insightsText });
  } catch (error) {
    console.error('Error getting financial insights:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate financial insights'
    });
  }
});

// Chat with AI assistant
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a non-empty string'
      });
    }

    // Process the chat message with proper user isolation
    await handleChatMessage(req, res);
  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle specific error cases
    if (error.message.includes('Failed to process chat message')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process your message. Please try again.'
      });
    }
    
    // General error response
    res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Clear chat history
router.delete('/chat', auth, async (req, res) => {
  try {
    await clearChatHistory(req, res);
  } catch (error) {
    console.error('Error in clear chat history route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear chat history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get personalized financial advice
router.get('/advice', auth, async (req, res) => {
  try {
    const cacheKey = `advice:${req.userId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Fetch user's financial context for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await Transaction.find({
      userId: req.userId,
      date: { $gte: thirtyDaysAgo }
    }).lean();

    // Calculate basic metrics
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const categorizedExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const userContext = {
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpense,
      savingsRate: ((totalIncome - totalExpense) / (totalIncome || 1)) * 100,
      expensesByCategory: categorizedExpenses,
      transactionCount: transactions.length
    };

    const advice = await categoryService.getFinancialAdvice(userContext);

    if (!advice || advice.success === false) {
      return res.status(500).json({
        success: false,
        message: advice?.error || 'Failed to generate financial advice',
        details: advice?.details
      });
    }

    const adviceText = typeof advice === 'string'
      ? advice
      : (advice.advice || advice.data || '');

    setCache(cacheKey, adviceText, 60 * 1000); // cache 60s
    return res.json({ success: true, data: adviceText });
  } catch (error) {
    console.error('Error getting financial advice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate financial advice'
    });
  }
});

module.exports = router;
