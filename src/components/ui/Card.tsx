import { type ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card-premium rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100/80 bg-gradient-to-r from-white to-brand-50/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
      {action && <div className="shrink-0 [&>button]:w-full [&>button]:sm:w-auto">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>
}
