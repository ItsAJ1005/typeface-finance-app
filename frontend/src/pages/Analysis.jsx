import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Header from '../components/common/Header';
import { transactionAPI } from '../services/api';
import Loader from '../components/common/Loader';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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
      
      console.log('Fetching analytics with period:', period);
      // Include transactions in the response for weekly pattern calculation
      const response = await transactionAPI.getAnalytics({ 
        period,
        includeTransactions: true 
      });
      console.log('Raw analytics response:', response);
      
      // transactionAPI.getAnalytics returns the data object directly
      if (response) {
        // Log the full response structure for debugging
        console.log('Full analytics response structure:', JSON.stringify(response, null, 2));
        
        const responseData = response;
        const { 
          summary = { totalIncome: 0, totalExpense: 0, balance: 0, period: {} }, 
          categoryBreakdown = [], 
          monthlyTrend = [],
          heatmapData: heatmapDataResponse = [],
          totalTransactions = 0 
        } = responseData;
        
        console.log('Heatmap data from backend:', heatmapDataResponse);
        
        console.log('Heatmap data from response:', heatmapDataResponse);
        
        console.group('Processed Analytics Data');
        console.log('Summary:', summary);
        console.log('Category Breakdown:', categoryBreakdown);
        console.log('Monthly Trend:', monthlyTrend);
        console.log('Total Transactions:', totalTransactions);
        console.groupEnd();
        
        // Process monthly trend data
        const processedMonthlyTrend = monthlyTrend.map(month => ({
          ...month,
          month: new Date(month.month + '-01').toLocaleString('default', { month: 'short', year: 'numeric' })
        }));

        // Process category breakdown
        const processedCategoryBreakdown = [...categoryBreakdown]
          .sort((a, b) => b.amount - a.amount)
          .map(cat => ({
            ...cat,
            percentage: cat.percentage / 100 // Convert to decimal for consistency
          }));
          
        // Process heatmap data from response or use empty array if not available
        const heatmapData = responseData.heatmapData || [];
        console.log('Heatmap data from backend:', heatmapData);
        
        // Compute period days if backend didn't include it
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
          // Calculate derived metrics
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
          // Process heatmap data from backend or synthesize from transactions
          heatmapData: (() => {
            const transactions = Array.isArray(responseData.transactions) ? responseData.transactions : [];
            if (!Array.isArray(heatmapDataResponse) || heatmapDataResponse.length === 0) {
              // Build from transactions (expenses only)
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
            
            console.log('Processing heatmap data:', heatmapDataResponse);
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
          // Calculate weekly spending pattern from transactions
          weeklyPattern: (() => {
            // Initialize days of week with 0 amount
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weeklyPattern = days.map(day => ({ day, amount: 0 }));
            
            // Get all transactions from the current period
            const transactions = responseData.transactions || [];
            
            // Calculate weekly pattern
            transactions.forEach(tx => {
              if (tx.type === 'expense') {
                const date = new Date(tx.date);
                const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
                weeklyPattern[dayOfWeek].amount += Math.abs(tx.amount);
              }
            });
            
            console.log('Weekly pattern calculated:', weeklyPattern);
            return weeklyPattern;
          })(),
          // Compute scaling helpers and derived lists
          maxDailySpending: 0,
          topCategories: [],
          recommendations: [
            'Consider setting a budget for your top spending categories.',
            'Review your monthly trends to identify areas for potential savings.'
          ]
        };
        // Post-process derived fields that depend on previous calculations
        analyticsData.maxDailySpending = Math.max(
          ...(analyticsData.weeklyPattern || []).map(d => d.amount || 0),
          0
        );
        analyticsData.topCategories = (analyticsData.categoryBreakdown || [])
          .slice()
          .sort((a, b) => (b.amount || 0) - (a.amount || 0));
        
        console.log('Setting analytics state:', analyticsData);
        setAnalytics(analyticsData);
        return;
      } else {
        // Set default values if no data is available
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
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: errorMessage
      });
      
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

  // Helpers
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Heatmap</h3>
          <p className="text-gray-500 text-center py-8">No spending data available for the selected period</p>
        </div>
      );
    }

    try {
      // Process and validate data
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of day
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      
      console.log('Processing heatmap data:', data);
      
      // Create a map of date to data point
      const dateMap = new Map();
      const processedData = [];
      
      // Process the incoming data
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
      
      // Generate all dates in the range, filling in missing dates with zero amounts
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
      
      // Calculate min and max for color scaling
      const amounts = processedData.map(d => d.amount).filter(amount => amount > 0);
      const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
      const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 1;
      const range = maxAmount - minAmount;
      
      console.log('Processed heatmap data:', {
        dateRange: `${thirtyDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
        dataPoints: processedData.length,
        nonZeroDataPoints: amounts.length,
        minAmount,
        maxAmount,
        range
      });
      
      // Group data by weeks for rendering
      const weeks = [];
      let currentWeek = Array(7).fill(null);
      
      processedData.forEach(day => {
        const dayOfWeek = day.dayOfWeek; // 0 (Sunday) to 6 (Saturday)
        currentWeek[dayOfWeek] = day;
        
        // If it's Saturday, push the current week and start a new one
        if (dayOfWeek === 6) {
          weeks.push([...currentWeek]);
          currentWeek = Array(7).fill(null);
        }
      });
      
      // Push the last week if it's not empty
      if (currentWeek.some(day => day !== null)) {
        weeks.push([...currentWeek]);
      }
      
      // Function to get color based on amount
      const getHeatmapColor = (amount) => {
        if (amount <= 0) return 'bg-gray-100';
        
        const intensity = range > 0 ? (amount - minAmount) / range : 0;
        
        // Define color scale from light to dark red
        if (intensity < 0.2) return 'bg-red-100';
        if (intensity < 0.4) return 'bg-red-200';
        if (intensity < 0.6) return 'bg-red-300';
        if (intensity < 0.8) return 'bg-red-400';
        return 'bg-red-500';
      };
      
      // Render tooltip content
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-xs text-gray-500 text-center py-1 w-8 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Heatmap cells */}
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
                      'w-8 h-8 rounded-sm relative group',
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
          
          {/* Legend */}
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
          
          {/* Date range */}
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                        ? Math.max(0, (analytics.balance / analytics.totalIncome) * 100).toFixed(1) + '%'
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Expense by Category</h3>
                  <span className="text-sm text-gray-500">
                    {analytics.categoryBreakdown.length} categories
                  </span>
                </div>
                {analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.categoryBreakdown.map((category, index) => {
                      const percentage = (category.percentage * 100).toFixed(1);
                      return (
                        <div key={category.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)} mr-2`}></div>
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
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getCategoryColor(index).replace('bg-', 'bg-opacity-80 bg-')}`}
                              style={{
                                width: `${percentage}%`,
                                transition: 'width 0.5s ease-in-out'
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
                {analytics.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.monthlyTrend.map((month) => (
                      <div key={month.month} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{month.month}</span>
                          <span className={`text-sm font-medium ${
                            month.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(month.balance)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <span className="w-16 text-gray-600">Income:</span>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(month.income || 0)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-16 text-gray-600">Expense:</span>
                            <span className="text-red-600 font-medium">
                              {formatCurrency(month.expense || 0)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          {month.income > 0 && (
                            <div 
                              className="bg-green-500 h-1.5 rounded-full" 
                              style={{
                                width: `${Math.min(100, (month.income / (month.income + month.expense)) * 100)}%`
                              }}
                            />
                          )}
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
                  <div>
                    <Bar
                      data={{
                        labels: analytics.topCategories.slice(0, 5).map(cat => cat.name),
                        datasets: [{
                          label: 'Spending Amount',
                          data: analytics.topCategories.slice(0, 5).map(cat => cat.amount),
                          backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',   // red-500
                            'rgba(249, 115, 22, 0.8)',  // orange-500
                            'rgba(245, 158, 11, 0.8)',  // amber-500
                            'rgba(16, 185, 129, 0.8)',  // green-500
                            'rgba(59, 130, 246, 0.8)',  // blue-500
                          ],
                          borderColor: [
                            'rgb(239, 68, 68)',   // red-500
                            'rgb(249, 115, 22)',  // orange-500
                            'rgb(245, 158, 11)',  // amber-500
                            'rgb(16, 185, 129)',  // green-500
                            'rgb(59, 130, 246)',  // blue-500
                          ],
                          borderWidth: 1
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
                      style={{ height: '300px' }}
                    />
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
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Expense to Income Ratio</span>
                      <span className={`text-sm font-semibold ${
                        analytics.expenseToIncomeRatio > 0.8 ? 'text-red-600' : 
                        analytics.expenseToIncomeRatio > 0.5 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {(analytics.expenseToIncomeRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
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

                  <div className="pt-2 border-t border-gray-100">
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

                  <div className="pt-2 border-t border-gray-100">
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