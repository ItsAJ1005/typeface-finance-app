import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { transactionAPI } from '../services/api';
import Loader from '../components/common/Loader';

const Analysis = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState(searchParams.get('period') || '30d');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await transactionAPI.getAnalytics({ period });
      setAnalytics(response.data);
    } catch (error) {
      setError(error.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('period', newPeriod);
    setSearchParams(newSearchParams);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPeriodLabel = (period) => {
    const labels = {
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      '6m': 'Last 6 Months',
      '1y': 'Last Year'
    };
    return labels[period] || period;
  };

  const getCategoryColor = (index) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
    ];
    return colors[index % colors.length];
  };

  // Heatmap component
  const SpendingHeatmap = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Heatmap</h3>
          <p className="text-gray-500 text-center py-8">No spending data available for heatmap</p>
        </div>
      );
    }

    const maxAmount = Math.max(...data.map(d => d.amount));
    const minAmount = Math.min(...data.map(d => d.amount));
    const range = maxAmount - minAmount;

    const getHeatmapColor = (amount) => {
      if (amount === 0) return 'bg-gray-100';
      if (range === 0) return 'bg-red-400';
      
      const intensity = (amount - minAmount) / range;
      if (intensity < 0.2) return 'bg-red-200';
      if (intensity < 0.4) return 'bg-red-300';
      if (intensity < 0.6) return 'bg-red-400';
      if (intensity < 0.8) return 'bg-red-500';
      return 'bg-red-600';
    };

    const getTooltipText = (day) => {
      if (day.amount === 0) return `${day.date}: No spending`;
      return `${day.date}: ${formatCurrency(day.amount)}`;
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Heatmap</h3>
        <p className="text-sm text-gray-600 mb-6">
          Visual representation of daily spending intensity. Darker colors indicate higher spending.
        </p>
        
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-xs text-gray-500 text-center py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {data.map((day, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-sm ${getHeatmapColor(day.amount)} relative group cursor-pointer`}
              title={getTooltipText(day)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.amount > 0 ? '₹' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader size="lg" text="Loading analytics..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Analysis</h1>
              <p className="text-gray-600">
                Comprehensive insights into your spending patterns and financial health
              </p>
            </div>
            
            {/* Period Selector */}
            <div className="flex space-x-2">
              {['7d', '30d', '90d', '6m', '1y'].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    period === p
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {getPeriodLabel(p)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {analytics && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-lg">💸</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.totalExpenses || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-lg">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.totalIncome || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Net Savings</p>
                    <p className={`text-2xl font-bold ${
                      (analytics.totalIncome - analytics.totalExpenses) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency((analytics.totalIncome || 0) - (analytics.totalExpenses || 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-lg">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Savings Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.totalIncome > 0 
                        ? formatPercentage((analytics.totalIncome - analytics.totalExpenses) / analytics.totalIncome)
                        : '0%'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SpendingHeatmap data={analytics.heatmapData || []} />
              
              {/* Category Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense by Category</h3>
                {analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.categoryBreakdown.map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full ${getCategoryColor(index)} mr-3`}></div>
                          <span className="text-sm font-medium text-gray-700">{category.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {formatPercentage(category.percentage)}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(category.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No expense data available</p>
                )}
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Trend */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
                {analytics.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.monthlyTrend.map((month) => (
                      <div key={month.month} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{month.month}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-red-600">
                            -{formatCurrency(month.expenses)}
                          </span>
                          <span className="text-sm text-green-600">
                            +{formatCurrency(month.income)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No trend data available</p>
                )}
              </div>

              {/* Weekly Spending Pattern */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Spending Pattern</h3>
                {analytics.weeklyPattern && analytics.weeklyPattern.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.weeklyPattern.map((day) => (
                      <div key={day.day} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{day.day}</span>
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, (day.amount / (analytics.maxDailySpending || 1)) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(day.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No weekly pattern data available</p>
                )}
              </div>
            </div>

            {/* Detailed Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Spending Categories */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Spending Categories</h3>
                {analytics.topCategories && analytics.topCategories.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topCategories.slice(0, 5).map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 mr-2">#{index + 1}</span>
                          <span className="text-sm text-gray-700">{category.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(category.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No category data available</p>
                )}
              </div>

              {/* Spending Patterns */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Patterns</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Daily Spending</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(analytics.averageDailySpending || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Largest Transaction</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(analytics.largestTransaction || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Transactions</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {analytics.totalTransactions || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Health */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expense to Income Ratio</span>
                    <span className={`text-sm font-semibold ${
                      analytics.expenseToIncomeRatio > 0.8 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatPercentage(analytics.expenseToIncomeRatio || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Days Analyzed</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {analytics.daysAnalyzed || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Data Completeness</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPercentage(analytics.dataCompleteness || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {analytics.recommendations && analytics.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Financial Recommendations</h3>
                <div className="space-y-3">
                  {analytics.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-bold">{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!analytics && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
            <p className="text-gray-600 mb-4">
              Start adding transactions to see detailed financial analysis and insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis; 