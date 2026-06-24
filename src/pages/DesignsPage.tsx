import { useCallback, useEffect, useState } from 'react'
import { Plus, Shirt } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_PAGE_SIZE, defaultPaginationMeta, listingQueryParams, metaFromPaginated, useDateRangeFilter, useDebouncedSearch } from '../lib/listing'
import type { Design, GarmentType, Paginated } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { EmptyState, formatCurrency, LoadingSpinner } from '../components/ui/Badge'

export function DesignsPage() {
  const { user } = useAuth()
  const currency = user?.shop?.currency || 'PKR'
  const [designs, setDesigns] = useState<Design[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta())
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([])
  const [garmentFilter, setGarmentFilter] = useState('')
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', base_price: '', garment_type_id: '' })
  const [image, setImage] = useState<File | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<Paginated<Design>>('/designs', {
        params: listingQueryParams(page, perPage, dateRange, {
          garment_type_id: garmentFilter,
          search: searchQuery,
        }),
      }),
      api.get<GarmentType[]>('/garment-types'),
    ]).then(([designsRes, typesRes]) => {
      setDesigns(designsRes.data.data)
      setMeta(metaFromPaginated(designsRes.data))
      setGarmentTypes(typesRes.data)
    }).finally(() => setLoading(false))
  }, [page, perPage, dateRange, garmentFilter, searchQuery])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [garmentFilter, searchQuery, dateRange.from, dateRange.to])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append('base_price', form.base_price || '0')
    if (form.garment_type_id) fd.append('garment_type_id', form.garment_type_id)
    if (image) fd.append('image', image)
    try {
      await api.post('/designs', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setModalOpen(false)
      setForm({ name: '', description: '', base_price: '', garment_type_id: '' })
      setImage(null)
      setPage(1)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this design?')) return
    await api.delete(`/designs/${id}`)
    load()
  }

  return (
    <PageScroll>
      <div className="space-y-4 pb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-heading">Designs</h2>
          <p className="page-subtitle">
            {meta.total > 0 ? `${meta.total} designs` : 'Manage suits, dresses, and clothing designs'}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setModalOpen(true)}><Plus size={18} /> Add Design</Button>
      </div>

      <ListingToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateLabel="Added date"
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: 'Search design name or description...',
        }}
      >
        <Select
          className="w-52"
          value={garmentFilter}
          onChange={(e) => setGarmentFilter(e.target.value)}
          options={[
            { value: '', label: 'All Garment Types' },
            ...garmentTypes.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
      </ListingToolbar>

      {loading && designs.length === 0 ? (
        <LoadingSpinner />
      ) : designs.length === 0 ? (
        <Card><EmptyState icon={<Shirt size={48} />} title="No designs found" description="Adjust filters or add your first design" /></Card>
      ) : (
        <Card>
          <div className={`grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
            {designs.map((design) => (
              <div key={design.id} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md">
                <div className="aspect-[4/3] bg-slate-100">
                  {design.image_url ? (
                    <img src={design.image_url} alt={design.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300"><Shirt size={48} /></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{design.name}</h3>
                  <p className="text-sm text-slate-500">{design.garment_type?.name}</p>
                  <p className="mt-1 font-medium text-brand-600">{formatCurrency(design.base_price, currency)}</p>
                  <Button size="sm" variant="danger" className="mt-2" onClick={() => handleDelete(design.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
          />
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Design">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Select label="Garment Type" value={form.garment_type_id} onChange={(e) => setForm((f) => ({ ...f, garment_type_id: e.target.value }))}
            options={[{ value: '', label: 'Select...' }, ...garmentTypes.map((t) => ({ value: t.id, label: t.name }))]} />
          <Input label="Base Price" type="number" step="0.01" value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Image</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Design'}</Button>
          </div>
        </form>
      </Modal>
      </div>
    </PageScroll>
  )
}
