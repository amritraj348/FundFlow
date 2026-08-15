import { Navigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { dashboardPathForRole } from './roleDashboard';

// Login/register shouldn't be reachable while already logged in — bounce to
// the user's own dashboard instead of showing the form again.
export default function PublicOnlyRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center py-20 text-gray-500">Loading…</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return children;
}
