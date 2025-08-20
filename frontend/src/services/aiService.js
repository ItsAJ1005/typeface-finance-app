import { api } from './api';

export const getFinancialInsights = async () => {
  try {
    const response = await api.get('/ai/insights', { timeout: 65000 });
    return response; // interceptor already returns response.data
  } catch (error) {
    console.error('Error fetching financial insights:', error);
    throw error;
  }
};

export const getFinancialAdvice = async () => {
  try {
    const response = await api.get('/ai/advice', { timeout: 65000 });
    return response; // interceptor already returns response.data
  } catch (error) {
    console.error('Error fetching financial advice:', error);
    throw error;
  }
};
