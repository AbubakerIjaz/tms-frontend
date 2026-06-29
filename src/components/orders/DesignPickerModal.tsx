import { useMemo, useState } from 'react'
import { ExternalLink, Search, Shirt } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Design } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface DesignPickerModalProps {
  open: boolean
  onClose: () => void
  designs: Design[]
  selectedId?: string | number | null
  onSelect: (design: Design) => void
}

export function DesignPickerModal({ open, onClose, designs, selectedId, onSelect }: DesignPickerModalProps) {
  const { user } = useAuth()
  const currency = user?.shop?.currency || 'PKR'
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return designs
    return designs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.garment_type?.name?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q),
    )
  }, [designs, search])

  return (
    <Modal open={open} onClose={onClose} title="Choose Design" size="xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs..."
              className="pl-9"
            />
          </div>
          <Link
            to="/designs"
            target="_blank"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50"
          >
            <ExternalLink size={16} />
            Open Designs module
          </Link>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No designs found. Add designs in the Designs module.</p>
        ) : (
          <div className="grid max-h-[55vh] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((design) => {
              const selected = String(selectedId) === String(design.id)
              return (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => {
                    onSelect(design)
                    onClose()
                  }}
                  className={`overflow-hidden rounded-xl border text-left transition hover:shadow-md ${
                    selected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    {design.image_url ? (
                      <img src={design.image_url} alt={design.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <Shirt size={40} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-slate-900">{design.name}</p>
                    <p className="text-xs text-slate-500">{design.garment_type?.name || '—'}</p>
                    <p className="mt-1 text-sm font-medium text-brand-600">{formatCurrency(design.base_price, currency)}</p>
                    {design.is_locked ? (
                      <p className="mt-1 text-xs text-amber-600">Linked to orders</p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
