import { Link } from 'react-router-dom';

const HowItWorks = () => {
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
              <Link to="/features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link to="/how-it-works" className="text-gray-900 font-semibold">How it Works</Link>
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
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">From setup to insights—fast</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">A simple flow to get you organized and informed without the busywork.</p>
          </div>
        </div>
      </section>

      <main className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-semibold mb-2">1. Create your account</h3>
              <p className="text-gray-600">Sign up to create your secure workspace. Authentication keeps your data safe and private.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-semibold mb-2">2. Add transactions</h3>
              <p className="text-gray-600">Log income and expenses. Use receipts to auto-fill details quickly and accurately.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-semibold mb-2">3. Set up AutoPay</h3>
              <p className="text-gray-600">Add recurring payments so due dates and amounts are tracked automatically.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-semibold mb-2">4. Explore analytics</h3>
              <p className="text-gray-600">See spending by category, top transactions, and monthly trends.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 md:col-span-2">
              <h3 className="text-xl font-semibold mb-2">5. Ask the AI assistant</h3>
              <p className="text-gray-600">Ask natural-language questions like “What’s my net savings this month?” or “Any bills due next week?”</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-semibold text-gray-900">Common questions</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-gray-600">Yes. Your account is protected, and API endpoints verify identity before returning data.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Can I import receipts?</h3>
                <p className="text-gray-600">Upload images or PDFs; OCR extracts amounts, dates, and merchants to speed entry.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Does it handle recurring bills?</h3>
                <p className="text-gray-600">Yes. Add recurring entries and see upcoming due dates and totals.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">How fast to get insights?</h3>
                <p className="text-gray-600">Most users see first analytics within minutes of adding transactions.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center bg-gray-50 border border-gray-200 rounded-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900">Start in minutes</h2>
            <p className="text-gray-600 mt-2">Create a free account and explore your first insights today.</p>
            <div className="mt-6">
              <Link to="/register" className="bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 font-medium">Get Started Free</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HowItWorks;


