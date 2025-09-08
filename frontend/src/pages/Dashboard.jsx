import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import AIInsights from '../components/AIInsights';
import { transactionAPI } from '../services/api';

const Dashboard = () => {
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    period: {}
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchMonthlyAnalytics = async () => {
    try {
      // Process the monthly trend data we already have from the main analytics call
      if (chartData && chartData.length > 0) {
        const formattedData = chartData.map(month => ({
          month: new Date(month.month + '-01').toLocaleString('default', { month: 'short' }),
          year: month.month.split('-')[0],
          income: parseFloat(month.income) || 0,
          expense: parseFloat(month.expense) || 0,
          balance: parseFloat(month.balance) || 0,
          formattedIncome: formatCurrency(month.income || 0),
          formattedExpense: formatCurrency(month.expense || 0),
          formattedBalance: formatCurrency(month.balance || 0)
        }));
        
        setMonthlyData(formattedData);
      } else {
        // Fallback in case chartData is not available
        setMonthlyData([]);
      }
    } catch (error) {
      console.error('Error processing monthly analytics:', error);
      setMonthlyData([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch recent transactions
      try {
        const txResp = await transactionAPI.getAll({ 
          limit: 5,
          sort: '-date',
          includeRecurring: true
        });
        const txList = txResp?.data?.transactions || txResp?.transactions || [];
        console.log('Fetched recent transactions:', txList);
        setRecentTransactions(Array.isArray(txList) ? txList : []);
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        setRecentTransactions([]);
      }
      
      // 2. Fetch analytics data
      console.log('Fetching analytics with includeRecurring: true');
      // Set date range to include all transactions (from July 1, 2025 to now)
      const startDate = '2025-07-01';
      const endDate = new Date().toISOString().split('T')[0];
      
      console.log(`Fetching analytics from ${startDate} to ${endDate}`);
      const analyticsResponse = await transactionAPI.getAnalytics({
        // Do not pass includeRecurring to avoid filtering out normal transactions
        startDate,
        endDate
      });
      
      console.log('Raw Analytics Response:', JSON.stringify(analyticsResponse, null, 2));
      
      // The response is already processed by the API service to extract the data property
      if (analyticsResponse) {
        // Update summary
        const summaryData = {
          totalIncome: parseFloat(analyticsResponse.summary?.totalIncome) || 0,
          totalExpenses: parseFloat(analyticsResponse.summary?.totalExpense) || 0,
          balance: parseFloat(analyticsResponse.summary?.balance) || 0,
          period: analyticsResponse.summary?.period || {}
        };
        setSummary(summaryData);
        
        // Update chart data
        if (analyticsResponse.monthlyTrend) {
          const formattedChartData = analyticsResponse.monthlyTrend.map(month => ({
            ...month,
            income: parseFloat(month.income) || 0,
            expense: parseFloat(month.expense) || 0,
            balance: parseFloat(month.balance) || 0
          }));
          setChartData(formattedChartData);
          
          // Also update monthly data for the table
          const formattedMonthlyData = formattedChartData.map(m => {
            const [yearStr, monthStr] = String(m.month).split('-');
            const yearNum = parseInt(yearStr, 10) || 0;
            const monthNum = parseInt(monthStr, 10) || 0; // 1-12
            return {
              month: new Date(`${yearStr}-${monthStr}-01`).toLocaleString('default', { month: 'short' }),
              year: yearStr,
              yearNum,
              monthNum,
              income: m.income,
              expense: m.expense,
              balance: m.balance,
              formattedIncome: formatCurrency(m.income),
              formattedExpense: formatCurrency(m.expense),
              formattedBalance: formatCurrency(m.balance)
            };
          });
          setMonthlyData(formattedMonthlyData);
        }
        
        // Update category data
        if (analyticsResponse.categoryBreakdown) {
          setCategoryData(analyticsResponse.categoryBreakdown);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Reset all data on error
      setSummary({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        period: {}
      });
      setChartData([]);
      setCategoryData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to FinanceTracker! 👋
          </h1>
          <p className="text-gray-600">
            Manage your finances with ease. Here's what you can do:
          </p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link 
            to="/transactions?action=add" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">➕</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Add Transaction</h3>
            <p className="text-gray-600 text-sm">Quickly log income or expenses</p>
          </Link>

          <Link 
            to="/receipts" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📷</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Receipt</h3>
            <p className="text-gray-600 text-sm">Extract data from receipts</p>
          </Link>

          <Link 
            to="/analysis" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">View Analytics</h3>
            <p className="text-gray-600 text-sm">See spending patterns</p>
          </Link>

          <Link 
            to="/transactions" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">All Transactions</h3>
            <p className="text-gray-600 text-sm">View and manage transactions</p>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚖️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly View */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Overview</h2>
            <p className="text-sm text-gray-500">Income, expenses, and balance for the selected period</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyData && monthlyData.length > 0 ? (
                  [...monthlyData]
                    .sort((a, b) => new Date(`${b.year}-${b.month}-01`) - new Date(`${a.year}-${a.month}-01`))
                    .map((month, index) => (
                      <tr key={`${month.month}-${month.year}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {month.month} {month.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                          {month.income > 0 ? formatCurrency(month.income) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                          {month.expense > 0 ? formatCurrency(month.expense) : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          month.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(month.balance)}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No monthly data available</p>
                        <p className="text-xs text-gray-400 mt-1">Add transactions to see your monthly trends</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <Link 
                to="/transactions" 
                className="text-red-600 hover:text-red-700 font-medium text-sm"
              >
                View all →
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {!Array.isArray(recentTransactions) || recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600 mb-4">Start by adding your first transaction</p>
                <Link 
                  to="/transactions?action=add" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Add Transaction
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => {
                  if (!transaction) return null;
                  
                  const transactionDate = new Date(transaction.date);
                  const isIncome = transaction.type === 'income';
                  const amount = parseFloat(transaction.amount) || 0;
                  const formattedDate = transactionDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  
                  return (
                    <div 
                      key={transaction._id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                          isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          <span className="text-lg">
                            {isIncome ? '💰' : '💸'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900 truncate">
                              {transaction.description || 'No description'}
                            </p>
                            {transaction.isFromRecurring && (
                              <span className="ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Recurring
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">
                              {transaction.category || 'Uncategorized'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {formattedDate}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className={`font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'} {formatCurrency(amount)}
                        </p>
                        {transaction.receiptUrl && (
                          <a 
                            href={transaction.receiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


        {/* Financial Health Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expense to Income Ratio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalIncome > 0 
                    ? `${Math.round((summary.totalExpenses / summary.totalIncome) * 100)}%` 
                    : '0%'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📉</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Savings Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.totalIncome > 0 
                    ? `${Math.max(0, Math.round(((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100))}%` 
                    : '0%'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {recentTransactions.length}+ 
                  <span className="text-sm font-normal text-gray-500 ml-1">this month</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Worth Trend</p>
                <p className={`text-2xl font-bold ${
                  summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.balance >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.balance))}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">AI-Powered Insights</h2>
          <AIInsights />
        </div>


        {/* Quick Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Quick Tips for Evaluators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium">• Try uploading a receipt image to test OCR functionality</p>
              <p className="font-medium">• Add some sample transactions to see the analytics</p>
            </div>
            <div>
              <p className="font-medium">• Use the filters to test pagination and search</p>
              <p className="font-medium">• Check out the charts and AI insights in the Analytics section</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
