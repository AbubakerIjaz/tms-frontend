import { type ReactNode } from 'react'

interface ListingPageLayoutProps {
  header: ReactNode
  toolbar?: ReactNode
  children: ReactNode
}

/** Full-height page shell — header/toolbar fixed, children fill remaining space */
export function ListingPageLayout({ header, toolbar, children }: ListingPageLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">{header}</div>
      {toolbar && <div className="shrink-0">{toolbar}</div>}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

interface ScrollableTableCardProps {
  toolbar?: ReactNode
  columnControls?: ReactNode
  pagination?: ReactNode
  loading?: boolean
  empty?: ReactNode
  children: ReactNode
}

/** Card with fixed toolbar + pagination; only the table body scrolls */
export function ScrollableTableCard({
  toolbar,
  columnControls,
  pagination,
  loading,
  empty,
  children,
}: ScrollableTableCardProps) {
  if (empty) {
    return <div className="card-premium flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">{empty}</div>
  }

  return (
    <div className="card-premium flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      {toolbar && (
        <div className="shrink-0 border-b border-slate-100 bg-white/80 p-4">{toolbar}</div>
      )}
      {columnControls && (
        <div className="flex shrink-0 items-center justify-end border-b border-slate-100 bg-white/80 px-4 py-2.5">
          {columnControls}
        </div>
      )}
      <div className={`table-scroll-area min-h-0 flex-1 overflow-auto ${loading ? 'opacity-60' : ''}`}>
        {children}
      </div>
      {pagination && <div className="shrink-0 border-t border-slate-100 bg-white">{pagination}</div>}
    </div>
  )
}

/** Scrollable page content (dashboard, grid listings, detail pages) */
export function PageScroll({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
}
