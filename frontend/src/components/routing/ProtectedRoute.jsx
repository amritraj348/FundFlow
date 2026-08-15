import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { dashboardPathForRole } from './roleDashboard';

// Wraps a route element. With no `roles` prop, only requires the user to be
// logged in. With `roles`, also requires their account role to be in the
// list — a logged-in user with the wrong role is bounced to their own
// dashboard (the route exists, just isn't for them) rather than a dead end.
export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center py-20 text-gray-500">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return children;
}
