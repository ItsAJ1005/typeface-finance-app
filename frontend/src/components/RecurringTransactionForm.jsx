import { useState, useEffect } from 'react';
import { FiDollarSign, FiCalendar, FiInfo, FiRepeat } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Button, Input, Select } from './common';

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const categoryOptions = {
  expense: [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
    'Healthcare', 'Utilities', 'Education', 'Travel', 'Others'
  ],
  income: [
    'Salary', 'Business', 'Investment', 'Others'
  ]
};

const RecurringTransactionForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    category: '',
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: new Date().getDate(), // Default to current day of month
    startDate: new Date(),
    endDate: null,
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  // Initialize form with initial data if in edit mode
  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type || 'expense',
        amount: initialData.amount.toString(),
        description: initialData.description || '',
        category: initialData.category || '',
        frequency: initialData.frequency || 'monthly',
        interval: initialData.interval || 1,
        dayOfMonth: initialData.dayOfMonth || new Date(initialData.startDate || new Date()).getDate(),
        startDate: initialData.startDate ? new Date(initialData.startDate) : new Date(),
        endDate: initialData.endDate ? new Date(initialData.endDate) : null,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? value.replace(/[^0-9.]/g, '') : value,
    }));
  };

  const handleDateChange = (date, name) => {
    setFormData(prev => ({
      ...prev,
      [name]: date,
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (formData.interval < 1) {
      newErrors.interval = 'Interval must be at least 1';
    }
    
    if (formData.frequency === 'monthly') {
      const day = parseInt(formData.dayOfMonth, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        newErrors.dayOfMonth = 'Day of month must be between 1 and 31';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      const dataToSubmit = {
        ...formData,
        amount: parseFloat(formData.amount),
        interval: parseInt(formData.interval, 10),
      };
      
      if (formData.frequency === 'monthly') {
        dataToSubmit.dayOfMonth = parseInt(formData.dayOfMonth, 10);
      } else {
        delete dataToSubmit.dayOfMonth;
      }
      
      dataToSubmit.startDate = formData.startDate.toISOString();
      dataToSubmit.endDate = formData.endDate ? formData.endDate.toISOString() : null;
      
      onSubmit(dataToSubmit);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="type"
                value="expense"
                checked={formData.type === 'expense'}
                onChange={handleChange}
              />
              <span className="ml-2">Expense</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="type"
                value="income"
                checked={formData.type === 'income'}
                onChange={handleChange}
              />
              <span className="ml-2">Income</span>
            </label>
          </div>
        </div>

        <div>
          <Input
            label="Amount"
            name="amount"
            type="text"
            value={formData.amount}
            onChange={handleChange}
            error={errors.amount}
            icon={FiDollarSign}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Description"
            name="description"
            type="text"
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            icon={FiInfo}
            placeholder="e.g., Netflix Subscription"
          />
        </div>

        <div>
          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            error={errors.category}
            options={[
              { value: '', label: 'Select a category' },
              ...(formData.type === 'expense' 
                ? categoryOptions.expense.map(cat => ({ value: cat, label: cat }))
                : categoryOptions.income.map(cat => ({ value: cat, label: cat }))
              )
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <div className="flex">
            <Select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              options={frequencyOptions}
              className="flex-1 rounded-r-none"
            />
            <div className="relative">
              <input
                type="number"
                name="interval"
                min="1"
                value={formData.interval}
                onChange={handleChange}
                className={`block w-20 h-10 pl-3 pr-2 py-2 border-l-0 rounded-r-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.interval ? 'border-red-300' : ''
                }`}
              />
            </div>
          </div>
          {errors.interval && (
            <p className="mt-1 text-sm text-red-600">{errors.interval}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <div className="relative">
            <DatePicker
              selected={formData.startDate}
              onChange={(date) => handleDateChange(date, 'startDate')}
              className="block w-full h-10 pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              dateFormat="MMMM d, yyyy"
            />
            <FiCalendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
          <div className="relative">
            <DatePicker
              selected={formData.endDate}
              onChange={(date) => handleDateChange(date, 'endDate')}
              minDate={formData.startDate}
              isClearable
              className="block w-full h-10 pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholderText="No end date"
              dateFormat="MMMM d, yyyy"
            />
            <FiCalendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
          Active (transaction will be processed)
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
        >
          {initialData ? 'Update' : 'Create'} Recurring Transaction
        </Button>
      </div>
    </form>
  );
};

export default RecurringTransactionForm;
