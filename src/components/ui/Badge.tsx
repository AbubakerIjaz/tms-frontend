import { type ReactNode } from 'react'

const styles: Record<string, string> = {
  pending: 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 ring-1 ring-amber-200/60',
  in_progress: 'bg-gradient-to-r from-blue-100 to-indigo-50 text-blue-800 ring-1 ring-blue-200/60',
  ready: 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60',
  delivered: 'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 ring-1 ring-slate-200/60',
  cancelled: 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 ring-1 ring-red-200/60',
  paid: 'bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-800 ring-1 ring-emerald-200/60',
  income: 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60',
  expense: 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 ring-1 ring-red-200/60',
}

const labels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  paid: 'Paid',
  income: 'Income',
  expense: 'Expense',
}

export function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {labels[status] || status}
    </span>
  )
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 text-slate-300">{icon}</div>
      <p className="font-medium text-slate-600">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <div className="absolute inset-1 animate-pulse rounded-full bg-gradient-to-br from-brand-100 to-accent-100" />
      </div>
    </div>
  )
}

export function formatCurrency(amount: number | string, currency = 'PKR') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
