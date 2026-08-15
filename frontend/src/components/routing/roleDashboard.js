const DASHBOARD_BY_ROLE = {
  donor: '/dashboard',
  ngo_admin: '/ngo/dashboard',
  super_admin: '/admin/dashboard',
};

export function dashboardPathForRole(role) {
  return DASHBOARD_BY_ROLE[role] || '/';
}
