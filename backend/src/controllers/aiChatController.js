const OpenAI = require('openai');
const analyticsService = require('../services/analyticsService');
const Transaction = require('../models/Transaction');
const RecurringTransaction = require('../models/RecurringTransaction');
const ChatHistory = require('../models/ChatHistory');

// In-memory cache for active chat histories
const activeChatHistories = new Map();

// System message for the AI assistant
const SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are a helpful financial assistant for the Typeface Finance app.
Your job is to answer with clear, numeric, user-specific insights using the provided context.
Keep answers concise, friendly, and professional. Use Indian rupees (₹) for all currency.

When the user asks:
- About spend/expenses: provide the total spending for the period, optionally top 3 categories.
- About income: show total income and any notable sources.
- About savings: calculate and show the savings rate.
- For advice: provide specific, actionable suggestions based on spending patterns.
- About transactions: list relevant transactions with dates, amounts, and categories.
- About budgets: compare actual spending vs budgeted amounts.
- For analysis: identify trends, anomalies, or opportunities for improvement.
- About income/net balance/savings: compute from context: net = income − expenses.
- About "net worth": clarify that only transactional net savings are available unless assets/liabilities are provided; offer to compute true net worth if they share those.
- About saving money: give 3–5 actionable, tailored tips based on their top categories and spending rate.
- About top/highest transactions: provide a list of the largest transactions, including amount, description, category, and date.
- About transaction count: provide the total number of transactions for the period, and optionally the average transactions per day.
- About bills/payments: provide information about upcoming recurring payments, including amount, description, and due date. For questions like "do I have any bills due tomorrow/next week/next month", check the upcomingBills array and provide a clear list of upcoming payments.

Prefer numbers over definitions. Round to 2 decimals. If a value is missing, say so briefly and suggest how to provide it.

For transaction queries, you have access to:
- topTransactions: array of the largest transactions (amount in absolute value)
- recentTransactions: array of most recent transactions

Format transaction responses clearly, for example:
"Here are your top 5 transactions for [time period]:\n1. ₹5,000 - Groceries at Supermarket (Jan 15)\n2. ₹3,500 - Electricity Bill (Jan 10)\n..."`
};

// Initialize OpenAI with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to get or create chat history
async function getOrCreateChatHistory(userId, sessionId = 'default') {
  try {
    const cacheKey = `${userId}-${sessionId}`;
    
    // Check cache first
    if (activeChatHistories.has(cacheKey)) {
      const cached = activeChatHistories.get(cacheKey);
      if (cached) return cached;
    }
    
    // Try to find existing chat history
    let chatHistory = await ChatHistory.findOne({ userId, sessionId });
    
    // If not found, create a new one
    if (!chatHistory) {
      chatHistory = new ChatHistory({
        userId,
        sessionId,
        messages: [SYSTEM_MESSAGE],
        lastActive: new Date()
      });
      await chatHistory.save();
    }
    
    // Update cache
    activeChatHistories.set(cacheKey, chatHistory);
    return chatHistory;
  } catch (error) {
    console.error('Error in getOrCreateChatHistory:', error);
    throw new Error('Failed to get or create chat history');
  }
}

// Clean up old chat histories periodically
setInterval(async () => {
  try {
    // Check if the cleanupOldSessions method exists on the model
    if (typeof ChatHistory.cleanupOldSessions === 'function') {
      const result = await ChatHistory.cleanupOldSessions(30); // Keep 30 days of history
      if (result?.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} old chat histories`);
        
        // Also clear cache for deleted histories
        for (const [key, value] of activeChatHistories.entries()) {
          const lastActive = new Date(value.lastActive);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          
          if (lastActive < cutoffDate) {
            activeChatHistories.delete(key);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old chat histories:', error);
  }
}, 24 * 60 * 60 * 1000); // Run once per day

// --------------------------- Utility Functions ---------------------------

