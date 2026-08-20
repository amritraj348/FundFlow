import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import PublicOnlyRoute from './components/routing/PublicOnlyRoute';

// Route-level code splitting: the production build was a single ~700KB JS
// chunk (well past Vite's 500KB warning threshold), most of it recharts —
// a charting library only two dashboard routes actually use, being shipped
// to every visitor including anonymous ones just browsing campaigns. Lazy
// page imports let Vite split each route (and whatever it alone depends on)
// into its own chunk, loaded on demand instead of all up front.
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CampaignsList = lazy(() => import('./pages/CampaignsList'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));
const DonorDashboard = lazy(() => import('./pages/dashboards/DonorDashboard'));
const NgoAdminDashboard = lazy(() => import('./pages/dashboards/NgoAdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/dashboards/SuperAdminDashboard'));

function RouteFallback() {
  return <div className="flex justify-center py-20 text-gray-500">Loading…</div>;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/campaigns" element={<CampaignsList />} />
          <Route path="/campaigns/:idOrSlug" element={<CampaignDetail />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ngo/dashboard"
            element={
              <ProtectedRoute roles={['ngo_admin']}>
                <NgoAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
