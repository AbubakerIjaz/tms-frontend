import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ExternalLink, Phone, Ruler, User } from 'lucide-react'
import { api } from '../lib/api'
import {
  defaultPaginationMeta,
  listingQueryParams,
  metaFromPaginated,
  useDateRangeFilter,
  useDebouncedSearch,
} from '../lib/listing'
import type { Paginated } from '../types'
import type { StitchingSize } from '../types/stitching'
import { useAuth } from '../context/AuthContext'
import { useShopFeatures } from '../hooks/useShopFeatures'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { PageScroll } from '../components/ListingPageLayout'
import { EmptyState, formatDate, LoadingSpinner } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { SectionsEditor, sectionsToPayload } from '../components/DynamicFieldsEditor'
import type { MeasurementSection } from '../components/DynamicFieldsEditor'
import { useZodForm } from '../hooks/useZodForm'
import { stitchingCreateSchema } from '../lib/validation/schemas'

const RECORD_CARD_COLORS = [
  '#eff6ff',
  '#ecfdf5',
  '#fef3c7',
  '#fff1f2',
  '#f5f3ff',
  '#fffbeb',
  '#eef2ff',
]

function sectionFieldCount(record: StitchingSize): number {
  return record.sections.reduce(
    (sum, section) => sum + Object.keys(section.measurements).length,
    0,
  )
}

function cardBackgroundColor(id: number) {
  return RECORD_CARD_COLORS[id % RECORD_CARD_COLORS.length]
}

function orderCounts(client?: StitchingSize['client']) {
  if (!client) {
    return null
  }

  return {
    total: client.total_orders_count ?? client.orders_count ?? 0,
    pending: client.pending_orders_count ?? 0,
    ready: client.ready_orders_count ?? 0,
    delivered: client.delivered_orders_count ?? 0,
    paid: client.paid_orders_count ?? 0,
    unpaid: client.unpaid_orders_count ?? 0,
  }
}

