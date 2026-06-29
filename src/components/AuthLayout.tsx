import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import type { BreadcrumbItem } from '../lib/breadcrumbs'
import { Breadcrumb } from './ui/Breadcrumb'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  footer: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function AuthLayout({ children, title, subtitle, footer, breadcrumbs }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <div className="auth-brand-panel hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-black/20 ring-1 ring-accent-300/40">
              <Scissors className="text-surface-950" size={24} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-white">TMS Pro</p>
              <p className="text-xs font-medium text-accent-300">Tailor Management System</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-display text-4xl font-bold leading-tight text-white">
            Craft excellence.
            <br />
            <span className="bg-gradient-to-r from-accent-300 to-accent-500 bg-clip-text text-transparent">
              Manage with precision.
            </span>
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-indigo-100/90">
            Professional tools for tailors and boutiques — clients, measurements, orders, accounts, and more.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            {['Smart Measurements', 'Order Tracking', 'Payment Control'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-medium text-indigo-100">
                <span className="h-2 w-2 rounded-full bg-accent-400 shadow-sm shadow-accent-400/50" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-indigo-300/80">
          Trusted by modern tailor shops &amp; boutique stores
        </p>
      </div>

      <div className="auth-mobile-hero lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg ring-1 ring-accent-300/40">
            <Scissors className="text-surface-950" size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">TMS Pro</p>
            <p className="text-xs font-medium text-accent-300">Tailor Management System</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-indigo-100/90">
          Professional tools for tailors — clients, orders, measurements &amp; accounts.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-surface-50 via-white to-brand-50/50 px-4 py-6 sm:px-6 sm:py-10 lg:p-10">
        <div className="w-full max-w-md">
          <div className="card-premium rounded-2xl border border-slate-200/80 p-6 shadow-xl shadow-brand-900/5 sm:p-8 lg:p-10">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                <Breadcrumb items={breadcrumbs} />
              </div>
            )}
            <div className="mb-6 text-center sm:mb-8 lg:text-left">
              <h1 className="text-xl font-bold text-surface-900 sm:text-2xl">{title}</h1>
              <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            </div>
            {children}
            <div className="mt-6 text-center text-sm text-slate-500 sm:mt-8 lg:text-left">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
      {children}
    </Link>
  )
}
