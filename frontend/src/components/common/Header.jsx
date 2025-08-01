import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../utils/auth';

const Header = () => {
  const navigate = useNavigate();

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
          
          <nav className="hidden md:flex items-center space-x-8">
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
              to="/receipts" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Receipts
            </Link>
            <Link 
              to="/analytics" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Analytics
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
