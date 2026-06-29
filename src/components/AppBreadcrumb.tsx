import { useResolvedBreadcrumbs } from '../context/BreadcrumbContext'
import { Breadcrumb } from './ui/Breadcrumb'

export function AppBreadcrumb() {
  const items = useResolvedBreadcrumbs()
  return (
    <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm sm:px-4">
      <Breadcrumb items={items} />
    </div>
  )
}
