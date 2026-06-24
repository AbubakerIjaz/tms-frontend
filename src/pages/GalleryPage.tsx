import { useCallback, useEffect, useState } from 'react'
import { Plus, Image, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { DEFAULT_PAGE_SIZE, defaultPaginationMeta, listingQueryParams, metaFromPaginated, useDateRangeFilter, useDebouncedSearch } from '../lib/listing'
import type { Category, GalleryItem, Paginated } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { EmptyState, LoadingSpinner } from '../components/ui/Badge'

export function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta())
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category_id: '' })
  const [image, setImage] = useState<File | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<Paginated<GalleryItem>>('/gallery', {
        params: listingQueryParams(page, perPage, dateRange, {
          category_id: categoryFilter,
          search: searchQuery,
        }),
      }),
      api.get<Category[]>('/categories'),
    ]).then(([itemsRes, catsRes]) => {
      setItems(itemsRes.data.data)
      setMeta(metaFromPaginated(itemsRes.data))
      setCategories(catsRes.data)
    }).finally(() => setLoading(false))
  }, [page, perPage, dateRange, categoryFilter, searchQuery])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [categoryFilter, searchQuery, dateRange.from, dateRange.to])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!image) { setError('Please select an image'); return }
    setSaving(true)
    setError('')
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description)
    if (form.category_id) fd.append('category_id', form.category_id)
    fd.append('image', image)
    try {
      await api.post('/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setModalOpen(false)
      setForm({ title: '', description: '', category_id: '' })
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
    if (!confirm('Delete this gallery item?')) return
    await api.delete(`/gallery/${id}`)
    load()
  }

  return (
    <PageScroll>
      <div className="space-y-4 pb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-heading">Design Gallery</h2>
          <p className="page-subtitle">
            {meta.total > 0 ? `${meta.total} items` : 'Upload and showcase your work by category'}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setModalOpen(true)}><Plus size={18} /> Upload Design</Button>
      </div>

      <ListingToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateLabel="Upload date"
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: 'Search title or description...',
        }}
      >
        <Select
          className="w-52"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </ListingToolbar>

      {loading && items.length === 0 ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <Card><EmptyState icon={<Image size={48} />} title="No gallery items" description="Adjust filters or upload your first design" /></Card>
      ) : (
        <Card>
          <div className={`grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
            {items.map((item) => (
              <div key={item.id} className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <div className="relative aspect-square">
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute right-2 top-2 rounded-lg bg-red-600 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-medium">{item.title}</h3>
                  {item.category && (
                    <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{item.category.name}</span>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload to Gallery">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <Select label="Category" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            options={[{ value: '', label: 'Select category...' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image *</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="text-sm" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Uploading...' : 'Upload'}</Button>
          </div>
        </form>
      </Modal>
      </div>
    </PageScroll>
  )
}
