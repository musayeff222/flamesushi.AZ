/** Admin SPA marşrutları (API /api/admin/* ilə qarışmır) */
export const ADMIN_ROUTES = {
  panel: '/admin',
  login: '/admin/login',
  /** köhnə əlfəcinlər üçün */
  legacyLogin: '/loginadminboss',
} as const;
