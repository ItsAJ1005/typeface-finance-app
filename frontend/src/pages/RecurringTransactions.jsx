import { useState, useEffect } from 'react';
import { FiPlus, FiRefreshCw, FiPause, FiPlay, FiEdit2, FiTrash2, FiLoader, FiRepeat, FiInfo } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { format } from 'date-fns';
import recurringTransactionAPI from '../services/recurringTransactionService';
import { Modal, Button, ConfirmDialog, Header } from '../components/common';
import RecurringTransactionForm from '../components/RecurringTransactionForm';

const RecurringTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recurring transactions
  const fetchRecurringTransactions = async () => {
    console.log('Fetching recurring transactions...');
    try {
      setLoading(true);
      setError('');
      
      console.log('Calling recurringTransactionAPI.getAll()');
      const response = await recurringTransactionAPI.getAll();
      console.log('API Response:', response);
      
      // Handle error response from service
      if (response?.error || !response?.success) {
        console.error('Error in API response:', response);
        const errorMessage = response?.message || 'Error fetching transactions';
        setError(errorMessage);
        setTransactions([]);
        toast.error(errorMessage);
        return;
      }
      
      // The service returns { success, data: [], message, count }
      const transactions = Array.isArray(response.data) ? response.data : [];
      console.log('Processed transactions:', transactions);
      
      // Set transactions from response data
      setTransactions(transactions);
      
      // Show success message if there are no transactions
      if (transactions.length === 0) {
        console.log('No transactions found');
        toast.info('No recurring transactions found');
      } else {
        console.log(`Found ${transactions.length} transactions`);
        toast.success(`Found ${transactions.length} recurring transactions`);
      }
    } catch (err) {
      console.error('Error in fetchRecurringTransactions:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack
      });
      const errorMessage = err.response?.data?.message || 'Failed to load recurring transactions';
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRecurringTransactions();
  };

  useEffect(() => {
    fetchRecurringTransactions();
  }, []);

  // Helper function to calculate next occurrence based on frequency
  const calculateNextOccurrence = (startDate, frequency, dayOfMonth) => {
    const date = new Date(startDate);
    const now = new Date();
    
    // If start date is in the future, use it as next occurrence
    if (date > now) return date.toISOString();
    
    // Calculate next occurrence based on frequency
    switch (frequency) {
      case 'daily':
        date.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        // Set to the same day next month
        const nextMonth = now.getMonth() + 1;
        const year = now.getFullYear() + (nextMonth > 11 ? 1 : 0);
        const month = nextMonth % 12;
        const day = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate());
        date.setFullYear(year, month, day);
        break;
      case 'yearly':
        date.setFullYear(now.getFullYear() + 1);
        break;
      default:
        return startDate.toISOString();
    }
    
    return date.toISOString();
  };

  // Handle form submission (create/update)
  const handleSubmit = async (formData) => {
    try {
      // Prepare the data to be sent to the API
      const transactionData = {
        ...formData,
        // Ensure amount is a number
        amount: parseFloat(formData.amount),
        // Ensure interval is a number
        interval: parseInt(formData.interval, 10),
        // Set next occurrence based on frequency
        nextOccurrence: calculateNextOccurrence(
          new Date(formData.startDate),
          formData.frequency,
          formData.dayOfMonth || new Date(formData.startDate).getDate()
        ),
        // Include dayOfMonth for monthly frequency
        ...(formData.frequency === 'monthly' && { 
          dayOfMonth: parseInt(formData.dayOfMonth || new Date(formData.startDate).getDate(), 10) 
        })
      };

      if (editingTransaction) {
        await recurringTransactionAPI.update(editingTransaction._id, transactionData);
        toast.success('Recurring transaction updated successfully');
      } else {
        await recurringTransactionAPI.create(transactionData);
        toast.success('Recurring transaction created successfully');
      }
      
      setShowForm(false);
      setEditingTransaction(null);
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error submitting recurring transaction:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      await recurringTransactionAPI.delete(transactionToDelete._id);
      toast.success('Recurring transaction deleted successfully');
      setShowDeleteConfirm(false);
      fetchRecurringTransactions();
    } catch (error) {
      toast.error('Failed to delete recurring transaction');
      console.error('Error deleting transaction:', error);
    }
  };

  // Toggle active status
  const toggleActiveStatus = async (transaction) => {
    try {
      await recurringTransactionAPI.toggleActive(transaction._id);
      toast.success(`Transaction ${transaction.isActive ? 'paused' : 'resumed'} successfully`);
      fetchRecurringTransactions();
    } catch (error) {
      toast.error('Failed to update transaction status');
      console.error('Error toggling status:', error);
    }
  };

  // Format frequency for display
  const formatFrequency = (frequency, interval = 1) => {
    if (frequency === 'daily') return interval === 1 ? 'Daily' : `Every ${interval} days`;
    if (frequency === 'weekly') return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    if (frequency === 'monthly') return interval === 1 ? 'Monthly' : `Every ${interval} months`;
    if (frequency === 'yearly') return interval === 1 ? 'Yearly' : `Every ${interval} years`;
    return frequency;
  };

  // Format amount with currency
  const formatAmount = (amount, type) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Header/>
      <div className="container mx-auto px-4 py-8">
        <ToastContainer 
          position="top-right" 
          autoClose={3000} 
          hideProgressBar={false} 
          newestOnTop 
          closeOnClick 
          rtl={false} 
          pauseOnFocusLoss 
          draggable 
          pauseOnHover 
        />
        
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">AutoPay</h1>
              <p className="text-gray-600 mt-1">Manage your recurring payments and income</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center gap-2"
                disabled={refreshing}
              >
                <FiRefreshCw className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setEditingTransaction(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-700 text-white"
              >
                <FiPlus className="text-lg" /> Set Up AutoPay
              </Button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-100">
                  <FiRepeat className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-700">Active AutoPays</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {transactions.filter(t => t.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-5 rounded-xl border border-green-100">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-green-100">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-700">Monthly Income</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatAmount(transactions
                      .filter(t => t.isActive && t.type === 'income' && t.frequency === 'monthly')
                      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-5 rounded-xl border border-red-100">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-red-100">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-700">Monthly Expenses</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatAmount(transactions
                      .filter(t => t.isActive && t.type === 'expense' && t.frequency === 'monthly')
                      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading AutoPays</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-8 border border-gray-100">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <FiRepeat className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AutoPays found</h3>
              <p className="text-gray-500 mb-6">Get started by setting up your first AutoPay</p>
              <Button
                onClick={() => setShowForm(true)}
                variant="primary"
                className="inline-flex items-center gap-2"
              >
                <FiPlus /> Set Up AutoPay
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Occurrence
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {transaction.category ? transaction.category.charAt(0).toUpperCase() : 'T'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.description || 'No description'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.category || 'Uncategorized'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                          {formatAmount(transaction.amount, transaction.type)}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {transaction.type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFrequency(transaction.frequency, transaction.interval)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.nextOccurrence).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {transaction.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => toggleActiveStatus(transaction)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                            title={transaction.isActive ? 'Pause' : 'Resume'}
                          >
                            {transaction.isActive ? <FiPause className="text-gray-600 hover:text-blue-600" /> : <FiPlay className="text-gray-600 hover:text-blue-600" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setShowForm(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                            title="Edit"
                          >
                            <FiEdit2 className="text-gray-600 hover:text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              setTransactionToDelete(transaction);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                            title="Delete"
                          >
                            <FiTrash2 className="text-gray-600 hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AutoPay Information Section */}
        <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <FiInfo className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">About AutoPay</h2>
          </div>
          <div className="prose max-w-none text-gray-600">
            <p className="mb-4">
              AutoPay helps you manage your recurring payments and income automatically. 
              Set it once and we'll handle the rest, ensuring you never miss a payment or forget to track regular income.
            </p>
            
            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">How to set up AutoPay:</h3>
            <ol className="list-decimal pl-5 space-y-2 mb-6">
              <li>Click on "Set Up AutoPay" button</li>
              <li>Select the transaction type (expense or income)</li>
              <li>Enter the amount and description</li>
              <li>Choose the frequency (daily, weekly, monthly, yearly)</li>
              <li>Set the start date and optional end date</li>
              <li>For monthly payments, specify the day of the month</li>
            </ol>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-800 mb-2">Pro Tip</h4>
              <p className="text-blue-700">
                Use AutoPay for regular bills, subscriptions, and income sources to maintain accurate financial forecasts 
                and get better insights into your cash flow.
              </p>
            </div>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingTransaction(null);
          }}
          title={editingTransaction ? 'Update AutoPay' : 'Create AutoPay'}
        >
          <RecurringTransactionForm
            initialData={editingTransaction}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
          />
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Remove AutoPay"
          message="Are you sure you want to remove this AutoPay? This action cannot be undone."
          confirmText="Remove AutoPay"
          cancelText="Keep AutoPay"
          variant="danger"
        />
      </div>
    </>
  );
};

export default RecurringTransactions;