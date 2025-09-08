import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, isAuthenticated } from '../../utils/auth';

const Header = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">FinanceTracker</span>
          </div>
          
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-8">
            {!isAuthenticated() && (
              <>
                <Link 
                  to="/features" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Features
                </Link>
                <Link 
                  to="/how-it-works" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  How it Works
                </Link>
                <Link 
                  to="/about" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  About
                </Link>
              </>
            )}
            <Link 
              to="/dashboard" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Dashboard
            </Link>
            <Link 
              to="/transactions" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Transactions
            </Link>
            <Link 
              to="/recurring-transactions" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              AutoPay
            </Link>
            <Link 
              to="/receipts" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Receipts
            </Link>
            <Link 
              to="/analysis" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Analysis
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
              aria-label="Open main menu"
              onClick={() => setMobileOpen(prev => !prev)}
            >
              {/* Icon: hamburger / close */}
              <svg className={`h-6 w-6 ${mobileOpen ? 'hidden' : 'block'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
              <svg className={`h-6 w-6 ${mobileOpen ? 'block' : 'hidden'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav panel */}
      <div className={`md:hidden ${mobileOpen ? 'block' : 'hidden'} border-t border-gray-200 bg-white`}
        onClick={() => setMobileOpen(false)}
      >
        <div className="px-4 py-3 space-y-1">
          {!isAuthenticated() && (
            <>
              <Link to="/features" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">Features</Link>
              <Link to="/how-it-works" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">How it Works</Link>
              <Link to="/about" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">About</Link>
            </>
          )}
          <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">Dashboard</Link>
          <Link to="/transactions" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">Transactions</Link>
          <Link to="/recurring-transactions" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">AutoPay</Link>
          <Link to="/receipts" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">Receipts</Link>
          <Link to="/analysis" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">Analysis</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