// Process chat message with user isolation
const processChatMessage = async (userId, message) => {
  try {
    // Get or create chat history for this user
    const chatHistory = await getOrCreateChatHistory(userId);
    
    // Add user message to history
    if (typeof chatHistory.addMessage === 'function') {
      await chatHistory.addMessage('user', message);
    } else {
      // Fallback if addMessage method doesn't exist
      chatHistory.messages.push({ role: 'user', content: message, timestamp: new Date() });
      chatHistory.lastActive = new Date();
      await chatHistory.save();
    }
    
    // Get financial context for AI response
    const { start, end } = await inferDateRange(userId, message.toLowerCase());
    const context = await getFinancialContext(userId, start, end);
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_MESSAGE.content },
      ...chatHistory.messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      })),
      { 
        role: 'system',
        content: `Current financial context: ${JSON.stringify(context, null, 2)}`
      }
    ];
    
    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    // Save AI response to history
    if (typeof chatHistory.addMessage === 'function') {
      await chatHistory.addMessage('assistant', aiResponse);
    } else {
      // Fallback if addMessage method doesn't exist
      chatHistory.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
      chatHistory.lastActive = new Date();
      await chatHistory.save();
    }
    
    return {
      success: true,
      data: aiResponse,
      context: {
        dateRange: { start, end },
        ...context
      }
    };
  } catch (error) {
    console.error('Error processing chat message:', error);
    throw new Error('Failed to process chat message');
  }
};

// Infer date range from message
const inferDateRange = async (userId, messageLower) => {
  const now = new Date();
  let start = new Date(now);
  start.setDate(now.getDate() - 30);
  let end = new Date(now);
  let label = 'Last 30 days';

  if (/(all time|all-time|overall|lifetime|complete|entire|since start)/i.test(messageLower)) {
    const earliest = await Transaction.findOne({ userId }).sort({ date: 1 }).select('date').lean();
    if (earliest?.date) {
      start = new Date(earliest.date);
      label = 'All time';
    }
  } else if (/(this month|current month)/i.test(messageLower)) {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    label = 'This month';
  } else if (/(last month|previous month)/i.test(messageLower)) {
    const month = now.getMonth() - 1;
    const year = month < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = (month + 12) % 12;
    start = new Date(year, m, 1);
    end = new Date(year, m + 1, 0, 23, 59, 59, 999);
    return { start, end, label: 'Last month' };
  } else if (/(ytd|year to date|year-to-date|this year)/i.test(messageLower)) {
    start = new Date(now.getFullYear(), 0, 1);
    label = 'Year to date';
  }

  return { start, end, label };
};

// Get upcoming recurring transactions
const getUpcomingRecurringTransactions = async (userId, daysAhead = 30) => {
  try {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + daysAhead);
    
    const recurringTxns = await RecurringTransaction.find({
      userId,
      isActive: true,
      $or: [
        { nextOccurrence: { $lte: endDate } },
        { nextOccurrence: { $exists: false } }
      ]
    }).sort({ nextOccurrence: 1 });

    // Process recurring transactions to get upcoming instances
    const upcomingBills = [];
    for (const txn of recurringTxns) {
      if (txn.nextOccurrence) {
        upcomingBills.push({
          description: txn.description || 'Recurring Payment',
          amount: txn.amount,
          category: txn.category,
          type: txn.type,
          dueDate: txn.nextOccurrence,
          frequency: txn.frequency
        });
      }
    }
    
    return upcomingBills;
  } catch (error) {
    console.error('Error fetching upcoming recurring transactions:', error);
    return [];
  }
};

