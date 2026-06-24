import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { Select } from './Select'

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
}

export function Pagination({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50],
}: PaginationProps) {
  const { current_page, last_page, per_page, total, from, to } = meta

  if (total === 0) return null

  function getPageNumbers(): (number | '...')[] {
    if (last_page <= 7) {
      return Array.from({ length: last_page }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = [1]
    if (current_page > 3) pages.push('...')
    for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) {
      pages.push(i)
    }
    if (current_page < last_page - 2) pages.push('...')
    pages.push(last_page)
    return pages
  }

  return (
    <div className="relative z-10 flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>
          Showing <span className="font-medium text-slate-700">{from ?? 0}</span>
          {' – '}
          <span className="font-medium text-slate-700">{to ?? 0}</span>
          {' of '}
          <span className="font-medium text-slate-700">{total}</span>
        </span>
        {onPerPageChange && (
          <label className="flex items-center gap-2">
            Rows
            <Select
              size="sm"
              fullWidth={false}
              className="w-20"
              searchable={false}
              value={per_page}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              options={perPageOptions.map((n) => ({ value: n, label: String(n) }))}
            />
          </label>
        )}
      </div>

      <div className="-mx-1 flex items-center justify-center gap-1 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:justify-end sm:overflow-visible sm:pb-0">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        {getPageNumbers().map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`min-w-8 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                page === current_page
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {page}
            </button>
          ),
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
