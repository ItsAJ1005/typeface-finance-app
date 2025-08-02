import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const YOUR_BACKEND_URL = 'https://typeface-finance-app.onrender.com'; // Replace with your backend URL

// Base URL from environment or fallback
const BASE_URL = YOUR_BACKEND_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your connection and ensure the backend server is running.',
        status: 0
      });
    }

    // Handle authentication errors
    if (error.response.status === 401) {
      removeToken();
      // Don't redirect automatically for login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject({
        message: error.response.data?.message || 'Invalid credentials. Please check your email and password.',
        status: 401
      });
    }

    // Handle server errors
    if (error.response.status >= 500) {
      // Use the actual error message from the backend if available
      const backendMessage = error.response.data?.message;
      return Promise.reject({
        message: backendMessage || 'Server error. Please try again later or contact support.',
        status: error.response.status,
        details: error.response.data?.details
      });
    }

    // Handle validation errors
    if (error.response.status === 400) {
      const errors = error.response.data?.errors;
      if (errors && errors.length > 0) {
        const errorMessages = errors.map(err => err.msg).join(', ');
        return Promise.reject({
          message: errorMessages,
          status: 400,
          errors: errors
        });
      }
    }

    // Handle receipt upload with processing warnings (422 status)
    if (error.response.status === 422) {
      console.log('422 response data:', error.response.data);
      console.log('422 response URL:', error.config?.url);
      // Check if this is a receipt upload with processing issues
      // The backend returns 422 when OCR processing fails but upload succeeds
      if (error.response.data?.processingError || 
          error.response.data?.success === false || 
          error.response.data?.message?.includes('processing failed')) {
        console.log('Treating 422 as success with warnings');
        // This is a receipt upload that succeeded but had processing issues
        // We should treat this as a success with warnings
        return Promise.resolve({
          ...error.response.data,
          _isProcessingWarning: true,
          processingError: error.response.data?.processingError
        });
      }
    }

    // Handle receipt upload specific errors
    if (error.config?.url?.includes('/receipts/upload')) {
      console.log('Receipt upload error:', error.response.data);
      
      // Handle specific receipt upload errors
      if (error.response.data?.error === 'INVALID_FILE_TYPE') {
        return Promise.reject({
          message: 'Please upload only JPEG, PNG images or PDF files.',
          status: error.response.status
        });
      }
      
      if (error.response.data?.error === 'FILE_TOO_LARGE') {
        return Promise.reject({
          message: 'File size too large. Please upload an image smaller than 10MB.',
          status: error.response.status
        });
      }
      
      if (error.response.data?.error === 'FILE_MISSING') {
        return Promise.reject({
          message: 'No file selected. Please choose a receipt image to upload.',
          status: error.response.status
        });
      }
      
      if (error.response.data?.error === 'PROCESSING_FAILED') {
        return Promise.reject({
          message: error.response.data?.message || 'Failed to process receipt. Please try again with a clearer image.',
          status: error.response.status
        });
      }
      
      // Handle processing errors from 422 responses
      if (error.response.data?.processingError) {
        return Promise.reject({
          message: error.response.data?.message || 'Failed to process receipt. Please try again with a clearer image.',
          status: error.response.status,
          processingError: error.response.data?.processingError
        });
      }
    }

    // Return standardized error
    return Promise.reject({
      message: error.response.data?.message || 'Something went wrong',
      status: error.response.status,
      errors: error.response.data?.errors
    });
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
};

// Transaction API calls
export const transactionAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/transactions${queryString ? `?${queryString}` : ''}`);
  },
  
  create: (transactionData) => api.post('/transactions', transactionData),
  
  update: (id, transactionData) => api.put(`/transactions/${id}`, transactionData),
  
  delete: (id) => api.delete(`/transactions/${id}`),
  
  getById: (id) => api.get(`/transactions/${id}`),
  
  getAnalytics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/transactions/analytics${queryString ? `?${queryString}` : ''}`);
  },
};

// Receipt API calls
export const receiptAPI = {
  upload: (formData) => {
    return api.post('/receipts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getAll: () => api.get('/receipts'),
  
  getById: (id) => api.get(`/receipts/${id}`),
  
  processOCR: (receiptId) => api.post(`/receipts/${receiptId}/process-ocr`),
  
  delete: (id) => api.delete(`/receipts/${id}`),
};

// Category API calls
export const categoryAPI = {
  getAll: (type = 'expense') => api.get(`/categories?type=${type}`),
  
  getSuggestions: (text, type = 'expense') => 
    api.get(`/categories/suggestions?text=${text}&type=${type}`),
  
  categorize: (description, merchant) => 
    api.post('/categories/categorize', { description, merchant }),
};

// Dashboard API calls
export const dashboardAPI = {
  getSummary: (period = '30d') => api.get(`/dashboard/summary?period=${period}`),
  
  getChartData: (chartType, period = '30d') => 
    api.get(`/dashboard/charts/${chartType}?period=${period}`),
};

// Utility functions for common operations
export const apiUtils = {
  // Handle API errors consistently
  handleError: (error, showToast = true) => {
    const message = error.message || 'An unexpected error occurred';
    
    if (showToast && typeof window !== 'undefined' && window.toast) {
      window.toast.error(message);
    }
    
    console.error('API Error:', error);
    return message;
  },
  
  // Format query parameters
  formatParams: (params) => {
    const formatted = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        formatted[key] = params[key];
      }
    });
    return formatted;
  },
  
  // Handle file uploads with progress
  uploadWithProgress: (endpoint, formData, onProgress) => {
    return api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) onProgress(progress);
      },
    });
  },
};

export default api;