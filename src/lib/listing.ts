import { useEffect, useState } from 'react'
import type { PaginationMeta } from '../components/ui/Pagination'

export const DEFAULT_PAGE_SIZE = 10

export function defaultPaginationMeta(perPage = DEFAULT_PAGE_SIZE): PaginationMeta {
  return {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
    from: null,
    to: null,
  }
}

export function metaFromPaginated(res: {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}): PaginationMeta {
  return {
    current_page: res.current_page,
    last_page: res.last_page,
    per_page: res.per_page,
    total: res.total,
    from: res.from,
    to: res.to,
  }
}

export interface DateRange {
  from: string
  to: string
}

export const EMPTY_DATE_RANGE: DateRange = { from: '', to: '' }

export function normalizeDateRange(range: DateRange): DateRange {
  const { from, to } = range
  if (from && to && from > to) return { from: to, to: from }
  return range
}

export function isDateRangeActive(range: DateRange): boolean {
  return Boolean(range.from || range.to)
}

export function formatDateRangeLabel(range: DateRange): string | null {
  if (!range.from && !range.to) return null
  if (range.from && range.to) {
    if (range.from === range.to) return range.from
    return `${range.from} → ${range.to}`
  }
  if (range.from) return `From ${range.from}`
  return `Until ${range.to}`
}

export function listingQueryParams(
  page: number,
  perPage: number,
  dateRange: DateRange,
  extra?: Record<string, string | number | undefined>,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page,
    per_page: perPage,
  }
  if (dateRange.from) params.from = dateRange.from
  if (dateRange.to) params.to = dateRange.to
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== '') params[key] = value
    }
  }
  return params
}

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function startOfMonth(d = new Date()): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function endOfMonth(d = new Date()): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toISODate(d)
}

export function currentMonthRange(): DateRange {
  return { from: startOfMonth(), to: endOfMonth() }
}

export function dateRangeFromSearchParams(params: URLSearchParams): DateRange {
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  return from || to ? normalizeDateRange({ from, to }) : EMPTY_DATE_RANGE
}

export function dateRangeToParams(dateRange: DateRange): Record<string, string> {
  const params: Record<string, string> = {}
  if (dateRange.from) params.from = dateRange.from
  if (dateRange.to) params.to = dateRange.to
  return params
}

export function buildFilteredUrl(path: string, dateRange: DateRange, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams(dateRangeToParams(dateRange))
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/** Debounced search string for server-side API queries */
export function useDebouncedSearch(delayMs = 350) {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), delayMs)
    return () => clearTimeout(timer)
  }, [searchInput, delayMs])

  function clearSearch() {
    setSearchInput('')
    setSearchQuery('')
  }

  return { searchInput, setSearchInput, searchQuery, clearSearch }
}

/** Shared date range state with automatic from/to normalization */
export function useDateRangeFilter(initial: DateRange = EMPTY_DATE_RANGE) {
  const [dateRange, setDateRangeState] = useState<DateRange>(initial)

  const setDateRange = (range: DateRange) => {
    setDateRangeState(normalizeDateRange(range))
  }

  const clearDateRange = () => setDateRangeState(EMPTY_DATE_RANGE)

  return { dateRange, setDateRange, clearDateRange }
}
