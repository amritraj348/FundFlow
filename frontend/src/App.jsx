import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import PublicOnlyRoute from './components/routing/PublicOnlyRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CampaignsList from './pages/CampaignsList';
import CampaignDetail from './pages/CampaignDetail';
import NotFound from './pages/NotFound';
import DonorDashboard from './pages/dashboards/DonorDashboard';
import NgoAdminDashboard from './pages/dashboards/NgoAdminDashboard';
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';

export default function App() {
  return (
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
  );
}
