import type { ReactNode } from 'react'
import type { TableColumnDef } from '../../hooks/useTableColumns'
import { useShopFeatures } from '../../hooks/useShopFeatures'

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

interface DataTableProps<T> {
  columns: TableColumnDef<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  minWidth?: number
  rowStartIndex?: number
  empty?: ReactNode
  stickyHead?: boolean
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  minWidth = 640,
  rowStartIndex = 0,
  empty,
  stickyHead = false,
}: DataTableProps<T>) {
  if (empty) return <>{empty}</>

  return (
    <div className={`table-scroll-hint ${loading ? 'opacity-60' : ''}`}>
      <table
        className={`table-premium w-full text-sm ${stickyHead ? 'table-sticky-head' : ''}`}
        style={{ minWidth: `${minWidth}px` }}
      >
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th
                key={col.id}
                className={`px-5 py-3 ${alignClass[col.align ?? 'left']} ${col.headerClassName ?? ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, index) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-slate-50/80">
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={`px-5 py-3.5 ${alignClass[col.align ?? 'left']} ${col.cellClassName ?? ''}`}
                >
                  {col.cell(row, rowStartIndex + index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ListingTableCardProps {
  columnControls?: ReactNode
  loading?: boolean
  empty?: ReactNode
  pagination?: ReactNode
  children: ReactNode
}

export function ListingTableCard({
  columnControls,
  loading,
  empty,
  pagination,
  children,
}: ListingTableCardProps) {
  const { listCardColors } = useShopFeatures()
  const wrapperClass = listCardColors
    ? 'card-premium overflow-hidden rounded-xl'
    : 'rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden'

  if (empty) {
    return <div className={wrapperClass}>{empty}</div>
  }

  return (
    <div className={wrapperClass}>
      {columnControls && (
        <div className="flex items-center justify-end border-b border-slate-100 bg-white/80 px-4 py-2.5">
          {columnControls}
        </div>
      )}
      <div className={loading ? 'opacity-60' : ''}>{children}</div>
      {pagination}
    </div>
  )
}
