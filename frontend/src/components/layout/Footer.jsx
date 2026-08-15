export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500 sm:px-6">
        <p>&copy; {new Date().getFullYear()} FundFlow. Empowering NGOs. Enabling Change.</p>
      </div>
    </footer>
  );
}
