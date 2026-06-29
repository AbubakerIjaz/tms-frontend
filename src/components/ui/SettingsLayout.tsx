import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

export interface SettingsSectionDef {
  id: string
  title: string
  description: string
  icon: LucideIcon
  iconClass: string
}

interface SettingsNavProps {
  sections: SettingsSectionDef[]
  active: string
  onSelect: (id: string) => void
  completed?: Record<string, boolean>
}

export function SettingsNav({ sections, active, onSelect, completed = {} }: SettingsNavProps) {
  return (
    <>
      {/* Mobile: horizontal scrollable pills */}
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden" aria-label="Settings sections">
        {sections.map((section) => {
          const isActive = section.id === active
          const Icon = section.icon
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all touch-target ${
                isActive
                  ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Icon size={18} />
              {section.title}
            </button>
          )
        })}
      </nav>

      {/* Desktop: vertical nav */}
      <nav className="hidden lg:block" aria-label="Settings sections">
        <div className="card-premium sticky top-2 space-y-1 p-2">
          {sections.map((section) => {
            const isActive = section.id === active
            const Icon = section.icon
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelect(section.id)}
                className={`group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all ${
                  isActive ? 'bg-brand-50 ring-1 ring-brand-100' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105 ${section.iconClass}`}
                >
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${isActive ? 'text-brand-900' : 'text-slate-800'}`}>
                    {section.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{section.description}</span>
                </span>
                {completed[section.id] && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

interface SettingsSectionCardProps {
  section: SettingsSectionDef
  children: ReactNode
  footer?: ReactNode
  alert?: ReactNode
}

export function SettingsSectionCard({ section, children, footer, alert }: SettingsSectionCardProps) {
  const Icon = section.icon
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-br from-slate-50/80 to-white p-5 sm:p-6">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${section.iconClass}`}>
          <Icon size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{section.description}</p>
        </div>
      </div>

      {alert && <div className="px-5 pt-4 sm:px-6">{alert}</div>}

      <div className="p-5 sm:p-6">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  )
}

export function SettingsFieldGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}
