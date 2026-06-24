import { CalendarDays, X } from 'lucide-react'
import {
  daysAgoISO,
  endOfMonth,
  formatDateRangeLabel,
  isDateRangeActive,
  normalizeDateRange,
  startOfMonth,
  toISODate,
  type DateRange,
} from '../../lib/listing'

export type { DateRange }

export interface DateRangePreset {
  id: string
  label: string
  getRange: () => DateRange
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: 'today',
    label: 'Today',
    getRange: () => {
      const t = toISODate(new Date())
      return { from: t, to: t }
    },
  },
  {
    id: '7d',
    label: '7 days',
    getRange: () => ({ from: daysAgoISO(6), to: toISODate(new Date()) }),
  },
  {
    id: '30d',
    label: '30 days',
    getRange: () => ({ from: daysAgoISO(29), to: toISODate(new Date()) }),
  },
  {
    id: 'month',
    label: 'This month',
    getRange: () => ({ from: startOfMonth(), to: endOfMonth() }),
  },
]

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  label?: string
  className?: string
  presets?: DateRangePreset[]
}

function presetActive(value: DateRange, preset: DateRangePreset): boolean {
  const range = preset.getRange()
  return value.from === range.from && value.to === range.to
}

export function DateRangeFilter({
  value,
  onChange,
  label = 'Date range',
  className = '',
  presets = DATE_RANGE_PRESETS,
}: DateRangeFilterProps) {
  const hasRange = isDateRangeActive(value)
  const activePresetId = presets.find((p) => presetActive(value, p))?.id
  const rangeLabel = formatDateRangeLabel(value)

  function updateRange(patch: Partial<DateRange>) {
    onChange(normalizeDateRange({ ...value, ...patch }))
  }

  return (
    <div className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <CalendarDays size={16} strokeWidth={2} />
        </span>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {rangeLabel && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            {rangeLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => updateRange({ from: e.target.value })}
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-auto sm:py-1.5"
            aria-label="From date"
          />
          <span className="hidden text-xs font-medium text-slate-400 sm:inline">to</span>
          <input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => updateRange({ to: e.target.value })}
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-auto sm:py-1.5"
            aria-label="To date"
          />
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((preset) => {
            const active = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.getRange())}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
          {hasRange && (
            <button
              type="button"
              onClick={() => onChange({ from: '', to: '' })}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Clear date range"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
