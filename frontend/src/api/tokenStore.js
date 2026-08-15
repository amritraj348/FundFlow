const ACCESS_TOKEN_KEY = 'fundflow_access_token';
const REFRESH_TOKEN_KEY = 'fundflow_refresh_token';

// Token storage: localStorage, not an httpOnly cookie.
//
// Trade-off, noted here as a Phase 10 hardening candidate: localStorage is
// readable by any JS running on the page, so a successful XSS attack can
// read both tokens directly — an httpOnly cookie can't be read by JS at
// all, which closes that specific hole. But cookies need matching backend
// support this app doesn't have yet (Set-Cookie, cookie-parser, and CSRF
// protection, since the browser auto-attaches cookies to every request);
// the Phase 2 auth endpoints return tokens in the JSON response body, not
// as cookies, and reworking that is a backend change — out of scope for a
// frontend-only phase. localStorage is the pragmatic choice given the
// existing API contract; revisit alongside the Phase 10 security pass.
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens({ accessToken, refreshToken } = {}) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Lets the axios layer (plain JS, outside the React tree) tell AuthContext
// that a forced logout happened (refresh token expired/invalid) so the UI
// can react. React state stays the single source of truth for "is the user
// authenticated" — this is just the notification path into it.
let forcedLogoutListener = null;
function onForcedLogout(listener) {
  forcedLogoutListener = listener;
}
function triggerForcedLogout() {
  clearTokens();
  if (forcedLogoutListener) forcedLogoutListener();
}

export { getAccessToken, getRefreshToken, setTokens, clearTokens, onForcedLogout, triggerForcedLogout };
