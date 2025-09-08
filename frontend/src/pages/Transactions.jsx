import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { transactionAPI } from '../services/api';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';

const Transactions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  // Filter states
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Form states
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: (() => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    })()
  });

  const categories = {
    expense: [
      'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
      'Healthcare', 'Utilities', 'Education', 'Travel', 'Others'
    ],
    income: [
      'Salary', 'Business', 'Investment', 'Others'
    ]
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchParams]);

  // Handle URL parameters for pre-filling form when coming from receipts
  useEffect(() => {
    const amount = searchParams.get('amount');
    const merchant = searchParams.get('merchant');
    const date = searchParams.get('date');
    const description = searchParams.get('description');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const receiptId = searchParams.get('receiptId');

    // If we have transaction data from URL params, pre-fill the form and open modal
    if (amount || merchant || date || description) {
      // Convert date format if needed (from ISO to yyyy-MM-dd)
      let formattedDate = date;
      if (date) {
        try {
          const dateObj = new Date(date);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error('Error parsing date:', error);
          formattedDate = new Date().toISOString().split('T')[0]; // Fallback to today
        }
      }

      setFormData(prev => ({
        ...prev,
        amount: amount || prev.amount,
        description: description || prev.description,
        date: formattedDate || prev.date,
        type: type || prev.type,
        category: category || prev.category
      }));
      
      // Open the add modal with pre-filled data
      setShowAddModal(true);
      
      // Clear the URL parameters after processing them
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('amount');
      newSearchParams.delete('merchant');
      newSearchParams.delete('date');
      newSearchParams.delete('description');
      newSearchParams.delete('type');
      newSearchParams.delete('category');
      newSearchParams.delete('receiptId');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: searchParams.get('page') || 1,
        limit: searchParams.get('limit') || 10,
        type: searchParams.get('type') || '',
        category: searchParams.get('category') || '',
        startDate: searchParams.get('startDate') || '',
        endDate: searchParams.get('endDate') || '',
        search: searchParams.get('search') || ''
      };

      const response = await transactionAPI.getAll(params);
      const txList = response?.data?.transactions || response?.transactions || [];
      const paginationInfo = response?.data?.pagination || response?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
      };
      setTransactions(Array.isArray(txList) ? txList : []);
      setPagination(paginationInfo);
    } catch (error) {
      setError(error.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set(key, value);
    } else {
      newSearchParams.delete(key);
    }
    newSearchParams.set('page', '1'); // Reset to first page
    setSearchParams(newSearchParams);
  };

  const handlePageChange = (page) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', page.toString());
    setSearchParams(newSearchParams);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (selectedDate > today) {
      setError('Transaction date cannot be in the future');
      return;
    }
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (showEditModal && selectedTransaction) {
        await transactionAPI.update(selectedTransaction._id, formData);
      } else {
        await transactionAPI.create(formData);
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedTransaction(null);
      resetForm();
      fetchTransactions();
      
      // Show success message if coming from receipt
      const receiptId = searchParams.get('receiptId');
      if (receiptId) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50';
        successDiv.innerHTML = `
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">Transaction Created Successfully!</h3>
              <div class="mt-2 text-sm text-green-700">
                <p>✅ Transaction from receipt has been saved to your list.</p>
                <p>💡 <strong>Note:</strong> Click "Save" to see the updated transaction in your list.</p>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 6000);
      }
    } catch (error) {
      // Handle validation errors from backend
      console.error('Save transaction error:', error);
      if (error.errors && Array.isArray(error.errors)) {
        // Support both backend raw validator format and standardized api error shape
        const errorMessages = error.errors.map(err => `${err.param || err.field}: ${err.msg || err.message}`).join(', ');
        setError(errorMessages || error.message || 'Failed to save transaction');
      } else {
        setError(error.message || 'Failed to save transaction');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
	// Find the transaction by id to check flags like isFromReceipt
	const tx = transactions.find(t => t._id === id);

	if (window.confirm('Are you sure you want to delete this transaction?')) {
		try {
			await transactionAPI.delete(id);
			// Show special message when deleting a receipt-based transaction
			if (tx?.isFromReceipt) {
				const successDiv = document.createElement('div');
				successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50';
				successDiv.innerHTML = `
					<div class="flex items-start">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-green-800">Receipt Deleted</h3>
							<div class="mt-2 text-sm text-green-700">
								<p>✅ Receipt deleted successfully. You can now upload new receipts.</p>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(successDiv);
				setTimeout(() => successDiv.remove(), 5000);
			}
			fetchTransactions();
		} catch (error) {
			setError(error.message || 'Failed to delete transaction');
		}
	}
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    setFormData({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: todayString
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader size="lg" text="Loading transactions..." />
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
              <p className="text-gray-600">
                Manage your income and expenses
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium"
            >
              + Add Transaction
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Categories</option>
                {filters.type === 'income' ? 
                  categories.income.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  )) :
                  categories.expense.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    type: '', category: '', startDate: '', endDate: '', search: ''
                  });
                  setSearchParams({});
                }}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Transactions ({pagination.totalItems})
              </h2>
              <div className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600 mb-4">
                {Object.values(filters).some(v => v) 
                  ? 'Try adjusting your filters' 
                  : 'Start by adding your first transaction'
                }
              </p>
              {!Object.values(filters).some(v => v) && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium"
                >
                  Add Transaction
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <span className="text-xl">
                          {transaction.type === 'income' ? '💰' : '💸'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {transaction.description || 'No description'}
                        </h3>
                        <p className="text-sm text-gray-600">{transaction.category}</p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`font-semibold text-lg ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(transaction._id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedTransaction(null);
          resetForm();
        }}
        title={showEditModal ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Helpful note for users */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>💡 Tip:</strong> Click "Save" to add this transaction to your list and see it updated immediately.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value, category: ''})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="">Select Category</option>
                {categories[formData.type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
              rows="3"
              placeholder="Enter transaction description..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedTransaction(null);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (showEditModal ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Transactions;