export function MeasurementsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isModuleEnabled, showUrduLabels, measurementCardColors } = useShopFeatures()
  const unit = user?.shop?.measurement_unit ?? 'inch'
  const [records, setRecords] = useState<StitchingSize[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta(20))
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter()
  const [page, setPage] = useState(1)
  const perPage = 20
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<StitchingSize | null>(null)
  const [clientMeasurements, setClientMeasurements] = useState<StitchingSize[] | null>(null)
  const [clientMeasurementsLoading, setClientMeasurementsLoading] = useState(false)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addForm, setAddForm] = useState({ client_id: '', label: '', standard_size: '', measured_at: new Date().toISOString().slice(0,10), sections: [{ name: 'Kameez', rows: [{ key: '', value: '' }] }] as MeasurementSection[] })
  const addValidation = useZodForm(stitchingCreateSchema)

  const canLoadMore = meta.current_page < meta.last_page

  const loadPage = useCallback(
    (pageToLoad: number) => {
      if (pageToLoad === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      api
        .get<Paginated<StitchingSize>>('/stitching-sizes', {
          params: listingQueryParams(pageToLoad, perPage, dateRange, { search: searchQuery }),
        })
        .then((res) => {
          setMeta(metaFromPaginated(res.data))
          setRecords((prev) =>
            pageToLoad === 1 ? res.data.data : [...prev, ...res.data.data],
          )
        })
        .finally(() => {
          if (pageToLoad === 1) {
            setLoading(false)
          } else {
            setLoadingMore(false)
          }
        })
    },
    [dateRange, perPage, searchQuery],
  )

  useEffect(() => {
    loadPage(page)
  }, [loadPage, page])

  useEffect(() => {
    if (!showAddModal) return
    // fetch clients and presets for the add modal
    api.get('/clients', { params: { per_page: 200, sort: 'name' } }).then((res) => setClients(res.data.data || res.data)).catch(() => setClients([]))
  }, [showAddModal])

  useEffect(() => {
    if (!selected) {
      setClientMeasurements(null)
      return
    }

    setClientMeasurementsLoading(true)
    api
      .get<Paginated<StitchingSize>>('/stitching-sizes', { params: { client_id: selected.client_id, per_page: 100 } })
      .then((res) => {
        const measurements = res.data.data.slice()
        measurements.sort((a, b) => (a.id === selected.id ? -1 : b.id === selected.id ? 1 : 0))
        setClientMeasurements(measurements)
      })
      .catch(() => setClientMeasurements(null))
      .finally(() => setClientMeasurementsLoading(false))
  }, [selected])

  useEffect(() => {
    setPage(1)
    setRecords([])
    setMeta(defaultPaginationMeta(20))
  }, [searchQuery, dateRange.from, dateRange.to])

  useEffect(() => {
    if (!bottomSentinelRef.current || loading || loadingMore || !canLoadMore) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((current) => Math.min(current + 1, meta.last_page))
      }
    }, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1,
    })

    observer.observe(bottomSentinelRef.current)
    return () => observer.disconnect()
  }, [bottomSentinelRef, loading, loadingMore, canLoadMore, meta.last_page])

  const hasFilters = Boolean(searchQuery || dateRange.from || dateRange.to)

  const totalFields = useMemo(
    () => (selected ? sectionFieldCount(selected) : 0),
    [selected],
  )

  if (!isModuleEnabled('measurements')) {
    return <Navigate to="/" replace />
  }

  return (
    <PageScroll>
      <div className="space-y-4 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md">
              <Ruler size={22} />
            </div>
            <div>
              <h2 className="page-heading">Measurements</h2>
              <p className="page-subtitle">
                {meta.total > 0
                  ? `${meta.total.toLocaleString()} measurement records`
                  : showUrduLabels
                    ? 'گاہکوں کے ناپ دیکھیں اور منظم کریں'
                    : 'View and manage client stitching measurements'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAddForm((f) => ({ ...f, measured_at: new Date().toISOString().slice(0, 10) }))
                addValidation.clearErrors()
                setAddError('')
                setShowAddModal(true)
              }}
            >
              Add Measurement
            </Button>
          </div>
        </div>

        <ListingToolbar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          dateLabel="Measured date"
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search client name or phone...',
          }}
        />

        {loading && records.length === 0 ? (
          <LoadingSpinner />
        ) : records.length === 0 ? (
          <EmptyState
            icon={<Ruler size={48} />}
            title={hasFilters ? 'No measurements match your filters' : 'No measurements yet'}
            description={
              hasFilters
                ? 'Try adjusting search or date range'
                : 'Add measurements from a client profile or use Voice Measurements'
            }
          />
        ) : (
          <>
            <div className="relative" aria-busy={loading || loadingMore}>
              <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
                {records.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelected(record)}
                    className="flex w-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left focus:outline-none hover:bg-white hover:border-slate-200"
                    style={measurementCardColors ? { backgroundColor: cardBackgroundColor(record.id) } : undefined}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/60 text-brand-600">
                          <Ruler size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{record.client?.name || 'Unknown client'}</p>
                          <p className="truncate text-xs text-slate-500">{record.label || 'Measurement'}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDate(record.measured_at)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {record.standard_size && (
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700">Size {record.standard_size}</span>
                        )}
                      </div>
                    </div>

                    {/* card simplified: only client, label, date, size */}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
                Showing {records.length.toLocaleString()} of {meta.total.toLocaleString()} measurements
                {loadingMore && ' — loading more...'}
              </div>
              <div ref={bottomSentinelRef} className="h-4" />
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.label || 'Measurement details'}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <User size={15} className="text-slate-400" />
                    <span className="font-semibold text-slate-900">
                      {selected.client?.name || 'Unknown client'}
                    </span>
                  </div>
                  {selected.client?.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Phone size={14} className="text-slate-400" />
                      {selected.client.phone}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">Measured on {formatDate(selected.measured_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {selected.standard_size && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                      Size {selected.standard_size}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {selected.sections.length} section{selected.sections.length === 1 ? '' : 's'} · {totalFields} field
                    {totalFields === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            {(() => {
              const counts = orderCounts(selected.client)
              if (!counts || counts.total === 0) return null

              return (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700">
                    Orders <span className="ml-auto text-slate-800">{counts.total}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    Pending <span className="ml-auto text-amber-900">{counts.pending}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    Paid <span className="ml-auto text-emerald-900">{counts.paid}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    Ready <span className="ml-auto text-slate-800">{counts.ready}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm font-semibold text-emerald-700">
                    Delivered <span className="ml-auto text-emerald-800">{counts.delivered}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    Unpaid <span className="ml-auto text-rose-800">{counts.unpaid}</span>
                  </div>
                </div>
              )
            })()}

            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Measurements for {selected.client?.name}</h4>
              {clientMeasurementsLoading ? (
                <LoadingSpinner />
              ) : clientMeasurements && clientMeasurements.length ? (
                <div className="space-y-3">
                  {clientMeasurements.map((m) => (
                    <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{m.label || 'Measurement'}</p>
                          <p className="text-xs text-slate-500">Measured on {formatDate(m.measured_at)}</p>
                        </div>
                        <div className="text-xs text-slate-500">{m.sections.length} section{m.sections.length === 1 ? '' : 's'}</div>
                      </div>
                      <div className="mt-2 grid gap-2">
                        {m.sections.map((s, i) => (
                          <div key={i} className="rounded-md bg-slate-50 p-2 text-sm">
                            <div className="mb-1 text-sm font-semibold text-brand-700">{s.name}</div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(s.measurements).map(([k, v]) => (
                                <div key={k} className="rounded-md bg-white/80 p-2 text-sm">
                                  <div className="text-slate-700 font-semibold">{k}</div>
                                  <div className="font-semibold text-slate-900">{v} {unit}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No measurements for this client.</p>
              )}
            </div>

            {selected.notes && (
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="text-sm text-slate-700">{selected.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2">
              <Link
                to={`/clients/${selected.client_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                <ExternalLink size={15} />
                Open client profile
              </Link>
              <Button
                variant="secondary"
                onClick={() => navigate(`/orders?create_order=1&client_id=${selected.client_id}`)}
              >
                Place order
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setAddError('') }}
        title="Add Measurement"
        size="lg"
      >
        <div className="space-y-4">
          {adding && <LoadingSpinner />}
          {addError && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{addError}</div>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Select
                label="Client"
                options={clients.map((c) => ({ value: String(c.id), label: `${c.name}${c.phone ? ` — ${c.phone}` : ''}` }))}
                value={addForm.client_id}
                onChange={(e) => { setAddForm((f) => ({ ...f, client_id: e.target.value })); addValidation.clearField('client_id') }}
                error={addValidation.fieldErrors.client_id}
                placeholder="Select a client"
                searchable
              />
            </div>
            <div>
              <Input
                label="Measured at"
                type="date"
                value={addForm.measured_at}
                disabled
                onChange={() => { /* disabled field kept for parity */ addValidation.clearField('measured_at') }}
                error={addValidation.fieldErrors.measured_at}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="Label"
                value={addForm.label}
                onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
                error={addValidation.fieldErrors.label}
                required
              />
            </div>
            <div>
              <Select
                label="Standard size"
                options={[{ value: '', label: 'None' }, { value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }, { value: 'XL', label: 'XL' }]}
                value={addForm.standard_size}
                onChange={(e) => setAddForm((f) => ({ ...f, standard_size: e.target.value }))}
                placeholder="None"
              />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <SectionsEditor
              sections={addForm.sections}
              onChange={(sections) => setAddForm((f) => ({ ...f, sections }))}
              unit={user?.shop?.measurement_unit}
              singleSection
            />
          </div>
          {(addValidation.fieldErrors.sections || addValidation.formError) && (
            <p className="text-sm text-red-600">{addValidation.fieldErrors.sections || addValidation.formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); setAddError(''); addValidation.clearErrors() }}>Cancel</Button>
            <Button onClick={async () => {
              setAddError('')
              const validated = addValidation.validate({
                client_id: addForm.client_id,
                label: addForm.label,
                standard_size: addForm.standard_size,
                measured_at: addForm.measured_at,
                sections: addForm.sections,
              })
              if (!validated) return
              const payload = {
                client_id: addForm.client_id,
                label: addForm.label || null,
                standard_size: addForm.standard_size || null,
                measured_at: addForm.measured_at,
                sections: sectionsToPayload(addForm.sections),
              }
              setAdding(true)
              try {
                await api.post('/stitching-sizes', payload)
                setShowAddModal(false)
                // reload first page
                loadPage(1)
              } catch (err) {
                const e: any = err
                setAddError(String(e?.response?.data?.message || e?.message || 'Failed to add measurement'))
              } finally {
                setAdding(false)
              }
            }}>Save</Button>
          </div>
        </div>
      </Modal>
    </PageScroll>
  )
}
