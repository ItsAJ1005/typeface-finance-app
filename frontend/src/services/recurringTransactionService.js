import api from './api';

const recurringTransactionAPI = {
  // Get all recurring transactions
  getAll: async () => {
    try {
      // Use the base path without the leading /api since it's already included in the baseURL
      const response = await api.get('/v1/recurring-transactions');
      console.log('Raw API response:', response);
      
      // The backend returns { status, results, data: { recurringTransactions: [...] } }
      const transactions = response?.data?.data?.recurringTransactions || [];
      
      // Return the data in the format expected by the component
      return {
        success: response.data?.status === 'success',
        data: Array.isArray(transactions) ? transactions : [],
        message: 'Successfully fetched recurring transactions',
        count: response.data?.results || 0
      };
    } catch (error) {
      console.error('Error fetching recurring transactions:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Return a consistent response structure even on error
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch recurring transactions',
        count: 0,
        error: true
      };
    }
  },

  // Get a single recurring transaction by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/v1/recurring-transactions/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching recurring transaction ${id}:`, error);
      throw error;
    }
  },

  // Create a new recurring transaction
  create: async (transactionData) => {
    try {
      console.log('Sending transaction data:', JSON.stringify(transactionData, null, 2));
      const response = await api.post('/v1/recurring-transactions', transactionData);
      console.log('Create transaction response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating recurring transaction:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      throw error;
    }
  },

  // Update an existing recurring transaction
  update: async (id, updateData) => {
    try {
      const response = await api.patch(`/v1/recurring-transactions/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating recurring transaction ${id}:`, error);
      throw error;
    }
  },

  // Delete a recurring transaction
  delete: async (id) => {
    try {
      await api.delete(`/v1/recurring-transactions/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting recurring transaction ${id}:`, error);
      throw error;
    }
  },

  // Toggle active status of a recurring transaction
  toggleActive: async (id) => {
    try {
      const response = await api.patch(`/v1/recurring-transactions/${id}/toggle-active`);
      return response.data;
    } catch (error) {
      console.error(`Error toggling active status for transaction ${id}:`, error);
      throw error;
    }
  },
};

export default recurringTransactionAPI;
