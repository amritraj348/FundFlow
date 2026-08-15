import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Fund what matters. <span className="text-teal-700">Transparently.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
        FundFlow connects donors with verified NGOs running real campaigns — with receipts, transparent tracking,
        and secure payments every step of the way.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          to="/campaigns"
          className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          Browse campaigns
        </Link>
        <Link
          to="/register"
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-white"
        >
          Register your NGO
        </Link>
      </div>
    </div>
  );
}
