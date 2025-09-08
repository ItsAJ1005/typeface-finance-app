import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import Header from '../components/common/Header';
import { transactionAPI } from '../services/api';
import Loader from '../components/common/Loader';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
      
      const response = await transactionAPI.getAnalytics({ 
        period,
        includeTransactions: true 
      });
      
      if (response) {
        // Process response data (same as before)
        const { 
          summary = { totalIncome: 0, totalExpense: 0, balance: 0, period: {} }, 
          categoryBreakdown = [], 
          monthlyTrend = [],
          heatmapData: heatmapDataResponse = [],
          totalTransactions = 0 
        } = response;
        
        const processedMonthlyTrend = monthlyTrend.map(month => ({
          ...month,
          month: new Date(month.month + '-01').toLocaleString('default', { month: 'short', year: 'numeric' })
        }));

        const processedCategoryBreakdown = [...categoryBreakdown]
          .sort((a, b) => b.amount - a.amount)
          .map(cat => ({
            ...cat,
            percentage: cat.percentage / 100
          }));
          
        const heatmapData = response.heatmapData || [];
        
        const periodStart = summary?.period?.startDate ? new Date(summary.period.startDate) : null;
        const periodEnd = summary?.period?.endDate ? new Date(summary.period.endDate) : null;
        const computedDays = (periodStart && periodEnd && !isNaN(periodStart) && !isNaN(periodEnd))
          ? Math.max(1, Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1)
          : 0;

        const analyticsData = {
          summary,
          categoryBreakdown: processedCategoryBreakdown,
          monthlyTrend: processedMonthlyTrend,
          totalIncome: summary.totalIncome || 0,
          totalExpenses: summary.totalExpense || 0,
          balance: summary.balance || 0,
          totalTransactions,
          expenseToIncomeRatio: summary.totalIncome > 0 
            ? (summary.totalExpense / summary.totalIncome) 
            : 0,
          averageDailySpending: (summary.period?.days || computedDays) 
            ? summary.totalExpense / (summary.period?.days || computedDays)
            : 0,
          largestTransaction: Math.max(
            ...categoryBreakdown.map(cat => cat.amount || 0),
            0
          ),
          daysAnalyzed: summary.period?.days || computedDays || 0,
          heatmapData: (() => {
            const transactions = Array.isArray(response.transactions) ? response.transactions : [];
            if (!Array.isArray(heatmapDataResponse) || heatmapDataResponse.length === 0) {
              const byDate = new Map();
              transactions.forEach(tx => {
                if (tx.type !== 'expense' || !tx.date) return;
                const dateStr = new Date(tx.date).toISOString().split('T')[0];
                const current = byDate.get(dateStr) || { date: dateStr, amount: 0, transactions: [] };
                current.amount += Math.abs(Number(tx.amount) || 0);
                current.transactions.push(tx);
                byDate.set(dateStr, current);
              });
              return Array.from(byDate.values());
            }
            
            return heatmapDataResponse.map(item => {
              const amount = Number(item.amount) || 0;
              const transactionsList = Array.isArray(item.transactions) ? item.transactions : [];
              return {
                date: item.date,
                amount,
                transactions: transactionsList,
                ...(item.category && { category: item.category })
              };
            });
          })(),
          weeklyPattern: (() => {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weeklyPattern = days.map(day => ({ day, amount: 0 }));
            
            const transactions = response.transactions || [];
            
            transactions.forEach(tx => {
              if (tx.type === 'expense') {
                const date = new Date(tx.date);
                const dayOfWeek = date.getDay();
                weeklyPattern[dayOfWeek].amount += Math.abs(tx.amount);
              }
            });
            
            return weeklyPattern;
          })(),
          maxDailySpending: 0,
          topCategories: [],
          recommendations: [
            'Consider setting a budget for your top spending categories.',
            'Review your monthly trends to identify areas for potential savings.'
          ]
        };
        
        analyticsData.maxDailySpending = Math.max(
          ...(analyticsData.weeklyPattern || []).map(d => d.amount || 0),
          0
        );
        analyticsData.topCategories = (analyticsData.categoryBreakdown || [])
          .slice()
          .sort((a, b) => (b.amount || 0) - (a.amount || 0));
        
        setAnalytics(analyticsData);
        return;
      } else {
        setAnalytics({
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          categoryBreakdown: [],
          monthlyTrend: [],
          summary: {},
          totalTransactions: 0
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch analytics';
      
      setError(errorMessage);
      setAnalytics({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        categoryBreakdown: [],
        monthlyTrend: [],
        summary: {},
        totalTransactions: 0
      });
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (!(d instanceof Date) || isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Heatmap component
  const SpendingHeatmap = ({ data = [] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Heatmap</h3>
          <p className="text-gray-500 text-center py-8">No spending data available for the selected period</p>
        </div>
      );
    }

    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      
      const dateMap = new Map();
      const processedData = [];
      
      data.forEach(item => {
        try {
          if (!item || !item.date) return;
          
          const date = new Date(item.date);
          if (isNaN(date.getTime())) return;
          
          const dateStr = date.toISOString().split('T')[0];
          const amount = Math.abs(Number(item.amount)) || 0;
          
          dateMap.set(dateStr, {
            date,
            dateStr,
            amount,
            transactions: Array.isArray(item.transactions) ? item.transactions : [],
            dayOfWeek: date.getDay(),
            dayOfMonth: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear()
          });
        } catch (error) {
          console.warn('Error processing heatmap item:', error);
        }
      });
      
      for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const existingData = dateMap.get(dateStr);
        
        if (existingData) {
          processedData.push(existingData);
        } else {
          processedData.push({
            date: new Date(d),
            dateStr,
            amount: 0,
            transactions: [],
            dayOfWeek: d.getDay(),
            dayOfMonth: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear()
          });
        }
      }
      
      const amounts = processedData.map(d => d.amount).filter(amount => amount > 0);
      const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
      const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 1;
      const range = maxAmount - minAmount;
      
      const weeks = [];
      let currentWeek = Array(7).fill(null);
      
      processedData.forEach(day => {
        const dayOfWeek = day.dayOfWeek;
        currentWeek[dayOfWeek] = day;
        
        if (dayOfWeek === 6) {
          weeks.push([...currentWeek]);
          currentWeek = Array(7).fill(null);
        }
      });
      
      if (currentWeek.some(day => day !== null)) {
        weeks.push([...currentWeek]);
      }
      
      const getHeatmapColor = (amount) => {
        if (amount <= 0) return 'bg-gray-100';
        
        const intensity = range > 0 ? (amount - minAmount) / range : 0;
        
        if (intensity < 0.2) return 'bg-red-100';
        if (intensity < 0.4) return 'bg-red-200';
        if (intensity < 0.6) return 'bg-red-300';
        if (intensity < 0.8) return 'bg-red-400';
        return 'bg-red-500';
      };
      
      const renderTooltipContent = (day) => {
        if (!day || day.amount <= 0) return 'No spending';
        
        return (
          <div className="text-center">
            <div className="font-semibold">{formatCurrency(day.amount)}</div>
            {day.transactions.length > 0 && (
              <div className="text-xs mt-1">
                {day.transactions.length} transaction{day.transactions.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      };
      
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Spending Heatmap</h3>
              <p className="text-sm text-gray-500">Last 30 days of spending activity</p>
            </div>
            <div className="text-sm text-gray-500">
              {processedData.length} days shown
            </div>
          </div>
          
          <div className="overflow-x-auto py-2 -mx-2">
            <div className="inline-block min-w-full px-2">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-xs text-gray-500 text-center py-1 w-8 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {weeks.flatMap((week, weekIndex) =>
                  week.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <div 
                          key={`empty-${weekIndex}-${dayIndex}`}
                          className="w-8 h-8 rounded-sm bg-gray-50"
                        />
                      );
                    }
                    
                    const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                    const dayClasses = [
                      'w-8 h-8 rounded-sm relative group transition-all duration-200 hover:scale-105',
                      getHeatmapColor(day.amount),
                      isToday ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                    ].join(' ');
                    
                    return (
                      <div
                        key={day.date.getTime()}
                        className={dayClasses}
                        title={`${day.date.toLocaleDateString()}: ${formatCurrency(day.amount)}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative group">
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {renderTooltipContent(day)}
                            </div>
                            <span className={`text-xs font-medium ${
                              day.amount > 0 ? 'text-white' : 'text-gray-400'
                            } opacity-0 group-hover:opacity-100 transition-opacity`}>
                              {day.amount > 0 ? '₹' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Less</span>
              <div className="flex space-x-1">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => {
                  const amount = Math.round(minAmount + (range * intensity));
                  const color = getHeatmapColor(amount).split(' ')[0];
                  return (
                    <div 
                      key={i}
                      className={`w-4 h-4 rounded-sm ${color}`}
                      title={`${formatCurrency(amount)}`}
                    />
                  );
                })}
              </div>
              <span>More</span>
            </div>
            <div className="text-xs text-gray-400 text-center">
              Hover over a day for details
            </div>
          </div>
          
          {processedData.length > 0 && (
            <div className="text-xs text-gray-400 text-center mt-3">
              {formatDate(processedData[0].date)} - {formatDate(processedData[processedData.length - 1].date)}
            </div>
          )}
        </div>
      );
      
    } catch (error) {
      console.error('Error rendering heatmap:', error);
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Heatmap</h3>
          <p className="text-red-500 text-center py-4">Error loading heatmap data. Please try again later.</p>
          <p className="text-xs text-gray-500 text-center">Error: {error.message}</p>
        </div>
      );
    }
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Analysis</h1>
              <p className="text-gray-600">
                Comprehensive insights into your spending patterns and financial health
              </p>
            </div>
            
            {/* Period Selector */}
            <div className="flex flex-wrap gap-2">
              {['7d', '30d', '90d', '6m', '1y'].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    period === p
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
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
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {analytics && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-xl">💸</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.totalExpenses || 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {analytics.daysAnalyzed} day period
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xl">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.totalIncome || 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {formatCurrency(analytics.averageDailySpending || 0)} avg daily
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📊</span>
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
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {analytics.totalIncome > 0 
                      ? `${Math.max(0, (analytics.balance / analytics.totalIncome) * 100).toFixed(1)}% savings rate`
                      : 'No income data'
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-xl">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.totalTransactions || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {formatCurrency(analytics.largestTransaction || 0)} largest transaction
                  </p>
                </div>
              </div>
            </div>

            {/* Heatmap and Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SpendingHeatmap data={analytics.heatmapData || []} />
              
              {/* Category Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Expense by Category</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {analytics.categoryBreakdown.length} categories
                  </span>
                </div>
                {analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <div className="space-y-5">
                    {analytics.categoryBreakdown.map((category, index) => {
                      const percentage = (category.percentage * 100).toFixed(1);
                      return (
                        <div key={category.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full ${getCategoryColor(index)} mr-3`}></div>
                              <span className="text-sm font-medium text-gray-900">
                                {category.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500">
                                {percentage}%
                              </span>
                              <span className="text-sm font-semibold text-gray-900 min-w-[80px] text-right">
                                {formatCurrency(category.amount)}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${getCategoryColor(index)} transition-all duration-700 ease-out`}
                              style={{
                                width: `${percentage}%`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No expense data available</p>
                )}
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Trend */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Trend</h3>
                {analytics.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                  <div className="h-80">
                    <Line
                      data={{
                        labels: analytics.monthlyTrend.map(month => month.month),
                        datasets: [
                          {
                            label: 'Income',
                            data: analytics.monthlyTrend.map(month => month.income || 0),
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.10)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                          },
                          {
                            label: 'Expenses',
                            data: analytics.monthlyTrend.map(month => month.expense || 0),
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.10)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                          },
                          {
                            label: 'Balance',
                            data: analytics.monthlyTrend.map(month => (month.income || 0) - (month.expense || 0)),
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2,
                            borderDash: [6, 4],
                            pointRadius: 0,
                            pointHoverRadius: 3,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: { color: '#374151' }
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                              label: function(context) {
                                return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                              },
                              footer: function(items) {
                                try {
                                  const income = items.find(i => i.dataset.label === 'Income')?.raw || 0;
                                  const expense = items.find(i => i.dataset.label === 'Expenses')?.raw || 0;
                                  const balance = income - expense;
                                  return `Net: ${formatCurrency(balance)}`;
                                } catch (e) { return ''; }
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return formatCurrency(value);
                              },
                              color: '#6b7280'
                            },
                            grid: { color: '#f3f4f6' }
                          },
                          x: {
                            ticks: { color: '#6b7280' },
                            grid: { display: false }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No trend data available</p>
                )}
              </div>

              {/* Weekly Spending Pattern */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Spending Pattern</h3>
                {analytics.weeklyPattern && analytics.weeklyPattern.length > 0 ? (
                  <div className="h-80">
                    <Bar
                      data={{
                        labels: analytics.weeklyPattern.map(day => day.day),
                        datasets: [{
                          label: 'Spending',
                          data: analytics.weeklyPattern.map(day => day.amount),
                          backgroundColor: 'rgba(239, 68, 68, 0.7)',
                          borderRadius: 4,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return formatCurrency(context.raw);
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return formatCurrency(value);
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No weekly pattern data available</p>
                )}
              </div>
            </div>

            {/* Detailed Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Spending Categories */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Spending Categories</h3>
                {analytics.topCategories && analytics.topCategories.length > 0 ? (
                  <div className="h-80">
                    <Bar
                      data={{
                        labels: analytics.topCategories.slice(0, 5).map(cat => cat.name),
                        datasets: [{
                          label: 'Spending Amount',
                          data: analytics.topCategories.slice(0, 5).map(cat => cat.amount),
                          backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(249, 115, 22, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                          ],
                          borderColor: [
                            'rgb(239, 68, 68)',
                            'rgb(249, 115, 22)',
                            'rgb(245, 158, 11)',
                            'rgb(16, 185, 129)',
                            'rgb(59, 130, 246)',
                          ],
                          borderWidth: 1,
                          borderRadius: 4,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                return formatCurrency(context.raw);
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => formatCurrency(value)
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No category data available</p>
                )}
              </div>

              {/* Spending Patterns */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Spending Patterns</h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 text-sm">📅</span>
                      </div>
                      <span className="text-sm text-gray-600">Average Daily Spending</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(analytics.averageDailySpending || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-red-600 text-sm">🔥</span>
                      </div>
                      <span className="text-sm text-gray-600">Largest Transaction</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(analytics.largestTransaction || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-600 text-sm">🔢</span>
                      </div>
                      <span className="text-sm text-gray-600">Total Transactions</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {analytics.totalTransactions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 text-sm">📆</span>
                      </div>
                      <span className="text-sm text-gray-600">Days Analyzed</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {analytics.daysAnalyzed || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Health */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Financial Health</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Expense to Income Ratio</span>
                      <span className={`text-sm font-semibold ${
                        analytics.expenseToIncomeRatio > 0.8 ? 'text-red-600' : 
                        analytics.expenseToIncomeRatio > 0.5 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {(analytics.expenseToIncomeRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          analytics.expenseToIncomeRatio > 0.8 ? 'bg-red-500' : 
                          analytics.expenseToIncomeRatio > 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, analytics.expenseToIncomeRatio * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {analytics.expenseToIncomeRatio > 0.8 
                        ? 'High expenses relative to income' 
                        : analytics.expenseToIncomeRatio > 0.5 
                          ? 'Moderate expense ratio' 
                          : 'Healthy expense ratio'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Savings Rate</p>
                        <p className="text-xs text-gray-500">
                          {analytics.totalIncome > 0 
                            ? `Based on ${analytics.totalTransactions} transactions`
                            : 'No transactions yet'}
                        </p>
                      </div>
                      <span className={`text-lg font-bold ${
                        analytics.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analytics.totalIncome > 0 
                          ? `${Math.max(0, (analytics.balance / analytics.totalIncome) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Analysis Period</p>
                        <p className="text-xs text-gray-500">
                          {analytics.summary.period?.startDate 
                            ? `${new Date(analytics.summary.period.startDate).toLocaleDateString()} - 
                               ${new Date(analytics.summary.period.endDate).toLocaleDateString()}`
                            : 'No period data'}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.daysAnalyzed || 0} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {analytics.recommendations && analytics.recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Financial Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.recommendations.map((recommendation, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-bold">{index + 1}</span>
                        </div>
                        <p className="text-sm text-blue-700">{recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!analytics && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
            <p className="text-gray-600 mb-4">
              Start adding transactions to see detailed financial analysis and insights.
            </p>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              Add Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis; 