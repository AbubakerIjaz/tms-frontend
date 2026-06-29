import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { breadcrumbsForPath, type BreadcrumbItem } from '../lib/breadcrumbs'

interface BreadcrumbContextValue {
  items: BreadcrumbItem[] | null
  setItems: (items: BreadcrumbItem[] | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[] | null>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    setItems(null)
  }, [pathname])

  const value = useMemo(() => ({ items, setItems }), [items])

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
}

export function useBreadcrumb() {
  const ctx = useContext(BreadcrumbContext)
  if (!ctx) throw new Error('useBreadcrumb must be used within BreadcrumbProvider')
  return ctx
}

/** Override breadcrumbs for the current page. Clears automatically on unmount. */
export function useSetPageBreadcrumbs(items: BreadcrumbItem[] | null) {
  const { setItems } = useBreadcrumb()

  useEffect(() => {
    setItems(items)
    return () => setItems(null)
  }, [items, setItems])
}

export function useResolvedBreadcrumbs(): BreadcrumbItem[] {
  const { pathname } = useLocation()
  const { items } = useBreadcrumb()
  return items ?? breadcrumbsForPath(pathname)
}
