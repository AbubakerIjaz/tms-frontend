import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { EmptyState, LoadingSpinner } from '../components/ui/Badge'
import { ColumnVisibility } from '../components/ui/ColumnVisibility'
import { DataTable, ListingTableCard } from '../components/ui/DataTable'
import { useTableColumns } from '../hooks/useTableColumns'
import { createClientTableColumns } from '../components/tables/clientsTable'
import { useZodForm } from '../hooks/useZodForm'
import { clientFormSchema, GENDER_OPTIONS_WITH_PLACEHOLDER } from '../lib/validation'
import { useShopFeatures } from '../hooks/useShopFeatures'
import { useToast } from '../context/ToastContext'

const emptyClientForm = () => ({ name: '', phone: '', email: '', address: '', gender: '', notes: '' })

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
  const [form, setForm] = useState(emptyClientForm)
  const { fieldErrors, formError, validate, clearField, clearErrors } = useZodForm(clientFormSchema)
  const { isModuleEnabled } = useShopFeatures()
  const { toast } = useToast()

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

  function update(field: keyof ReturnType<typeof emptyClientForm>, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearField(field)
  }

  function openCreateModal() {
    clearErrors()
    setForm(emptyClientForm())
    setModalOpen(true)
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
      toast.success('Export downloaded')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = validate(form)
    if (!data) return
    setSaving(true)
    setError('')
    try {
      await api.post('/clients', data)
      setModalOpen(false)
      setForm(emptyClientForm())
      clearErrors()
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

  const columns = useMemo(
    () => createClientTableColumns({
      rowFrom: meta.from,
      genderLabel,
      showOrders: isModuleEnabled('orders'),
      showSizes: isModuleEnabled('measurements'),
    }),
    [meta.from, isModuleEnabled],
  )

  const table = useTableColumns('clients', columns)

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
            <Button onClick={openCreateModal}><Plus size={18} /> Add Client</Button>
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

        <ListingTableCard
          loading={loading && clients.length > 0}
          columnControls={
            clients.length > 0 ? (
              <ColumnVisibility
                columns={table.columnMeta}
                visibility={table.visibility}
                onToggle={table.toggleColumn}
                onReset={table.resetColumns}
                visibleCount={table.visibleCount}
                totalCount={table.totalCount}
              />
            ) : undefined
          }
          empty={
            loading && clients.length === 0 ? (
              <LoadingSpinner />
            ) : clients.length === 0 ? (
              <EmptyState
                icon={<Users size={48} />}
                title={hasFilters ? 'No clients match your filters' : 'No clients yet'}
                description={hasFilters ? 'Try adjusting search or date range' : 'Add your first client to get started'}
              />
            ) : undefined
          }
          pagination={
            clients.length > 0 ? (
              <Pagination
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
              />
            ) : undefined
          }
        >
          <DataTable
            columns={table.visibleColumns}
            data={clients}
            rowKey={(client) => client.id}
            rowStartIndex={meta.from ?? 1}
            minWidth={Math.max(640, table.visibleCount * 120)}
          />
        </ListingTableCard>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Client">
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" placeholder="e.g. Ahmad Khan" value={form.name} onChange={(e) => update('name', e.target.value)} error={fieldErrors.name} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" placeholder="e.g. 0300 1234567" value={form.phone} onChange={(e) => update('phone', e.target.value)} error={fieldErrors.phone} required />
              <Input label="Email" type="email" placeholder="e.g. name@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} error={fieldErrors.email} />
            </div>
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              error={fieldErrors.gender}
              required
              placeholder="Select gender..."
              options={[...GENDER_OPTIONS_WITH_PLACEHOLDER]}
            />
            <Textarea label="Address" placeholder="Street, area, city" value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} />
            <Textarea label="Notes" placeholder="Any extra details about this client" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
            {(error || formError) && <p className="text-sm text-red-600">{error || formError}</p>}
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
