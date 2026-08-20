import { Component } from 'react';

// No error boundary existed anywhere in the app before this — an uncaught
// render error (e.g. the NgoProfileSection null-prop race caught during
// Phase 9 testing) took down the entire page to a blank white screen with
// no way to recover short of a manual reload. This contains that to the
// page content, leaving the header/nav usable so the user isn't stranded.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
          <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-gray-600">This page hit an unexpected error. Try reloading.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
