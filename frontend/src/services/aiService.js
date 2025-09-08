import api from './api';

export const sendMessage = async (message) => {
  try {
    const response = await api.post('/ai/chat', { message }, { timeout: 30000 });
    if (response && response.success) {
      return { data: response.data };
    }
    throw new Error('Failed to get response from AI');
  } catch (error) {
    console.error('Error sending message to AI:', error);
    // Surface a friendly message for unauthenticated users
    if (error.status === 401) {
      throw new Error('Please sign in to chat with your financial assistant.');
    }
    throw error;
  }
};

export const getFinancialInsights = async () => {
  try {
    const response = await api.get('/ai/insights', { timeout: 65000 });
    // The interceptor returns { success: true, data: { ... } }
    if (response && response.success) {
      // response.data here is the backend's `data` field (a string). Wrap it for the UI.
      return { data: response.data };
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
      // response.data is a string from backend; wrap it for consistent consumer shape
      return { data: response.data };
    }
    throw new Error('Failed to fetch financial advice');
  } catch (error) {
    console.error('Error fetching financial advice:', error);
    throw error;
  }
};
