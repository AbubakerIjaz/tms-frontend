import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ExternalLink, Phone, Ruler, User } from 'lucide-react'
import { api } from '../lib/api'
import {
  DEFAULT_PAGE_SIZE,
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
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { EmptyState, formatDate, LoadingSpinner } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'

function sectionFieldCount(record: StitchingSize): number {
  return record.sections.reduce(
    (sum, section) => sum + Object.keys(section.measurements).length,
    0,
  )
}

export function MeasurementsPage() {
  const { user } = useAuth()
  const { isModuleEnabled, showUrduLabels } = useShopFeatures()
  const unit = user?.shop?.measurement_unit ?? 'inch'
  const [records, setRecords] = useState<StitchingSize[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta())
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<StitchingSize | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api
      .get<Paginated<StitchingSize>>('/stitching-sizes', {
        params: listingQueryParams(page, perPage, dateRange, { search: searchQuery }),
      })
      .then((res) => {
        setRecords(res.data.data)
        setMeta(metaFromPaginated(res.data))
      })
      .finally(() => setLoading(false))
  }, [page, perPage, dateRange, searchQuery])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, dateRange.from, dateRange.to])

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
            <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {records.map((record) => {
                const fieldCount = sectionFieldCount(record)
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelected(record)}
                    className="card-premium group flex flex-col rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <Ruler size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {record.label || 'Measurement'}
                          </p>
                          <p className="text-xs text-slate-400">{formatDate(record.measured_at)}</p>
                        </div>
                      </div>
                      {record.standard_size && (
                        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          Size {record.standard_size}
                        </span>
                      )}
                    </div>

                    <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-600">
                      <User size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate font-medium">
                        {record.client?.name || 'Unknown client'}
                      </span>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {record.sections.slice(0, 3).map((section, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                        >
                          {section.name}
                        </span>
                      ))}
                      {record.sections.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          +{record.sections.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                      <span>
                        {record.sections.length} section{record.sections.length === 1 ? '' : 's'} · {fieldCount} field
                        {fieldCount === 1 ? '' : 's'}
                      </span>
                      <span className="font-medium text-brand-600 group-hover:underline">View details</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n)
                setPage(1)
              }}
            />
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

            <div className="grid gap-3 sm:grid-cols-2">
              {selected.sections.map((section, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {section.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(section.measurements).map(([key, val]) => (
                      <div key={key} className="rounded-lg bg-slate-50 px-2.5 py-2">
                        <p className="text-xs text-slate-500">{key}</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {val} <span className="text-xs font-normal text-slate-400">{unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selected.notes && (
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="text-sm text-slate-700">{selected.notes}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Link
                to={`/clients/${selected.client_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                <ExternalLink size={15} />
                Open client profile
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </PageScroll>
  )
}