// Fetch user's financial context
const getFinancialContext = async (userId, startDate, endDate) => {
  try {
    // Ensure we're working with proper Date objects
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end);
    // Default to last 30 days only if no explicit startDate provided
    if (!startDate) {
      start.setDate(end.getDate() - 30);
    }

    // Normalize dates to start and end of day for consistent queries
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('getFinancialContext - Date range:', {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
      userId: userId.toString()
    });
    
    const [
      spendingByCategory,
      incomeExpenseSummary,
      recentTransactions,
      topTransactions,
      transactionCount,
      upcomingBills
    ] = await Promise.all([
      analyticsService.getSpendingByCategory(userId, startOfDay, endOfDay),
      analyticsService.getIncomeVsExpenses(userId, startOfDay, endOfDay),
      analyticsService.getRecentTransactions(userId, 5, startOfDay, endOfDay),
      analyticsService.getTopTransactions(userId, 5, startOfDay, endOfDay),
      analyticsService.countTransactions(userId, startOfDay, endOfDay),
      getUpcomingRecurringTransactions(userId, 30) // Get next 30 days of bills
    ]);

    // Map analytics keys to totals expected by context/formatting
    const totalIncome = incomeExpenseSummary?.income || 0;
    const totalExpenses = incomeExpenseSummary?.expense || 0;
    const savings = incomeExpenseSummary?.net || (totalIncome - totalExpenses);
    
    console.log('getFinancialContext - Results:', {
      totalIncome,
      totalExpenses,
      savings,
      transactionCount,
      categories: Object.keys(spendingByCategory).length
    });

    const topCategories = Object.entries(spendingByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    // Process upcoming bills
    const upcomingBillsSummary = upcomingBills.reduce((acc, bill) => {
      if (bill.type === 'expense') {
        acc.totalUpcomingBills = (acc.totalUpcomingBills || 0) + bill.amount;
        acc.count = (acc.count || 0) + 1;
      }
      return acc;
    }, { totalUpcomingBills: 0, count: 0 });

    return {
      recentTransactions,
      topTransactions,
      spendingByCategory,
      topCategories,
      transactionCount,
      upcomingBills,
      upcomingBillsSummary,
      summary: {
        totalIncome,
        totalExpenses,
        savings,
        spendingRate: totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0,
        transactionCount,
        ...upcomingBillsSummary
      },
      timePeriod: {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
        lastUpdated: new Date().toISOString(),
        days: Math.ceil((endOfDay - startOfDay) / (1000 * 60 * 60 * 24))
      }
    };
  } catch (error) {
    console.error('Error fetching financial context:', error);
    return null;
  }
};

// Generate AI response
const generateResponse = async (messages) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate response from AI');
  }
};

// Format financial context for the AI
const formatFinancialContext = (message, contextData, rangeLabel = 'Last 30 days') => {
  if (!contextData) return '';

  const { summary, spendingByCategory, topCategories, recentTransactions, topTransactions, timePeriod, upcomingBills, upcomingBillsSummary } = contextData;
  const messageLower = message.toLowerCase();
  
  let context = `Current time: ${new Date().toLocaleString()}\n`;
  context += `Analyzing data for: ${rangeLabel} (${timePeriod.days} days)\n\n`;
  
  // Add summary
  context += `Summary (${rangeLabel}):\n`;
  context += `- Total Transactions: ${summary.transactionCount || 0}\n`;
  context += `- Total Income: ₹${summary.totalIncome?.toFixed(2) || '0.00'}\n`;
  context += `- Total Expenses: ₹${summary.totalExpenses?.toFixed(2) || '0.00'}\n`;
  context += `- Net Savings: ₹${summary.savings?.toFixed(2) || '0.00'}\n`;
  context += `- Spending Rate: ${summary.spendingRate?.toFixed(1) || '0'}% of income\n`;
  
  // Add upcoming bills if relevant to the query
  if (upcomingBills?.length > 0 && /\b(bill|bills|payment|payments|due|upcoming|next month|this month|tomorrow|week)\b/i.test(messageLower)) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);
    
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setHours(23, 59, 59, 999);
    
    let relevantBills = [];
    
    if (/\btomorrow\b/i.test(messageLower)) {
      relevantBills = upcomingBills.filter(bill => {
        const billDate = new Date(bill.dueDate);
        return billDate >= tomorrow && billDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
      });
      context += `- Bills due tomorrow: ${relevantBills.length}\n`;
    } else if (/\bnext week\b|\bupcoming week\b/i.test(messageLower)) {
      relevantBills = upcomingBills.filter(bill => {
        const billDate = new Date(bill.dueDate);
        return billDate >= now && billDate <= nextWeek;
      });
      context += `- Bills due in the next 7 days: ${relevantBills.length}\n`;
    } else if (/\bnext month\b|\bupcoming month\b/i.test(messageLower)) {
      relevantBills = upcomingBills.filter(bill => {
        const billDate = new Date(bill.dueDate);
        return billDate >= now && billDate <= nextMonth;
      });
      context += `- Bills due in the next 30 days: ${relevantBills.length}\n`;
    } else {
      relevantBills = upcomingBills;
      context += `- Total upcoming bills: ${upcomingBillsSummary.count || 0} (₹${upcomingBillsSummary.totalUpcomingBills?.toFixed(2) || '0.00'})\n`;
    }
    
    if (relevantBills.length > 0) {
      context += '\nUpcoming Bills:\n';
      relevantBills.slice(0, 5).forEach((bill, index) => {
        const dueDate = new Date(bill.dueDate);
        const formattedDate = dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        context += `${index + 1}. ${bill.description || 'Recurring Payment'}: ₹${bill.amount.toFixed(2)} (${bill.category}, due ${formattedDate})\n`;
      });
      
      if (relevantBills.length > 5) {
        context += `...and ${relevantBills.length - 5} more\n`;
      }
    }
  }
  
  context += '\n';
  
  // Add top categories if available
  if (topCategories?.length > 0) {
    context += `Top Spending Categories (${rangeLabel}):\n`;
    topCategories.forEach(({ category, amount }, index) => {
      context += `${index + 1}. ${category}: ₹${amount.toFixed(2)}\n`;
    });
    context += '\n';
  }
  
  // Add top transactions if available
  if (topTransactions?.length > 0) {
    context += `Top ${topTransactions.length} Transactions by Amount (${rangeLabel}):\n`;
    topTransactions.forEach((txn, index) => {
      const date = new Date(txn.date).toLocaleDateString('en-IN');
      const type = txn.type === 'income' ? '+' : '-';
      context += `${index + 1}. ${date} - ${txn.description || 'No description'}: ${type}₹${Math.abs(txn.amount).toFixed(2)} (${txn.category || 'Uncategorized'})\n`;
    });
    context += '\n';
  }
  
  // Add recent transactions if available
  if (recentTransactions?.length > 0) {
    context += `Most Recent Transactions (up to 5):\n`;
    recentTransactions.forEach((txn, index) => {
      const date = new Date(txn.date).toLocaleDateString('en-IN');
      const type = txn.type === 'income' ? '+' : '-';
      context += `${index + 1}. ${date} - ${txn.description || 'No description'}: ${type}₹${Math.abs(txn.amount).toFixed(2)} (${txn.category || 'Uncategorized'})\n`;
    });
  }

  // Include auto pays / recurring if user asks
  if (/(auto\s*pay|autopay|auto-pay|subscriptions?|recurring|rent|mortgage|emi)/i.test(message) && Array.isArray(contextData.upcomingBills) && contextData.upcomingBills.length > 0) {
    const recurringExpenses = contextData.upcomingBills.filter(r => r.type === 'expense');
    if (recurringExpenses.length > 0) {
      context += `\n\n## Active Auto Pays / Recurring Expenses\n`;
      context += recurringExpenses
        .map(r => `- ${r.description || r.category}: ₹${r.amount.toFixed(2)} (${r.frequency || 'monthly'})`)
        .join('\n');
    }
  }

  return context;
};

