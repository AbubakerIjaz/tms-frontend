import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { DEFAULT_PAGE_SIZE, defaultPaginationMeta, listingQueryParams, metaFromPaginated, useDateRangeFilter, useDebouncedSearch } from '../lib/listing'
import type { GarmentType, Paginated } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { LoadingSpinner } from '../components/ui/Badge'
import { useZodForm } from '../hooks/useZodForm'
import { garmentTypeFormSchema } from '../lib/validation'
import { useShopFeatures } from '../hooks/useShopFeatures'
import { useToast } from '../context/ToastContext'

export function GarmentTypesPage() {
  const [types, setTypes] = useState<GarmentType[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta())
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [fields, setFields] = useState([{ key: '', label: '' }])
  const { fieldErrors, formError, validate, clearField } = useZodForm(garmentTypeFormSchema)
  const { isModuleEnabled } = useShopFeatures()
  const { toast, confirm } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    api.get<Paginated<GarmentType>>('/garment-types', {
      params: listingQueryParams(page, perPage, dateRange, { search: searchQuery }),
    })
      .then((res) => {
        setTypes(res.data.data)
        setMeta(metaFromPaginated(res.data))
      })
      .finally(() => setLoading(false))
  }, [page, perPage, dateRange, searchQuery])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, dateRange.from, dateRange.to])

  function addField() {
    setFields((f) => [...f, { key: '', label: '' }])
  }

  function updateField(i: number, key: 'key' | 'label', value: string) {
    setFields((f) => f.map((field, idx) => idx === i ? { ...field, [key]: value } : field))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = validate({ name })
    if (!data) return
    setSaving(true)
    setError('')
    const measurement_fields = fields.filter((f) => f.key && f.label)
    try {
      await api.post('/garment-types', { name: data.name, measurement_fields })
      setModalOpen(false)
      setName('')
      setFields([{ key: '', label: '' }])
      setPage(1)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: 'Delete garment type?',
      message: 'This type and its measurement fields will be permanently removed.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/garment-types/${id}`)
      toast.success('Garment type deleted')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (!isModuleEnabled('garmentTypes')) {
    return <Navigate to="/" replace />
  }

  if (!isModuleEnabled('garmentTypes')) {
    return <Navigate to="/" replace />
  }

  return (
    <PageScroll>
      <div className="space-y-4 pb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-heading">Garment Types</h2>
          <p className="page-subtitle">
            {meta.total > 0 ? `${meta.total} types` : 'Define clothing types and measurement fields'}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setModalOpen(true)}><Plus size={18} /> Add Type</Button>
      </div>

      <ListingToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateLabel="Added date"
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: 'Search garment type name...',
        }}
      />

      {loading && types.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <div className={`grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
            {types.map((type) => (
              <Card key={type.id} className="!shadow-none">
                <CardHeader
                  title={type.name}
                  action={
                    <button onClick={() => handleDelete(type.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  }
                />
                <CardBody>
                  <div className="flex flex-wrap gap-1">
                    {type.measurement_fields?.map((f) => (
                      <span key={f.key} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{f.label}</span>
                    )) || <span className="text-sm text-slate-400">No fields defined</span>}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
          {types.length > 0 && (
            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
            />
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Garment Type" size="lg">
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); clearField('name') }} error={fieldErrors.name} placeholder="e.g. Suit, Kurta, Dress" required />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Measurement Fields</label>
              <Button type="button" size="sm" variant="secondary" onClick={addField}>Add Field</Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input placeholder="Key (e.g. chest)" value={field.key} onChange={(e) => updateField(i, 'key', e.target.value)} />
                  <Input placeholder="Label (e.g. Chest)" value={field.label} onChange={(e) => updateField(i, 'label', e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          {(error || formError) && <p className="text-sm text-red-600">{error || formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
      </div>
    </PageScroll>
  )
}
