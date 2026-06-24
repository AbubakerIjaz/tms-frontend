import { useCallback, useEffect, useState } from 'react'
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { DEFAULT_PAGE_SIZE, defaultPaginationMeta, listingQueryParams, metaFromPaginated, useDateRangeFilter, useDebouncedSearch } from '../lib/listing'
import type { Category, Paginated } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Card, CardBody } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { LoadingSpinner } from '../components/ui/Badge'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta())
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const load = useCallback(() => {
    setLoading(true)
    api.get<Paginated<Category>>('/categories', {
      params: listingQueryParams(page, perPage, dateRange, { search: searchQuery }),
    })
      .then((res) => {
        setCategories(res.data.data)
        setMeta(metaFromPaginated(res.data))
      })
      .finally(() => setLoading(false))
  }, [page, perPage, dateRange, searchQuery])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, dateRange.from, dateRange.to])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '' })
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '' })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form)
      } else {
        await api.post('/categories', form)
      }
      setModalOpen(false)
      setPage(1)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category?')) return
    await api.delete(`/categories/${id}`)
    load()
  }

  return (
    <PageScroll>
      <div className="space-y-4 pb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-heading">Categories</h2>
          <p className="page-subtitle">
            {meta.total > 0 ? `${meta.total} categories` : 'Organize gallery designs by category'}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate}><Plus size={18} /> Add Category</Button>
      </div>

      <ListingToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateLabel="Added date"
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: 'Search category name or description...',
        }}
      />

      {loading && categories.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <div className={`grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
            {categories.map((cat) => (
              <Card key={cat.id} className="!shadow-none">
                <CardBody className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-brand-50 p-2 text-brand-600"><FolderOpen size={20} /></div>
                    <div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="text-sm text-slate-500">{cat.gallery_items_count ?? 0} items</p>
                      {cat.description && <p className="mt-1 text-sm text-slate-400">{cat.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(cat.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
          {categories.length > 0 && (
            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
            />
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          {error && <p className="text-sm text-red-600">{error}</p>}
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
