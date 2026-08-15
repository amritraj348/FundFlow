import { useAuth } from '../../context/AuthContext';

// Placeholder — the real donor dashboard (donation history, receipts) is
// Phase 9 scope. This proves the protected route + role guard work.
export default function DonorDashboard() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
      <p className="mt-2 text-gray-600">Your donation history and receipts will live here — coming in Phase 9.</p>
    </div>
  );
}
