import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, Download } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import {
  defaultPaginationMeta,
  listingQueryParams,
  metaFromPaginated,
  useDateRangeFilter,
  useDebouncedSearch,
} from '../lib/listing'
import type { Client, Paginated } from '../types'
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

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta(20))
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sort, setSort] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', gender: '', notes: '' })

  const load = useCallback(() => {
    setLoading(true)
    api
      .get<Paginated<Client>>('/clients', {
        params: listingQueryParams(page, perPage, dateRange, {
          search: searchQuery,
          sort,
        }),
      })
      .then((res) => {
        setClients(res.data.data)
        setMeta(metaFromPaginated(res.data))
      })
      .finally(() => setLoading(false))
  }, [searchQuery, page, perPage, sort, dateRange])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, sort, dateRange.from, dateRange.to])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await api.get('/clients/export', {
        params: listingQueryParams(1, perPage, dateRange, { search: searchQuery }),
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clients-measurements-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/clients', form)
      setModalOpen(false)
      setForm({ name: '', phone: '', email: '', address: '', gender: '', notes: '' })
      setPage(1)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const genderLabel = (g: string | null) => {
    if (!g) return '—'
    return g.charAt(0).toUpperCase() + g.slice(1)
  }

  const hasFilters = Boolean(searchQuery || dateRange.from || dateRange.to)

  return (
    <PageScroll>
      <div className="space-y-4 pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-heading">Clients</h2>
            <p className="page-subtitle">
              {meta.total > 0 ? `${meta.total.toLocaleString()} clients` : 'Manage your customers and their measurements'}
            </p>
          </div>
          <div className="page-actions">
            <Button variant="secondary" onClick={handleExport} disabled={exporting}>
              <Download size={18} /> {exporting ? 'Exporting...' : 'Export Report'}
            </Button>
            <Button onClick={() => setModalOpen(true)}><Plus size={18} /> Add Client</Button>
          </div>
        </div>

        <ListingToolbar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          dateLabel="Added date"
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search name, phone, email, address...',
          }}
        >
          <Select
            className="w-full sm:w-48"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            options={[
              { value: 'latest', label: 'Newest first' },
              { value: 'name', label: 'Name A–Z' },
              { value: 'name_desc', label: 'Name Z–A' },
            ]}
          />
        </ListingToolbar>

        <Card className="overflow-hidden">
          {loading && clients.length === 0 ? (
            <LoadingSpinner />
          ) : clients.length === 0 ? (
            <EmptyState
              icon={<Users size={48} />}
              title={hasFilters ? 'No clients match your filters' : 'No clients yet'}
              description={hasFilters ? 'Try adjusting search or date range' : 'Add your first client to get started'}
            />
          ) : (
            <>
              <div className={`table-scroll-hint ${loading ? 'opacity-60' : ''}`}>
                <table className="table-premium w-full min-w-[800px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 w-12">#</th>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Phone</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Gender</th>
                      <th className="px-5 py-3 text-center">Orders</th>
                      <th className="px-5 py-3 text-center">Sizes</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map((client, index) => (
                      <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-slate-400">
                          {(meta.from ?? 1) + index}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link to={`/clients/${client.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                            {client.name}
                          </Link>
                          {client.address && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{client.address}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{client.phone || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-[180px] truncate">{client.email || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600">{genderLabel(client.gender)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex min-w-6 justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {client.orders_count ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex min-w-6 justify-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                            {client.stitching_sizes_count ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <Link to={`/clients/${client.id}`}>
                            <Button size="sm" variant="secondary">View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
              />
            </>
          )}
        </Card>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Client">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              options={[
                { value: '', label: 'Select...' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Textarea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} />
            <Textarea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Client'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageScroll>
  )
}
