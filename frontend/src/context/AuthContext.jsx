import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { registerUser, loginUser, fetchCurrentUser } from '../api/auth';
import { getAccessToken, setTokens, clearTokens, onForcedLogout } from '../api/tokenStore';

const AuthContext = createContext(null);

// Plain React Context + useState, not Redux/Zustand: the app's only
// cross-cutting client state right now is "who is logged in" — a handful of
// fields read in a handful of places. Context is built into React (no new
// dependency to justify) and is a perfectly good fit at this size; if later
// phases add real client-side data-caching needs (donation history, admin
// dashboards with polling, etc.) that's a better trigger to reach for
// something like React Query than auth state ever was.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true: on first load we don't yet know if a stored access token
  // is still valid, so route guards must wait rather than assume logged-out.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onForcedLogout(() => setUser(null));
  }, []);

  useEffect(() => {
    async function restoreSession() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const { user: me } = await fetchCurrentUser();
        setUser(me);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginUser({ email, password });
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await registerUser(payload);
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
