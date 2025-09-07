import React from 'react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error = '',
  className = '',
  ...props
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        className={`block w-full pl-3 pr-10 py-2 text-base border ${
          error ? 'border-red-300' : 'border-gray-300'
        } focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Select;
