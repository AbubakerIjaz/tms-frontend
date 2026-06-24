import { type ReactNode } from 'react'
import { DateRangeFilter } from './DateRangeFilter'
import { SearchField } from './SearchField'
import type { DateRange } from '../../lib/listing'

interface ListingToolbarProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  dateLabel?: string
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  children?: ReactNode
  className?: string
}

export function ListingToolbar({
  dateRange,
  onDateRangeChange,
  dateLabel,
  search,
  children,
  className = '',
}: ListingToolbarProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4 ${className}`}
    >
      {search && (
        <SearchField
          value={search.value}
          onChange={search.onChange}
          placeholder={search.placeholder}
          className="mb-4"
        />
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <DateRangeFilter
          value={dateRange}
          onChange={onDateRangeChange}
          label={dateLabel}
          className="min-w-0 flex-1"
        />

        {children && (
          <div className="flex w-full shrink-0 flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-end xl:w-auto xl:border-t-0 xl:pt-0 xl:pl-4 [&>*]:w-full [&>*]:sm:w-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
