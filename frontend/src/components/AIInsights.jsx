import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getFinancialInsights, getFinancialAdvice } from '../services/aiService';
import { FiRefreshCw, FiCopy, FiAlertTriangle, FiInfo, FiDollarSign, FiLoader, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const Loader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="relative">
      <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
    </div>
  </div>
);

const InsightCard = ({ title, children, icon, className = '', isAdvice = false, range }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`relative overflow-hidden rounded-xl shadow-sm ${isAdvice ? 'bg-gradient-to-br from-purple-50 to-blue-50' : 'bg-gradient-to-br from-white to-gray-50'} border border-gray-100 ${className}`}
  >
    {/* Decorative gradient accent */}
    <div className={`absolute top-0 left-0 w-1 h-full ${isAdvice ? 'bg-gradient-to-b from-purple-500 to-blue-500' : 'bg-gradient-to-b from-blue-500 to-cyan-500'}`}></div>
    
    <div className="p-6 pl-7">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`p-2.5 rounded-xl ${isAdvice ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} shadow-sm`}>
              {icon}
            </div>
          )}
          <div>
            <h3 className={`text-lg font-semibold ${isAdvice ? 'text-purple-800' : 'text-gray-800'}`}>
              {title}
            </h3>
            {range && (
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <FiCalendar className="mr-1" size={12} />
                {range}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="prose prose-sm max-w-none">
        {children}
      </div>
    </div>
  </motion.div>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-3"></div>
        <div className="h-3 bg-gray-100 rounded-full w-full"></div>
        <div className="h-3 bg-gray-100 rounded-full w-5/6 mt-2"></div>
      </div>
    ))}
  </div>
);

const ActionButton = ({ onClick, icon: Icon, label, variant = 'secondary', className = '' }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${className} ${
      variant === 'primary'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg'
        : 'bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </motion.button>
);

const AIInsights = () => {
  const [insights, setInsights] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const normalizeCurrency = (text) => (typeof text === 'string' ? text.replace(/\$/g, '₹') : text);

  // Improve readability by converting bold section titles to proper headings and normalizing spacing
  const prettifyMarkdown = (text) => {
    if (!text || typeof text !== 'string') return text;
    let out = text;
    // Convert lines like "**1. Spending Patterns:**" or "**Spending Patterns:**" to headings
    out = out.replace(/^\s*\*\*\s*(\d+\.)?\s*([^:*]+):\s*\*\*\s*$/gmi, (m, num, title) => `### ${num ? num + ' ' : ''}${title.trim()}`);
    // Ensure a blank line before headings for Markdown parsers
    out = out.replace(/([^\n])\n(###\s)/g, '$1\n\n$2');
    // Normalize bullet spacing (convert irregular spaced asterisks to dash list)
    out = out.replace(/^\s*\*\s{2,}/gmi, '* ');
    return out.trim();
  };

  const parseInsights = (text) => {
    if (!text || typeof text !== 'string') return { title: 'AI Financial Insights', range: null, body: text };
    const lines = text.split(/\r?\n/);
    let title = 'AI Financial Insights';
    let range = null;
    if (lines[0] && lines[0].startsWith('## ')) {
      title = lines[0].replace(/^##\s+/, '').trim();
      const match = title.match(/\(([^)]+)\)\s*$/);
      if (match) {
        range = match[1];
        title = title.replace(match[0], '').trim();
      }
      lines.shift();
    }
    return { title, range, body: lines.join('\n').trim() };
  };

  const [insightsMeta, setInsightsMeta] = useState({ title: 'AI Financial Insights', range: null, body: '' });

  const fetchAIData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [insightsData, adviceData] = await Promise.all([
        getFinancialInsights(),
        getFinancialAdvice()
      ]);

      const normalizedInsights = normalizeCurrency(insightsData.data);
      const normalizedAdvice = normalizeCurrency(adviceData.data);

      const meta = parseInsights(prettifyMarkdown(normalizedInsights));
      setInsightsMeta(meta);
      setInsights(meta.body || prettifyMarkdown(normalizedInsights));
      setAdvice(normalizedAdvice);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch AI insights';
      setError(errorMessage);
      console.error('Error fetching AI data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAIData();
  };

  useEffect(() => {
    fetchAIData();
  }, []);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      if (window?.toast) window.toast.success('Copied to clipboard');
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  if (loading && !refreshing) return <Loader />;
  
  if (error && !refreshing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl max-w-4xl mx-auto"
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <FiAlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-red-800">Error Loading AI Insights</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <ActionButton 
                onClick={fetchAIData} 
                icon={FiRefreshCw}
                label="Retry" 
                variant="primary"
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-gray-100"
      >
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Financial Insights
          </h2>
          <p className="text-sm text-gray-600 mt-1 flex items-center">
            <FiTrendingUp className="mr-1.5" size={14} />
            AI-powered analysis of your finances
          </p>
        </div>
        <motion.button
          whileHover={{ rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-200"
          title="Refresh insights"
        >
          <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </motion.div>

      <AnimatePresence mode="wait">
        {refreshing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <InsightCard title="Analyzing your finances...">
              <LoadingSkeleton />
            </InsightCard>
            <InsightCard title="Preparing advice..." isAdvice={true}>
              <LoadingSkeleton />
            </InsightCard>
          </motion.div>
        ) : error ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-red-800">Error Loading AI Insights</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-4">
                  <ActionButton 
                    onClick={fetchAIData} 
                    icon={FiRefreshCw}
                    label="Retry" 
                    variant="primary"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <InsightCard 
              title={insightsMeta.title} 
              icon={<FiDollarSign className="w-5 h-5" />}
              range={insightsMeta.range}
            >
              {insights ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {insights}
                    </ReactMarkdown>
                  </div>
                  <div className="pt-3 flex justify-end border-t border-gray-100 mt-4">
                    <ActionButton
                      onClick={() => handleCopy(insights)}
                      icon={FiCopy}
                      label="Copy Insights"
                      className="text-xs py-1.5"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="p-3 mb-4 rounded-xl bg-blue-50 text-blue-500 shadow-inner">
                    <FiDollarSign className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Add transactions to see AI-powered insights</p>
                  <p className="text-xs text-gray-500 mt-1">We'll analyze your spending patterns and provide valuable insights</p>
                </div>
              )}
            </InsightCard>

            <InsightCard 
              title="Personalized Financial Advice"
              icon={<FiInfo className="w-5 h-5" />}
              isAdvice={true}
            >
              {advice ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {advice}
                    </ReactMarkdown>
                  </div>
                  <div className="pt-3 flex justify-end border-t border-purple-100 mt-4">
                    <ActionButton
                      onClick={() => handleCopy(advice)}
                      icon={FiCopy}
                      label="Copy Advice"
                      className="text-xs py-1.5 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="p-3 mb-4 rounded-xl bg-purple-50 text-purple-500 shadow-inner">
                    <FiInfo className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">More data needed for personalized advice</p>
                  <p className="text-xs text-gray-500 mt-1">Add more transactions for better recommendations</p>
                </div>
              )}
            </InsightCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIInsights;