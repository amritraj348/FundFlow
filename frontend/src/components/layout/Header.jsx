import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { dashboardPathForRole } from '../routing/roleDashboard';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-teal-700' : 'text-gray-600 hover:text-teal-700'}`;

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  // No manual navigate() here on purpose. Logging out from a protected page
  // (e.g. a dashboard) makes ProtectedRoute's own reactive guard redirect to
  // /login — the correct outcome, and it happens automatically since
  // isAuthenticated flips false. Logging out from a public page (home,
  // campaigns) has no guard to react, so the header just updates in place
  // with no jarring redirect. A manual navigate() call here previously raced
  // that guard's redirect non-deterministically; not calling one at all
  // removes the race rather than trying to win it.
  function handleLogout() {
    logout();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="text-xl font-bold text-teal-700">
          FundFlow
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/campaigns" className={navLinkClass}>
            Campaigns
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to={dashboardPathForRole(user.role)} className="text-sm font-medium text-gray-600 hover:text-teal-700">
                {user.name}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-teal-700">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
