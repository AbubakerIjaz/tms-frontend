import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Pencil, Plus, Shirt } from 'lucide-react'
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
import { ImageUploadField } from '../components/ui/ImageUploadField'
import { useZodForm } from '../hooks/useZodForm'
import { designFormSchema } from '../lib/validation'
import { useShopFeatures } from '../hooks/useShopFeatures'
import { useToast } from '../context/ToastContext'

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
  const [editing, setEditing] = useState<Design | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', base_price: '', garment_type_id: '' })
  const [image, setImage] = useState<File | null>(null)
  const { fieldErrors, formError, validate, clearField, clearErrors } = useZodForm(designFormSchema)
  const { isModuleEnabled } = useShopFeatures()
  const showGarmentTypes = isModuleEnabled('garmentTypes')
  const { toast, confirm } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    const requests: Promise<unknown>[] = [
      api.get<Paginated<Design>>('/designs', {
        params: listingQueryParams(page, perPage, dateRange, {
          garment_type_id: showGarmentTypes ? garmentFilter : undefined,
          search: searchQuery,
        }),
      }),
    ]
    if (showGarmentTypes) {
      requests.push(api.get<GarmentType[]>('/garment-types'))
    }
    Promise.all(requests).then((results) => {
      setDesigns((results[0] as { data: Paginated<Design> }).data.data)
      setMeta(metaFromPaginated((results[0] as { data: Paginated<Design> }).data))
      if (showGarmentTypes) {
        setGarmentTypes((results[1] as { data: GarmentType[] }).data)
      }
    }).finally(() => setLoading(false))
  }, [page, perPage, dateRange, garmentFilter, searchQuery, showGarmentTypes])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [garmentFilter, searchQuery, dateRange.from, dateRange.to])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', base_price: '', garment_type_id: '' })
    setImage(null)
    setError('')
    clearErrors()
    setModalOpen(true)
  }

  function openEdit(design: Design) {
    if (design.is_locked) {
      setError('This design is linked to active orders and cannot be edited.')
      return
    }

    setEditing(design)
    setForm({
      name: design.name,
      description: design.description || '',
      base_price: design.base_price || '',
      garment_type_id: design.garment_type_id ? String(design.garment_type_id) : '',
    })
    setImage(null)
    setError('')
    clearErrors()
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setImage(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = validate(form)
    if (!data) return
    setSaving(true)
    setError('')
    const fd = new FormData()
    fd.append('name', data.name)
    fd.append('description', data.description ?? '')
    fd.append('base_price', data.base_price || '0')
    if (data.garment_type_id) fd.append('garment_type_id', data.garment_type_id)
    if (image) fd.append('image', image)
    try {
      if (editing) {
        fd.append('_method', 'PUT')
        await api.post(`/designs/${editing.id}`, fd)
      } else {
        await api.post('/designs', fd)
      }
      closeModal()
      setForm({ name: '', description: '', base_price: '', garment_type_id: '' })
      if (!editing) setPage(1)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    const design = designs.find((d) => d.id === id)
    if (design?.is_locked) {
      toast.error('This design is linked to orders and cannot be deleted.')
      return
    }
    const ok = await confirm({
      title: 'Delete design?',
      message: 'This design will be permanently removed.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/designs/${id}`)
      toast.success('Design deleted')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (!isModuleEnabled('designs')) {
    return <Navigate to="/" replace />
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
        <Button className="w-full sm:w-auto" onClick={openCreate}><Plus size={18} /> Add Design</Button>
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
        {showGarmentTypes && (
        <Select
          className="w-52"
          value={garmentFilter}
          onChange={(e) => setGarmentFilter(e.target.value)}
          options={[
            { value: '', label: 'All Garment Types' },
            ...garmentTypes.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
        )}
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
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{design.name}</h3>
                    {design.is_locked ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        In orders
                      </span>
                    ) : null}
                  </div>
                  {showGarmentTypes && design.garment_type?.name && (
                    <p className="text-sm text-slate-500">{design.garment_type.name}</p>
                  )}
                  <p className="mt-1 font-medium text-brand-600">{formatCurrency(design.base_price, currency)}</p>
                  {design.is_locked ? (
                    <p className="mt-2 text-xs text-slate-500">Linked to {design.orders_count} order(s) — cannot edit or delete</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(design)}>
                        <Pencil size={14} />
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(design.id)}>Delete</Button>
                    </div>
                  )}
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Design' : 'Add Design'}>
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" placeholder="e.g. Embroidered Shalwar Kameez" value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); clearField('name') }} error={fieldErrors.name} required />
          {showGarmentTypes && (
          <Select label="Garment Type" value={form.garment_type_id} onChange={(e) => setForm((f) => ({ ...f, garment_type_id: e.target.value }))}
            placeholder="Select garment type..."
            options={[{ value: '', label: 'Select...' }, ...garmentTypes.map((t) => ({ value: t.id, label: t.name }))]} />
          )}
          <Input label="Base Price" type="number" step="0.01" placeholder="e.g. 3500" value={form.base_price} onChange={(e) => { setForm((f) => ({ ...f, base_price: e.target.value })); clearField('base_price') }} error={fieldErrors.base_price} />
          <Textarea label="Description" placeholder="Design details (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          <ImageUploadField file={image} onChange={setImage} existingUrl={editing?.image_url} />
          {(error || formError) && <p className="text-sm text-red-600">{error || formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Save Design'}</Button>
          </div>
        </form>
      </Modal>
      </div>
    </PageScroll>
  )
}