// --------------------------- Main Handlers ---------------------------

// Handle chat messages
const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required and cannot be empty' });
    }

    // Get or create chat history for this user
    const chatHistory = await getOrCreateChatHistory(userId);
    
    // Add user message to history
    if (typeof chatHistory.addMessage === 'function') {
      await chatHistory.addMessage('user', message);
    } else {
      // Fallback if addMessage method doesn't exist
      chatHistory.messages.push({ role: 'user', content: message, timestamp: new Date() });
      chatHistory.lastActive = new Date();
      await chatHistory.save();
    }

    const lower = message.toLowerCase();
    const rangeWords = /(all time|all-time|overall|lifetime|complete|entire|since start|this month|current month|last month|previous month|ytd|year to date|year-to-date|this year)/i;
    const topicWords = /(spend|spent|expense|expenses|income|transaction|transactions|budget|savings|save money|balance|net\s*balance|net\s*worth|networth|net\b|how much|where did my money|my financial|analyze my|advice|tips|auto\s*pay|autopay|auto-pay|subscriptions?|bill|bills|payment|payments|upcoming|due|schedule|recurring)/i;
    const hasRange = rangeWords.test(lower);
    const hasTopic = topicWords.test(lower);
    const needsFinancialContext = hasTopic || hasRange;
    
    if (needsFinancialContext) {
      const { start, end, label } = await inferDateRange(userId, lower);
      const contextData = await getFinancialContext(userId, start, end);

      // If user asks for "all transactions", include a larger list (up to 50)
      const isAllTransactions = /(all\s*transactions|list\s*all|show\s*all\s*transactions|full\s*list|everything)/i.test(lower);
      if (contextData && isAllTransactions) {
        try {
          const allRecent = await analyticsService.getRecentTransactions(userId, 50, start, end);
          contextData.recentTransactions = Array.isArray(allRecent) ? allRecent : contextData.recentTransactions;
        } catch (e) {
          // fallback silently; keep existing recentTransactions
        }
      }

      if (contextData) {
        // Add financial context to the chat history
        const contextMessage = formatFinancialContext(message, contextData, label);
        if (typeof chatHistory.addMessage === 'function') {
          await chatHistory.addMessage('system', contextMessage);
        } else {
          chatHistory.messages.push({ role: 'system', content: contextMessage, timestamp: new Date() });
          chatHistory.lastActive = new Date();
          await chatHistory.save();
        }
      }
    }

    // Intent-guided instruction to the model for better answers
    const isSpendQuery = /(how much.*spend|total (spend|spent)|spending|expenses?\b|spent\b)/i.test(lower);
    const isNetQuery = /(net (balance|savings)|net\s*worth|networth|what.*net|balance)/i.test(lower);
    const isSavingsAdvice = /(save money|save more|reduce expenses|advice|tips|how.*save)/i.test(lower);
    const isAffirmation = /^(yes|yeah|yep|sure|ok|okay|please|go ahead|do it|show me)\b/i.test(lower.trim());
    const isNegative = /^(no|nope|nah|not now|later|stop|cancel)\b/i.test(lower.trim());
    const isBillQuery = /(upcoming\s*(bills?|payments?)|bills?\s*due|payment\s*due|when is my next|when's my next|autopay|auto\s*pay|auto-pay|subscriptions?|recurring\s*(payments?|bills?|expenses?))/i.test(lower);
    const isRangeOnly = hasRange && !hasTopic;
    const isAllTransactions = /(all\s*transactions|list\s*all|show\s*all\s*transactions|full\s*list|everything)/i.test(lower);

    // If the user just said "yes" after assistant offered details, infer the prior topic
    if (isAffirmation && !isSpendQuery && !isNetQuery && !isSavingsAdvice && !isAllTransactions && !isRangeOnly) {
      const lastAssistant = [...chatHistory.messages].reverse().find(m => m.role === 'assistant');
      const lastAssistantLower = (lastAssistant?.content || '').toLowerCase();
      let guidance = 'Continue the previous topic using the provided financial context. Use ₹ and concise sentences.';
      if (/top\s*(spending\s*)?categories|would you like to know the top/i.test(lastAssistantLower)) {
        guidance += ' The user confirmed: list the top spending categories for the current period with amounts and percentages.';
      } else if (/recent transactions|top transactions|largest transactions/i.test(lastAssistantLower)) {
        guidance += ' The user confirmed: provide the requested transactions list for the current period.';
      } else {
        guidance += ' The user confirmed: default to spending details with top categories.';
      }
      
      if (typeof chatHistory.addMessage === 'function') {
        await chatHistory.addMessage('system', guidance);
      } else {
        chatHistory.messages.push({ role: 'system', content: guidance, timestamp: new Date() });
        chatHistory.lastActive = new Date();
        await chatHistory.save();
      }
    }

    // If the user said "no", acknowledge and offer help without resetting context
    if (isNegative && !isSpendQuery && !isNetQuery && !isSavingsAdvice && !isAllTransactions && !isRangeOnly) {
      const closure = 'Acknowledge politely and end the thread without asking open questions. Example: "Got it. If you need anything else, just ask." Keep it to one short sentence.';
      
      if (typeof chatHistory.addMessage === 'function') {
        await chatHistory.addMessage('system', closure);
      } else {
        chatHistory.messages.push({ role: 'system', content: closure, timestamp: new Date() });
        chatHistory.lastActive = new Date();
        await chatHistory.save();
      }
    }
    
    if (isSpendQuery || isNetQuery || isSavingsAdvice || isAllTransactions) {
      let guidance = 'Answer using the provided financial context. Use ₹ and concise sentences. Format answers with clear line breaks and lists.';
      if (isSpendQuery) guidance += ' For spend queries: first line: "Total expenses: ₹[amount]". If adding categories, start a new line with "Top categories:" then use a numbered list, one item per line: "1. [Category]: ₹[amount] ([percent]%)".';
      if (isNetQuery) guidance += ' For net balance queries: compute net = income − expenses for the period and present on its own line. If asked for "net worth", clarify limitation and offer method to compute if assets/liabilities are provided.';
      if (isSavingsAdvice) guidance += ' For saving advice: Start with one concise summary line. Then a list titled "Tips:" followed by 3–5 numbered tips, each on its own line, short and actionable, referencing the user’s top categories. Include a suggested monthly savings target like "Target: ₹X/month" on a separate line.';
      if (isAllTransactions) guidance += ' For all-transactions request: list up to 50 transactions for the requested period. Start with a header line like "Transactions ([range]):" then each on a new line: "1. [DD MMM] - [Description]: -₹[amount] ([Category])". Always one transaction per line.';
      
      if (typeof chatHistory.addMessage === 'function') {
        await chatHistory.addMessage('system', guidance);
      } else {
        chatHistory.messages.push({ role: 'system', content: guidance, timestamp: new Date() });
        chatHistory.lastActive = new Date();
        await chatHistory.save();
      }
    } else if (isRangeOnly) {
      // Reuse the last user topic if only a range was provided
      const lastUser = [...chatHistory.messages].reverse().find(m => m.role === 'user' && m.content !== message);
      const lastLower = (lastUser?.content || '').toLowerCase();
      const lastSpend = /(spend|spent|expense|expenses)/i.test(lastLower);
      const lastNet = /(net|balance|savings)/i.test(lastLower);
      let guidance = 'Interpret the user message as changing the time range for the previous financial topic. Use ₹ and concise sentences.';
      if (lastSpend) guidance += ' Previous topic was spending: report total expenses for the requested range.';
      else if (lastNet) guidance += ' Previous topic was net balance: compute net = income − expenses for the requested range.';
      else guidance += ' Default to net balance: compute net = income − expenses for the requested range.';
      
      if (typeof chatHistory.addMessage === 'function') {
        await chatHistory.addMessage('system', guidance);
      } else {
        chatHistory.messages.push({ role: 'system', content: guidance, timestamp: new Date() });
        chatHistory.lastActive = new Date();
        await chatHistory.save();
      }
    }

    // Handle bill/autopay queries directly
    if (isBillQuery) {
      const upcomingBills = await getUpcomingRecurringTransactions(userId, 30);
      if (upcomingBills.length > 0) {
        const billList = upcomingBills.map((bill, index) => 
          `${index + 1}. ${bill.description}: ₹${bill.amount.toFixed(2)} (${bill.frequency || 'recurring'}, next due: ${new Date(bill.dueDate).toLocaleDateString()})`
        ).join('\n');
        
        const response = `You have the following upcoming bills and payments:\n${billList}`;
        
        if (typeof chatHistory.addMessage === 'function') {
          await chatHistory.addMessage('assistant', response);
        } else {
          chatHistory.messages.push({ role: 'assistant', content: response, timestamp: new Date() });
          chatHistory.lastActive = new Date();
          await chatHistory.save();
        }
        
        return res.json({ success: true, data: response });
      } else {
        const response = "You don't have any upcoming bills or scheduled payments in the next 30 days.";
        
        if (typeof chatHistory.addMessage === 'function') {
          await chatHistory.addMessage('assistant', response);
        } else {
          chatHistory.messages.push({ role: 'assistant', content: response, timestamp: new Date() });
          chatHistory.lastActive = new Date();
          await chatHistory.save();
        }
        
        return res.json({ success: true, data: response });
      }
    }

    // Get recent messages for context (last 10 messages)
    const recentMessages = chatHistory.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Generate AI response with proper context
    const messages = [
      { role: 'system', content: SYSTEM_MESSAGE.content },
      ...recentMessages
    ];
    
    const aiResponse = await generateResponse(messages);

    // Add AI response to chat history
    if (typeof chatHistory.addMessage === 'function') {
      await chatHistory.addMessage('assistant', aiResponse);
    } else {
      chatHistory.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
      chatHistory.lastActive = new Date();
      await chatHistory.save();
    }

    // Return the response
    res.json({ 
      success: true, 
      data: aiResponse,
      context: {
        messageCount: chatHistory.messages.length,
        lastActive: chatHistory.lastActive
      }
    });
  } catch (error) {
    console.error('Error in handleChatMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Clear chat history
const clearChatHistory = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Clear from database
    await ChatHistory.deleteMany({ userId });
    
    // Clear from cache
    for (const [key] of activeChatHistories.entries()) {
      if (key.startsWith(`${userId}-`)) {
        activeChatHistories.delete(key);
      }
    }
    
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to clear chat history' });
  }
};

module.exports = {
  handleChatMessage,
  clearChatHistory
};