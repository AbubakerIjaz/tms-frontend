import type { ReactNode } from 'react'

interface FeatureToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  labelUr?: string
  description?: string
  disabled?: boolean
  icon?: ReactNode
  showUrduLabel?: boolean
}

export function FeatureToggle({
  checked,
  onChange,
  label,
  labelUr,
  description,
  disabled,
  icon,
  showUrduLabel = false,
}: FeatureToggleProps) {
  return (
    <label
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-all touch-target ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${
        checked
          ? 'border-brand-200 bg-brand-50/60 ring-1 ring-brand-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {icon && (
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-colors ${
            checked ? 'bg-brand-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'
          }`}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-2">
          <span className="text-base font-semibold text-slate-900">{label}</span>
          {showUrduLabel && labelUr && (
            <span className="text-sm font-medium text-brand-600/80" dir="rtl">
              {labelUr}
            </span>
          )}
        </span>
        {description && (
          <span className="mt-1 block text-sm leading-relaxed text-slate-500">{description}</span>
        )}
      </span>

      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          className={`block h-6 w-11 rounded-full transition-colors duration-200 ${
            checked ? 'bg-brand-600' : 'bg-slate-300'
          }`}
        />
        <span
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </label>
  )
}
