import { Link } from 'react-router-dom';
import { useState } from 'react';

const LandingPage = () => {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner */}
      {showBanner && (
        <div className="bg-black text-white py-2 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">💰</span>
            </div>
            <span className="text-sm">Discover the latest features of Personal Finance Assistant</span>
            <Link to="/register" className="text-red-400 hover:text-red-300 text-sm font-medium">
              Learn more →
            </Link>
          </div>
          <button 
            onClick={() => setShowBanner(false)}
            className="text-white hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">FinanceTracker</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/#features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link to="/#how-it-works" className="text-gray-600 hover:text-gray-900">How it Works</Link>
              <Link to="/#about" className="text-gray-600 hover:text-gray-900">About</Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign in
              </Link>
              <Link 
                to="/register" 
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Track Your Finances, Master Your Future
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Personal finance management made simple with AI-powered insights. 
              By <span className="font-semibold text-red-500">AJ Harsh Vardhan</span>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
              <Link 
                to="/register" 
                className="bg-red-500 text-white px-8 py-3 rounded-md hover:bg-red-600 font-medium text-lg"
              >
                Get Started →
              </Link>
              <Link 
                to="/login" 
                className="flex items-center space-x-2 text-red-500 hover:text-red-600 font-medium text-lg"
              >
                <span>▶</span>
                <span>Demo Login</span>
              </Link>
            </div>

            {/* Finance-themed Graphics */}
            <div className="relative mt-16">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-96 h-96 bg-gradient-to-br from-red-50 to-red-100 rounded-full opacity-20"></div>
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Smart Analytics</h3>
                  <p className="text-gray-600">Visualize your spending patterns with interactive charts</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📱</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Receipt OCR</h3>
                  <p className="text-gray-600">Automatically extract expenses from receipts</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Easy Tracking</h3>
                  <p className="text-gray-600">Simple income and expense management</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Features</h2>
              <p className="text-xl text-gray-600">Everything you need to manage your finances effectively</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-3xl">💰</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Income & Expense Tracking</h3>
                <p className="text-gray-600">Easily log your income and expenses with detailed categorization</p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-3xl">📈</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Analytics & Charts</h3>
                <p className="text-gray-600">Visualize your spending patterns with interactive charts and graphs</p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-3xl">📷</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Receipt Processing</h3>
                <p className="text-gray-600">Upload receipts and automatically extract transaction details</p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Advanced Filtering</h3>
                <p className="text-gray-600">Filter transactions by date range, category, and search terms</p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Category Insights</h3>
                <p className="text-gray-600">Understand your spending habits with category-wise breakdowns</p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-3xl">🔄</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">PDF Import</h3>
                <p className="text-gray-600">Import transaction history from PDF statements</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-red-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Take Control?</h2>
            <p className="text-xl text-red-100 mb-8">Start managing your finances today with our powerful tools</p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link 
                to="/register" 
                className="bg-white text-red-500 px-8 py-3 rounded-md hover:bg-gray-100 font-medium text-lg"
              >
                Get Started Free
              </Link>
              <Link 
                to="/login" 
                className="text-white border border-white px-8 py-3 rounded-md hover:bg-white hover:text-red-500 font-medium text-lg"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold">FinanceTracker</span>
            </div>
            <p className="text-gray-400 mb-4">
              Personal Finance Assistant by AJ Harsh Vardhan
            </p>
            <p className="text-gray-500 text-sm">
              Built with React, Node.js, and MongoDB
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 