import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getFinancialInsights, getFinancialAdvice } from '../services/aiService';
import Loader from './common/Loader';

const AIInsights = () => {
  const [insights, setInsights] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeCurrency = (text) => (typeof text === 'string' ? text.replace(/\$/g, '₹') : text);

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

      const meta = parseInsights(normalizedInsights);
      setInsightsMeta(meta);
      setInsights(meta.body || normalizedInsights);
      setAdvice(normalizedAdvice);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch AI insights';
      setError(errorMessage);
      console.error('Error fetching AI data:', err);
    } finally {
      setLoading(false);
    }
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

  if (loading) return <Loader />;
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading AI Insights</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-3">
              <button onClick={fetchAIData} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">{insightsMeta.title || 'AI Financial Insights'}</h2>
            {insightsMeta.range && (
              <span className="inline-block mt-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                {insightsMeta.range}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleCopy(insights)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">Copy</button>
            <button onClick={fetchAIData} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Refresh</button>
          </div>
        </div>
        <div className="prose max-w-none">
          {insights ? (
            <div className="leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {insights}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-gray-500">
              No insights available. Add some transactions to get AI-powered financial analysis.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-semibold">Personalized Financial Advice</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => handleCopy(advice)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">Copy</button>
            <button onClick={fetchAIData} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Refresh</button>
          </div>
        </div>
        <div className="prose max-w-none">
          {advice ? (
            <div className="leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {advice}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-gray-500">
              No financial advice available. Add more transaction data to receive personalized recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
