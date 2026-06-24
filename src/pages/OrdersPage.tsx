import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, ClipboardList } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { clientOrderUrl } from '../lib/navigation'
import { createOrderCreatedWhatsAppPrompt, createOrderReadyWhatsAppPrompt } from '../lib/orderWhatsAppNotifications'
import { isWhatsAppEnabled } from '../lib/whatsappSettings'
import { sanitizePkPhoneNumber } from '../lib/whatsapp'
import { useAuth } from '../context/AuthContext'
import {
  DEFAULT_PAGE_SIZE,
  defaultPaginationMeta,
  listingQueryParams,
  metaFromPaginated,
  dateRangeFromSearchParams,
  useDateRangeFilter,
  useDebouncedSearch,
} from '../lib/listing'
import type { Client, Design, GarmentType, Order, Paginated } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { EmptyState, formatCurrency, formatDate, LoadingSpinner } from '../components/ui/Badge'
import { OrderRowActions } from '../components/OrderRowActions'
import {
  WhatsAppOrderMessageModal,
  type WhatsAppOrderPrompt,
} from '../components/WhatsAppOrderMessageModal'

export function OrdersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const currency = user?.shop?.currency || 'PKR'
  const shop = user?.shop
  const whatsAppEnabled = isWhatsAppEnabled(shop)
  const [orders, setOrders] = useState<Order[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta())
  const [clients, setClients] = useState<Client[]>([])
  const [designs, setDesigns] = useState<Design[]>([])
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([])
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [paymentFilter, setPaymentFilter] = useState(() => searchParams.get('payment_status') || '')
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter(dateRangeFromSearchParams(searchParams))
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentModal, setPaymentModal] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [whatsAppPrompt, setWhatsAppPrompt] = useState<WhatsAppOrderPrompt | null>(null)
  const [form, setForm] = useState({
    client_id: '', design_id: '', garment_type_id: '', total_amount: '', paid_amount: '',
    order_date: new Date().toISOString().split('T')[0], due_date: '', notes: '', record_payment: true,
  })

  const load = useCallback(() => {
    setLoading(true)
    api.get<Paginated<Order>>('/orders', {
      params: listingQueryParams(page, perPage, dateRange, {
        status: statusFilter,
        payment_status: paymentFilter,
        search: searchQuery,
      }),
    })
      .then((res) => {
        setOrders(res.data.data)
        setMeta(metaFromPaginated(res.data))
      })
      .finally(() => setLoading(false))
  }, [statusFilter, paymentFilter, searchQuery, page, perPage, dateRange])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, paymentFilter, searchQuery, dateRange.from, dateRange.to])

  async function openModal() {
    const [clientsRes, designsRes, typesRes] = await Promise.all([
      api.get<Paginated<Client>>('/clients'),
      api.get<Paginated<Design>>('/designs'),
      api.get<GarmentType[]>('/garment-types'),
    ])
    setClients(clientsRes.data.data)
    setDesigns(designsRes.data.data)
    setGarmentTypes(typesRes.data)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.post<Order>('/orders', { ...form, record_payment: form.record_payment })
      setModalOpen(false)
      const created = res.data
      const client = clients.find((c) => String(c.id) === form.client_id)
      const orderWithClient = { ...created, client: created.client ?? client }
      const prompt = createOrderCreatedWhatsAppPrompt(orderWithClient, shop)
      if (prompt) setWhatsAppPrompt(prompt)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(order: Order, status: string) {
    await api.put(`/orders/${order.id}`, { status })
    const prompt = createOrderReadyWhatsAppPrompt(order, status, shop)
    if (prompt) setWhatsAppPrompt(prompt)
    load()
  }

  function openWhatsAppPrompt(order: Order) {
    const phone = order.client?.phone
    if (!phone || !sanitizePkPhoneNumber(phone)) return
    setWhatsAppPrompt({
      kind: order.status === 'ready' ? 'order_ready' : 'order_created',
      order,
      phone,
    })
  }

  async function updatePaymentStatus(order: Order, paymentStatus: 'paid' | 'pending') {
    await api.patch(`/orders/${order.id}/payment-status`, { payment_status: paymentStatus })
    load()
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentModal) return
    setSaving(true)
    try {
      await api.post(`/orders/${paymentModal.id}/payment`, { amount: paymentAmount })
      setPaymentModal(null)
      setPaymentAmount('')
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const hasFilters = Boolean(
    searchQuery || statusFilter || paymentFilter || dateRange.from || dateRange.to,
  )

  return (
    <PageScroll>
      <div className="space-y-4 pb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-heading">Orders</h2>
          <p className="page-subtitle">
            {meta.total > 0 ? `${meta.total.toLocaleString()} orders` : 'Track tailoring orders and deliveries'}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openModal}><Plus size={18} /> New Order</Button>
      </div>

      <ListingToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateLabel="Order date"
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: 'Search order # or client name...',
        }}
      >
        <Select
          className="w-full sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Order Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'ready', label: 'Ready' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Select
          className="w-full sm:w-44"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          options={[
            { value: '', label: 'All Payments' },
            { value: 'pending', label: 'Payment Pending' },
            { value: 'paid', label: 'Payment Paid' },
          ]}
        />
      </ListingToolbar>

      <Card className="overflow-hidden">
        {loading && orders.length === 0 ? (
          <LoadingSpinner />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={48} />}
            title={hasFilters ? 'No orders match your filters' : 'No orders yet'}
            description={hasFilters ? 'Try adjusting search, status, or date range' : 'Create your first order to get started'}
          />
        ) : (
          <>
          <div className={`table-scroll-hint ${loading ? 'opacity-60' : ''}`}>
            <table className="table-premium w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Design</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Due</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => navigate(clientOrderUrl(order.client_id, order.id))}
                        className="text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        {order.order_number}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {order.client_id ? (
                        <Link
                          to={clientOrderUrl(order.client_id)}
                          className="font-medium text-slate-800 hover:text-brand-600"
                        >
                          {order.client?.name}
                        </Link>
                      ) : (
                        order.client?.name || '—'
                      )}
                    </td>
                    <td className="px-5 py-3">{order.design?.name || order.garment_type?.name || '—'}</td>
                    <td className="px-5 py-3">{formatCurrency(order.total_amount, currency)}</td>
                    <td className="px-5 py-3">{formatCurrency(order.balance ?? 0, currency)}</td>
                    <td className="px-5 py-3">{formatDate(order.due_date)}</td>
                    <td className="px-5 py-3">
                      <Select
                        size="sm"
                        className="min-w-[120px]"
                        value={order.status}
                        onChange={(e) => updateStatus(order, e.target.value)}
                        searchable={false}
                        options={['pending', 'in_progress', 'ready', 'delivered', 'cancelled'].map((s) => ({
                          value: s,
                          label: s.replace('_', ' '),
                        }))}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <Select
                        size="sm"
                        className="min-w-[110px]"
                        tone={order.payment_status === 'paid' ? 'success' : 'warning'}
                        value={order.payment_status || 'pending'}
                        onChange={(e) => updatePaymentStatus(order, e.target.value as 'paid' | 'pending')}
                        searchable={false}
                        options={[
                          { value: 'pending', label: 'Pending' },
                          { value: 'paid', label: 'Paid' },
                        ]}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <OrderRowActions
                        order={order}
                        whatsAppEnabled={whatsAppEnabled}
                        canWhatsApp={
                          order.status === 'ready' &&
                          Boolean(order.client?.phone && sanitizePkPhoneNumber(order.client.phone))
                        }
                        onWhatsApp={() => openWhatsAppPrompt(order)}
                        onPay={() => {
                          setPaymentModal(order)
                          setPaymentAmount(String(order.balance))
                        }}
                      />
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Order" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Client"
            searchable
            searchPlaceholder="Search clients..."
            placeholder="Select client..."
            value={form.client_id}
            onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
            required
            options={[{ value: '', label: 'Select client...' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Design"
              searchable
              value={form.design_id}
              onChange={(e) => setForm((f) => ({ ...f, design_id: e.target.value }))}
              options={[{ value: '', label: 'None' }, ...designs.map((d) => ({ value: d.id, label: d.name }))]}
            />
            <Select
              label="Garment Type"
              searchable
              value={form.garment_type_id}
              onChange={(e) => setForm((f) => ({ ...f, garment_type_id: e.target.value }))}
              options={[{ value: '', label: 'None' }, ...garmentTypes.map((t) => ({ value: t.id, label: t.name }))]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Total Amount" type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))} required />
            <Input label="Advance Paid" type="number" step="0.01" value={form.paid_amount} onChange={(e) => setForm((f) => ({ ...f, paid_amount: e.target.value }))} />
            <Input label="Order Date" type="date" value={form.order_date} onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))} required />
          </div>
          <Input label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.record_payment} onChange={(e) => setForm((f) => ({ ...f, record_payment: e.target.checked }))} />
            Record advance payment in accounts
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Order'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment">
        <form onSubmit={recordPayment} className="space-y-4">
          <p className="text-sm text-slate-500">Order: {paymentModal?.order_number} — Balance: {formatCurrency(paymentModal?.balance ?? 0, currency)}</p>
          <Input label="Amount" type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button>
          </div>
        </form>
      </Modal>

      <WhatsAppOrderMessageModal
        prompt={whatsAppPrompt}
        shop={shop}
        currency={currency}
        onClose={() => setWhatsAppPrompt(null)}
      />
      </div>
    </PageScroll>
  )
}
