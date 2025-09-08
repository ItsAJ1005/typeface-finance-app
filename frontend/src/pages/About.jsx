import { Link } from 'react-router-dom';

const About = () => {
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
              <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900">How it Works</Link>
              <Link to="/about" className="text-gray-900 font-semibold">About</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
              <Link to="/register" className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-medium">Get Started</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About</h1>
          <p className="text-gray-700 mb-4">Typeface Finance is an open-source personal finance assistant built to make money management simple and insightful.</p>
          <p className="text-gray-700 mb-4">Track income and expenses, process receipts, manage recurring bills, and ask an AI assistant for personalized insights. Built with React, Node.js, and MongoDB.</p>
          <p className="text-gray-700 mb-4">Created by <span className="font-semibold">AJ Harsh Vardhan</span>. Contributions and feedback are welcome.</p>

          <div className="mt-10">
            <Link to="/register" className="inline-block bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 font-medium">Start Free</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;


