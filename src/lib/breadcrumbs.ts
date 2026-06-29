export interface BreadcrumbItem {
  label: string
  labelUr?: string
  to?: string
}

const HOME: BreadcrumbItem = { label: 'Dashboard', labelUr: 'ڈیش بورڈ', to: '/' }

const STATIC_ROUTES: Record<string, BreadcrumbItem[]> = {
  '/': [HOME],
  '/clients': [HOME, { label: 'Clients', labelUr: 'گاہک' }],
  '/orders': [HOME, { label: 'Orders', labelUr: 'آرڈرز' }],
  '/designs': [HOME, { label: 'Designs', labelUr: 'ڈیزائن' }],
  '/measurements': [HOME, { label: 'Measurements', labelUr: 'ناپ' }],
  '/garment-types': [HOME, { label: 'Garment Types', labelUr: 'کپڑے کی اقسام' }],
  '/gallery': [HOME, { label: 'Gallery', labelUr: 'گیلری' }],
  '/categories': [HOME, { label: 'Categories', labelUr: 'زمرے' }],
  '/accounts': [HOME, { label: 'Accounts', labelUr: 'اکاؤنٹس' }],
  '/voice-measurements': [HOME, { label: 'Voice Measurements', labelUr: 'آواز سے ناپ' }],
  '/settings': [HOME, { label: 'Settings', labelUr: 'ترتیبات' }],
}

export function breadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  if (STATIC_ROUTES[pathname]) {
    return STATIC_ROUTES[pathname]
  }

  const clientDetail = pathname.match(/^\/clients\/(\d+)$/)
  if (clientDetail) {
    return [
      HOME,
      { label: 'Clients', labelUr: 'گاہک', to: '/clients' },
      { label: 'Client Details', labelUr: 'تفصیل' },
    ]
  }

  return [HOME]
}

export const AUTH_BREADCRUMBS = {
  login: [
    { label: 'TMS Pro', to: '/login' },
    { label: 'Sign In', labelUr: 'سائن ان' },
  ] as BreadcrumbItem[],
  register: [
    { label: 'TMS Pro', to: '/login' },
    { label: 'Create Account', labelUr: 'اکاؤنٹ بنائیں' },
  ] as BreadcrumbItem[],
}
