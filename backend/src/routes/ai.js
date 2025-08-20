const express = require('express');
const { auth } = require('../middleware/auth');
const categoryService = require('../services/categoryService');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Get AI-powered financial insights
router.get('/insights', auth, async (req, res) => {
    try {
        // Fetch user's transactions for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const transactions = await Transaction.find({
            userId: req.userId,
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: -1 });

        // Build date range label for the insights header
        const endDate = new Date();
        const formatMonthYear = (d) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const dateRangeLabel = `${formatMonthYear(thirtyDaysAgo)} - ${formatMonthYear(endDate)}`;

        const insights = await categoryService.getFinancialInsights(transactions, { dateRangeLabel });
        
        if (!insights.success) {
            return res.status(500).json({
                success: false,
                message: insights.error,
                details: insights.details
            });
        }

        res.json({
            success: true,
            data: insights.insights || insights
        });
    } catch (error) {
        console.error('Error getting financial insights:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate financial insights',
            details: error.stack
        });
    }
});

// Get personalized financial advice
router.get('/advice', auth, async (req, res) => {
    try {
        // Fetch user's financial context
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const transactions = await Transaction.find({
            userId: req.userId,
            date: { $gte: thirtyDaysAgo }
        });

        // Calculate some basic financial metrics
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

        // Normalize the response so frontend always gets a string in data
        if (advice && advice.success === false) {
            return res.status(500).json({
                success: false,
                message: advice.error || 'Failed to generate financial advice',
                details: advice.details
            });
        }

        const adviceText = typeof advice === 'string' 
            ? advice 
            : (advice && (advice.advice || advice.data)) || '';

        return res.json({
            success: true,
            data: adviceText
        });
    } catch (error) {
        console.error('Error getting financial advice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate financial advice'
        });
    }
});

module.exports = router;
