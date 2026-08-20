import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

// Dashboards (Phase 9) are the trigger flagged back in Phase 7's AuthContext
// note: multiple screens now fetch server data that doesn't change on every
// keystroke (donation history, campaigns, analytics) and need cache
// invalidation after mutations (create/edit/close a campaign, approve/reject
// an NGO). Auth state stays in plain Context — it's small and doesn't share
// React Query's request-caching concerns — but everything server-fetched in
// the dashboards now goes through React Query instead of hand-rolled
// useState/useEffect, which is what CampaignsList/CampaignDetail still use
// (they only need a single fetch-on-mount each, not worth migrating).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
