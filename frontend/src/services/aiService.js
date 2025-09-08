import api from './api';

export const getFinancialInsights = async () => {
  try {
    const response = await api.get('/ai/insights', { timeout: 65000 });
    // The interceptor returns { success: true, data: { ... } }
    if (response && response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch financial insights');
  } catch (error) {
    console.error('Error fetching financial insights:', error);
    throw error;
  }
};

export const getFinancialAdvice = async () => {
  try {
    const response = await api.get('/ai/advice', { timeout: 65000 });
    // The interceptor returns { success: true, data: { ... } }
    if (response && response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch financial advice');
  } catch (error) {
    console.error('Error fetching financial advice:', error);
    throw error;
  }
};
