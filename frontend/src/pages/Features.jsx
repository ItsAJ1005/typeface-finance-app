import { Link } from 'react-router-dom';

const Features = () => {
  return (
    <div className="min-h-screen bg-white">
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
              <Link to="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link to="/features" className="text-gray-900 font-semibold">Features</Link>
              <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900">How it Works</Link>
              <Link to="/about" className="text-gray-600 hover:text-gray-900">About</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
              <Link to="/register" className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-medium">Get Started</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">Powerful features for smarter money</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">From quick capture to deep insights—everything designed to help you understand, plan, and act with confidence.</p>
          </div>
        </div>
      </section>

      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-5"><span className="text-2xl">💰</span></div>
              <h3 className="text-xl font-semibold mb-2">Income & Expenses</h3>
              <p className="text-gray-600">Capture transactions in seconds. Categorize, search, and filter by time period. Attach receipts for reference.</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li>Fast add and edit</li>
                <li>Custom categories</li>
                <li>Smart search and filters</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-5"><span className="text-2xl">📈</span></div>
              <h3 className="text-xl font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600">Understand where money goes. See category breakdowns, trends over time, and top transactions.</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li>Spending by category</li>
                <li>Income vs expenses</li>
                <li>Monthly trends</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-5"><span className="text-2xl">📷</span></div>
              <h3 className="text-xl font-semibold mb-2">Receipt OCR</h3>
              <p className="text-gray-600">Upload receipts and auto-extract key details—amounts, dates, merchants—to create transactions instantly.</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li>Image/PDF support</li>
                <li>Auto-categorization hints</li>
                <li>Attach to transactions</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center mb-5"><span className="text-2xl">🔔</span></div>
              <h3 className="text-xl font-semibold mb-2">AutoPay & Bills</h3>
              <p className="text-gray-600">Track recurring bills and upcoming due dates so there are no surprises.</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li>Next due indicators</li>
                <li>Recurring schedules</li>
                <li>Expense forecasts</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-5"><span className="text-2xl">🤖</span></div>
              <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
              <p className="text-gray-600">Ask questions like “How much did I spend on food last month?” and get instant, clear answers.</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li>Context-aware responses</li>
                <li>Actionable tips</li>
                <li>Quick summaries</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-5"><span className="text-2xl">🛡️</span></div>
              <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
              <p className="text-gray-600">Secure authentication and careful handling of your financial data.</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li>Protected API endpoints</li>
                <li>Role-based checks</li>
                <li>Local control of data</li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 bg-red-50 border border-red-100 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Ready to try it?</h2>
            <p className="text-gray-600 mt-2">Create an account and start tracking in minutes.</p>
            <div className="mt-6 space-x-3">
              <Link to="/register" className="inline-block bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 font-medium">Get Started Free</Link>
              <Link to="/login" className="inline-block text-red-600 px-6 py-3 rounded-md hover:bg-red-100 font-medium">Demo Login</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Features;


