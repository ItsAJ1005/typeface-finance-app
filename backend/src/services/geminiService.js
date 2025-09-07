const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Primary and fallback models
        // Using faster model as primary for quicker responses
        this.primaryModelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        this.fallbackModelName = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-pro';
        
        this.generationConfig = {
            temperature: 0.5,    // Lower temperature for more focused responses
            topK: 20,           // Reduced for faster generation
            topP: 0.8,          // Adjusted for better speed/quality balance
            maxOutputTokens: 1024, // Reduced max tokens
        };
        // Fallback config with higher quality but slower
        this.fallbackGenerationConfig = {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        };
    }

    async _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _generateWithRetry(payload, { attemptsPerModel = 2, initialBackoffMs = 1000 } = {}) {
        const models = [
            { name: this.primaryModelName, config: this.generationConfig },
            { name: this.fallbackModelName, config: this.fallbackGenerationConfig }
        ];

        let lastError;
        for (const { name, config } of models) {
            const model = this.genAI.getGenerativeModel({ model: name, generationConfig: config });
            for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
                try {
                    const result = await model.generateContent(payload);
                    const response = await result.response;
                    const text = await response.text();
                    if (!text || text.trim().length === 0) {
                        throw new Error('Received empty response from AI');
                    }
                    return text;
                } catch (error) {
                    lastError = error;
                    const message = (error && error.message ? error.message : '').toLowerCase();
                    const isQuotaOrRateLimit = message.includes('429') || message.includes('quota') || message.includes('rate limit') || message.includes('too many requests');
                    const retryAfterMatch = message.match(/retrydelay\"?\:?\s*\"?(\d+)s/);
                    const serverBusy = message.includes('unavailable') || message.includes('temporarily');

                    if ((isQuotaOrRateLimit || serverBusy) && attempt < attemptsPerModel) {
                        // Exponential backoff; honor Retry-After if present
                        const retryDelaySec = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) : null;
                        const backoff = retryDelaySec ? retryDelaySec * 1000 : initialBackoffMs * attempt;
                        await this._sleep(backoff);
                        continue;
                    }

                    // If not retryable or attempts exhausted, move to next model
                    break;
                }
            }
            // If current model exhausted without success, try next model
        }

        throw new Error(`Failed to generate content: ${lastError?.message || 'Unknown error'}`);
    }

    async getFinancialInsights(transactions, options = {}) {
        try {
            if (!this.genAI) {
                throw new Error('Gemini AI not initialized. Check if API key is valid.');
            }

            if (!Array.isArray(transactions) || transactions.length === 0) {
                throw new Error('No transactions provided for analysis');
            }

            const dateRangeLabel = options.dateRangeLabel || 'the last 30 days';

            // Prepare transactions data for analysis - sanitize sensitive information
            const sanitizedTransactions = transactions.map(t => ({
                type: t.type,
                amount: t.amount,
                category: t.category,
                date: t.date,
                // Mask potentially sensitive information in descriptions
                description: t.description?.replace(/\b(?:\d{4}[-\s]?){4}\b/g, '****') // Mask card numbers
                    .replace(/\b\d{10,}\b/g, '****') // Mask long numbers (account/phone)
                    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '****@****') // Mask emails
            }));

            // Build structured prompt
            const parts = [
                { text: `Start your response with this exact heading: \n## Financial Analysis of Transactions (${dateRangeLabel})\n\n` },
                { text: "You are a financial analysis AI. Analyze these transactions and provide detailed insights.\n\n" },
                { text: "Always use Indian Rupee (₹) and INR when mentioning currency. Do not use $. Format examples: ₹1,000, ₹12,34,567.\n\n" },
                { text: `Period: ${dateRangeLabel}\n\n` },
                { text: "Transactions:\n" },
                { text: JSON.stringify(sanitizedTransactions, null, 2) + "\n\n" },
                { text: "Please provide a detailed analysis with the following sections:\n" },
                { text: "1. Spending Patterns: Identify recurring patterns and behaviors\n" },
                { text: "2. High Expenditure Areas: List top spending categories and amounts\n" },
                { text: "3. Savings Opportunities: Suggest specific areas where spending could be reduced\n" },
                { text: "4. Budget Recommendations: Provide actionable budget advice based on the spending patterns\n\n" },
                { text: "Finish with a concise Conclusion section summarizing key actions.\n" },
                { text: "Format the response in clear sections with bullet points where appropriate." }
            ];

            const payload = { contents: [{ role: 'user', parts }] };
            const text = await this._generateWithRetry(payload);

            // Basic content safety check
            const lower = text.toLowerCase();
            if (lower.includes('unsafe') || lower.includes('harmful') || lower.includes('inappropriate')) {
                throw new Error('Response contained potentially unsafe content');
            }

            return text;
        } catch (error) {
            console.error('Error getting financial insights:', error);
            throw new Error(`Failed to generate insights: ${error.message}`);
        }
    }

    async suggestCategory(transaction) {
        try {
            if (!transaction) {
                throw new Error('No transaction provided for categorization');
            }

            // Sanitize transaction data before sending to AI
            const sanitizedTransaction = {
                amount: transaction.amount,
                type: transaction.type,
                // Mask sensitive information in description
                description: transaction.description?.replace(/\b(?:\d{4}[-\s]?){4}\b/g, '****')
                    .replace(/\b\d{10,}\b/g, '****')
                    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '****@****')
            };

            const prompt = `Given this transaction:
                ${JSON.stringify(sanitizedTransaction, null, 2)}
                Suggest the most appropriate category from these options:
                - Food & Dining
                - Shopping
                - Transportation
                - Bills & Utilities
                - Entertainment
                - Health & Fitness
                - Travel
                - Education
                - Other
                Only respond with one category name from the list above.`;

            const payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
            const text = await this._generateWithRetry(payload);

            if (!text || text.trim().length === 0) {
                throw new Error('Received empty category suggestion');
            }

            return text.trim();
        } catch (error) {
            console.error('Error suggesting category:', error);
            throw new Error(`Failed to suggest category: ${error.message}`);
        }
    }

    async getFinancialAdvice(userContext) {
        try {
            if (!userContext) {
                throw new Error('No user context provided for advice');
            }

            // Build structured prompt
            // Sanitize user context before sending to AI
            const sanitizedContext = {
                monthlyIncome: userContext.monthlyIncome,
                monthlyExpenses: userContext.monthlyExpenses,
                savingsRate: userContext.savingsRate,
                expensesByCategory: userContext.expensesByCategory,
                transactionCount: userContext.transactionCount
                // Explicitly exclude any sensitive fields
            };

            const parts = [
                { text: "You are a professional financial advisor. Based on this user's financial context:\n\n" },
                { text: "Always use Indian Rupee (₹) and INR when mentioning currency. Do not use $. Format examples: ₹1,000, ₹12,34,567.\n\n" },
                { text: JSON.stringify(sanitizedContext, null, 2) + "\n\n" },
                { text: "Please provide detailed advice in these sections:\n" },
                { text: "1. Personalized Financial Recommendations\n" },
                { text: "2. Specific Action Items (with timeline)\n" },
                { text: "3. Areas for Financial Improvement\n" },
                { text: "4. Long-term Planning Suggestions\n\n" },
                { text: "Format the response in clear sections with bullet points and timelines where appropriate." }
            ];

            const payload = { contents: [{ role: 'user', parts }] };
            const text = await this._generateWithRetry(payload);

            if (!text || text.trim().length === 0) {
                throw new Error('Received empty advice response');
            }

            return text;
        } catch (error) {
            console.error('Error getting financial advice:', error);
            throw new Error(`Failed to generate financial advice: ${error.message}`);
        }
    }

    async analyzeReceipt(extractedText, totalAmount) {
        try {
            if (!extractedText) {
                throw new Error('No receipt text provided for analysis');
            }

            // Build structured prompt
            const parts = [
                { text: "You are an expert receipt analyzer. Analyze this receipt:\n\n" },
                { text: `Receipt Text:\n${extractedText}\n\n` },
                { text: `Total Amount: ${totalAmount || 'Not provided'}\n\n` },
                { text: "Please provide a detailed analysis with:\n" },
                { text: "1. Merchant/Store Name (with confidence level)\n" },
                { text: "2. Purchase Category\n" },
                { text: "3. Potential Tax Deductions\n" },
                { text: "4. Expense Classification (Necessary/Discretionary)\n" },
                { text: "5. Any Red Flags or Inconsistencies\n\n" },
                { text: "Format the response in clear sections." }
            ];

            const payload = { contents: [{ role: 'user', parts }] };
            const text = await this._generateWithRetry(payload);

            if (!text || text.trim().length === 0) {
                throw new Error('Received empty receipt analysis');
            }

            return text;
        } catch (error) {
            console.error('Error analyzing receipt:', error);
            throw new Error(`Failed to analyze receipt: ${error.message}`);
        }
    }
}

module.exports = GeminiService;
