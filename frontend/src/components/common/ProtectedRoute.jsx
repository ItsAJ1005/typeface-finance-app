import { Navigate } from 'react-router-dom';
import { isTokenValid } from '../../utils/auth';

const ProtectedRoute = ({ children, isAuth }) => {
  // Check both isAuth state and token validity
  if (!isAuth || !isTokenValid()) {
    // Clear any invalid token
    if (isAuth) {
      const { logout } = require('../../utils/auth');
      logout();
    }
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;