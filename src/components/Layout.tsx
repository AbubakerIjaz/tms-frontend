import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Scissors,
  Shirt,
  Image,
  FolderOpen,
  ClipboardList,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Mic,
  Ruler,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BreadcrumbProvider } from '../context/BreadcrumbContext'
import { useShopFeatures, shopTypeLabel, shopTypeLabelUr } from '../hooks/useShopFeatures'
import type { ShopModuleSettings } from '../lib/shopSettings'
import { AppBreadcrumb } from './AppBreadcrumb'
import { Button } from './ui/Button'

const allNavItems: {
  to: string
  icon: typeof LayoutDashboard
  label: string
  labelUr: string
  module?: keyof ShopModuleSettings
}[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', labelUr: 'ڈیش بورڈ' },
  { to: '/clients', icon: Users, label: 'Clients', labelUr: 'گاہک', module: 'clients' },
  { to: '/orders', icon: ClipboardList, label: 'Orders', labelUr: 'آرڈرز', module: 'orders' },
  { to: '/designs', icon: Shirt, label: 'Designs', labelUr: 'ڈیزائن', module: 'designs' },
  { to: '/measurements', icon: Ruler, label: 'Measurements', labelUr: 'ناپ', module: 'measurements' },
  { to: '/garment-types', icon: Scissors, label: 'Garment Types', labelUr: 'کپڑے', module: 'garmentTypes' },
  { to: '/gallery', icon: Image, label: 'Gallery', labelUr: 'گیلری', module: 'gallery' },
  { to: '/categories', icon: FolderOpen, label: 'Categories', labelUr: 'زمرے', module: 'categories' },
  { to: '/accounts', icon: Wallet, label: 'Accounts', labelUr: 'اکاؤنٹس', module: 'accounts' },
  { to: '/voice-measurements', icon: Mic, label: 'Voice Measurements', labelUr: 'آواز سے ناپ', module: 'voiceMeasurements' },
  { to: '/settings', icon: Settings, label: 'Settings', labelUr: 'ترتیبات' },
]

export function Layout() {
  const { user, logout } = useAuth()
  const { shopType, isModuleEnabled, showUrduLabels } = useShopFeatures()
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname, location.search])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.module || isModuleEnabled(item.module)),
    [isModuleEnabled],
  )

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const shopName = user?.shop?.name || 'TMS'
  const logoUrl = user?.shop?.logo_url

  useEffect(() => {
    if (!sidebarOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sidebarOpen])

  return (
    <BreadcrumbProvider>
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-surface-950/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`sidebar-premium fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col text-white transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-accent-400/40" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-sm font-bold text-surface-950 shadow-lg">
              {shopName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{shopName}</p>
            <p className="truncate text-xs text-indigo-300/80">
              {shopTypeLabel(shopType)}
              {showUrduLabels && (
                <span className="opacity-70" dir="rtl"> — {shopTypeLabelUr(shopType)}</span>
              )}
            </p>
          </div>
          <button className="rounded-lg p-1 text-indigo-300 hover:bg-white/10 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, icon: Icon, label, labelUr }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 touch-target ${
                  isActive ? 'sidebar-nav-active' : 'sidebar-nav-link'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`sidebar-nav-icon shrink-0 ${isActive ? '' : 'opacity-80'}`}>
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="block">{label}</span>
                    {showUrduLabels && (
                      <span className="block text-[10px] font-normal opacity-60" dir="rtl">{labelUr}</span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-indigo-300/70">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full !text-indigo-200 hover:!bg-white/10 hover:!text-white touch-target"
            onClick={handleLogout}
          >
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass-header z-30 flex shrink-0 items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-4 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <button
              type="button"
              className="touch-target shrink-0 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-surface-900 sm:text-base lg:text-lg">
                <span className="sm:hidden">{shopName}</span>
                <span className="hidden sm:inline">Tailor Management System</span>
              </h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {shopTypeLabel(shopType)} management{showUrduLabels ? ' — آسان اور تیز' : ''}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-brand-50 to-accent-50 px-3 py-1.5 text-xs font-medium text-brand-700 sm:flex">
            <Sparkles size={14} className="text-accent-500" />
            TMS Pro
          </div>
        </header>
        <main
          ref={mainRef}
          className="app-shell min-h-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 lg:p-6"
        >
          <AppBreadcrumb />
          <Outlet key={`${location.pathname}${location.search}`} />
        </main>
      </div>
    </div>
    </BreadcrumbProvider>
  )
}
