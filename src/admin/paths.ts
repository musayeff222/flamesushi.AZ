/** Admin SPA marşrutları (API /api/admin/* ilə qarışmır) */
export const ADMIN_ROUTES = {
  panel: '/admin',
  login: '/admin/login',
  promoNew: '/admin/promos/new',
  /** köhnə əlfəcinlər üçün */
  legacyLogin: '/loginadminboss',
} as const;
