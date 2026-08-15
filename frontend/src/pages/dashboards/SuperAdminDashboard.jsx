import { useAuth } from '../../context/AuthContext';

// Placeholder — platform-wide analytics + NGO moderation UI are Phase 9
// scope. This proves the protected route + role guard work.
export default function SuperAdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
      <p className="mt-2 text-gray-600">Platform-wide analytics and NGO moderation will live here — coming in Phase 9.</p>
    </div>
  );
}
