import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-gray-600">This page doesn&apos;t exist.</p>
      <Link to="/" className="mt-6 inline-block text-teal-700 hover:text-teal-800">
        &larr; Back home
      </Link>
    </div>
  );
}
