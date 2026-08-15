// Mirrors backend/src/validators/authValidators.js so form errors show up
// before a round trip to the API, not just after.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const REGISTERABLE_ROLES = ['donor', 'ngo_admin'];

export function validateRegisterForm({ name, email, password, role }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Name is required';
  if (!email || !EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address';
  if (!password || !PASSWORD_REGEX.test(password)) {
    errors.password = 'Password must be at least 8 characters and include a letter and a number';
  }
  if (!REGISTERABLE_ROLES.includes(role)) errors.role = 'Select a role';
  return errors;
}

export function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email || !EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}
