import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useShopFeatures } from '../../hooks/useShopFeatures'
import type { BreadcrumbItem } from '../../lib/breadcrumbs'

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const { showUrduLabels } = useShopFeatures()

  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isFirst = index === 0

          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <li aria-hidden className="text-slate-300">
                  <ChevronRight size={14} className="shrink-0" />
                </li>
              )}
              <li className="flex min-w-0 items-center gap-1">
                {isLast || !item.to ? (
                  <span
                    className={`flex min-w-0 items-center gap-1.5 truncate font-semibold ${
                      isLast ? 'text-brand-700' : 'text-slate-600'
                    }`}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {isFirst && isLast && <Home size={14} className="shrink-0 text-brand-500" />}
                    <span className="truncate">{item.label}</span>
                    {showUrduLabels && item.labelUr && (
                      <span className="truncate text-xs font-normal text-brand-600/70" dir="rtl">
                        {item.labelUr}
                      </span>
                    )}
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    className="flex min-w-0 items-center gap-1.5 truncate rounded-md px-1 py-0.5 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
                  >
                    {isFirst && <Home size={14} className="shrink-0" />}
                    <span className="truncate">{item.label}</span>
                    {showUrduLabels && item.labelUr && (
                      <span className="truncate text-xs font-normal opacity-70" dir="rtl">
                        {item.labelUr}
                      </span>
                    )}
                  </Link>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
