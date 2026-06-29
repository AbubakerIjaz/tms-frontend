import { useEffect, useRef, useState } from 'react'
import { Columns3, RotateCcw } from 'lucide-react'
import type { TableColumnMeta } from '../../hooks/useTableColumns'
import { Button } from './Button'

interface ColumnVisibilityProps {
  columns: TableColumnMeta[]
  visibility: Record<string, boolean>
  onToggle: (id: string) => void
  onReset: () => void
  visibleCount: number
  totalCount: number
}

export function ColumnVisibility({
  columns,
  visibility,
  onToggle,
  onReset,
  visibleCount,
  totalCount,
}: ColumnVisibilityProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="touch-target"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Columns3 size={16} />
        <span className="hidden sm:inline">Columns</span>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
          {visibleCount}/{totalCount}
        </span>
      </Button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          role="listbox"
          aria-label="Toggle table columns"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Show columns</p>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {columns.map((col) => {
              const checked = col.required || visibility[col.id] !== false
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
                    col.required
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={col.required}
                    onChange={() => onToggle(col.id)}
                    className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="font-medium text-slate-800">{col.label}</span>
                  {col.required && (
                    <span className="ml-auto text-[10px] font-medium uppercase text-slate-400">Required</span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
