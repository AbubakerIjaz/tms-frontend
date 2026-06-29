import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ClipboardList } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
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
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { PageScroll } from '../components/ListingPageLayout'
import { EmptyState, formatCurrency, LoadingSpinner } from '../components/ui/Badge'
import {
  WhatsAppOrderMessageModal,
  type WhatsAppOrderPrompt,
} from '../components/WhatsAppOrderMessageModal'
import { ColumnVisibility } from '../components/ui/ColumnVisibility'
import { DataTable, ListingTableCard } from '../components/ui/DataTable'
import { useTableColumns } from '../hooks/useTableColumns'
import { createOrderTableColumns } from '../components/tables/ordersTable'
import { MultiImageUpload } from '../components/orders/MultiImageUpload'
import { OrderDetailModal } from '../components/OrderDetailModal'
import { OrderSuitItemsEditor, createDefaultSuitItems } from '../components/orders/OrderSuitItemsEditor'
import { appendOrderImagesToFormData, suitDraftsToPayload } from '../lib/orderForm'
import type { OrderSuitDraft } from '../types'
import { useZodForm } from '../hooks/useZodForm'
import { orderCreateFormSchema, paymentAmountSchema } from '../lib/validation'
import { useShopFeatures } from '../hooks/useShopFeatures'

export function OrdersPage() {
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
    client_id: '', total_amount: '', paid_amount: '',
    order_date: new Date().toISOString().split('T')[0], due_date: '', notes: '', record_payment: true,
  })
  const [suitItems, setSuitItems] = useState<OrderSuitDraft[]>(createDefaultSuitItems)
  const [orderImages, setOrderImages] = useState<File[]>([])
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [openInEditMode, setOpenInEditMode] = useState(false)
  const orderValidation = useZodForm(orderCreateFormSchema)
  const paymentValidation = useZodForm(paymentAmountSchema)
  const { isModuleEnabled } = useShopFeatures()
  const showDesigns = isModuleEnabled('designs')
  const showGarmentTypes = isModuleEnabled('garmentTypes')

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
    const requests: Promise<unknown>[] = [
      api.get<Paginated<Client>>('/clients', { params: { per_page: 200 } }),
    ]
    if (showDesigns) {
      requests.push(api.get<Paginated<Design>>('/designs', { params: { per_page: 200 } }))
    }
    if (showGarmentTypes) {
      requests.push(api.get<GarmentType[]>('/garment-types'))
    }
    const results = await Promise.all(requests)
    setClients((results[0] as { data: Paginated<Client> }).data.data)
    let i = 1
    if (showDesigns) {
      setDesigns((results[i++] as { data: Paginated<Design> }).data.data)
    } else {
      setDesigns([])
    }
    if (showGarmentTypes) {
      setGarmentTypes((results[i] as { data: GarmentType[] }).data)
    } else {
      setGarmentTypes([])
    }
    setSuitItems(createDefaultSuitItems())
    setOrderImages([])
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = orderValidation.validate(form)
    if (!data) return
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('client_id', data.client_id)
      fd.append('total_amount', data.total_amount)
      fd.append('paid_amount', data.paid_amount || '0')
      fd.append('order_date', data.order_date)
      if (data.due_date) fd.append('due_date', data.due_date)
      if (data.notes) fd.append('notes', data.notes)
      fd.append('record_payment', form.record_payment ? '1' : '0')

      const itemsPayload = suitDraftsToPayload(suitItems)
      fd.append('items', JSON.stringify(itemsPayload))

      if (suitItems[0]?.design_id) fd.append('design_id', suitItems[0].design_id)
      if (suitItems[0]?.garment_type_id) fd.append('garment_type_id', suitItems[0].garment_type_id)

      appendOrderImagesToFormData(fd, orderImages)

      const res = await api.post<Order>('/orders', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
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

  function openOrderModal(order: Order) {
    setOpenInEditMode(false)
    api.get<Order>(`/orders/${order.id}`).then((res) => setViewOrder(res.data))
  }

  function editOrderModal(order: Order) {
    setOpenInEditMode(true)
    api.get<Order>(`/orders/${order.id}`).then((res) => setViewOrder(res.data))
  }

  function closeOrderModal() {
    setViewOrder(null)
    setOpenInEditMode(false)
  }

  function handleOrderUpdated(order: Order) {
    setViewOrder(order)
    load()
  }

  function handleOrderDeleted() {
    setViewOrder(null)
    load()
  }

  async function updateStatus(order: Order, status: string) {
    await api.put(`/orders/${order.id}`, { status })
    const prompt = createOrderReadyWhatsAppPrompt(order, status, shop)
    if (prompt) setWhatsAppPrompt(prompt)
    if (viewOrder?.id === order.id) {
      setViewOrder({ ...viewOrder, status: status as Order['status'] })
    }
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
    if (viewOrder?.id === order.id) {
      setViewOrder({ ...viewOrder, payment_status: paymentStatus })
    }
    load()
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentModal) return
    const data = paymentValidation.validate({ amount: paymentAmount })
    if (!data) return
    setSaving(true)
    try {
      await api.post(`/orders/${paymentModal.id}/payment`, { amount: data.amount })
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

  const columns = useMemo(
    () =>
      createOrderTableColumns({
        currency,
        shop,
        whatsAppEnabled,
        canWhatsApp: (order) =>
          order.status === 'ready' &&
          Boolean(order.client?.phone && sanitizePkPhoneNumber(order.client.phone)),
        onOpenOrder: openOrderModal,
        onEditOrder: editOrderModal,
        onUpdateStatus: updateStatus,
        onUpdatePaymentStatus: updatePaymentStatus,
        onWhatsApp: openWhatsAppPrompt,
        showDesigns,
        showGarmentTypes,
      }),
    [currency, shop, whatsAppEnabled, viewOrder, showDesigns, showGarmentTypes],
  )

  const table = useTableColumns('orders', columns)

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

      <ListingTableCard
        loading={loading && orders.length > 0}
        columnControls={
          orders.length > 0 ? (
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
          loading && orders.length === 0 ? (
            <LoadingSpinner />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={48} />}
              title={hasFilters ? 'No orders match your filters' : 'No orders yet'}
              description={hasFilters ? 'Try adjusting search, status, or date range' : 'Create your first order to get started'}
            />
          ) : undefined
        }
        pagination={
          orders.length > 0 ? (
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
          data={orders}
          rowKey={(order) => order.id}
          minWidth={Math.max(720, table.visibleCount * 110)}
        />
      </ListingTableCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Order" size="lg">
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Client"
            searchable
            searchPlaceholder="Search clients..."
            placeholder="Select client..."
            value={form.client_id}
            onChange={(e) => { setForm((f) => ({ ...f, client_id: e.target.value })); orderValidation.clearField('client_id') }}
            error={orderValidation.fieldErrors.client_id}
            required
            options={[{ value: '', label: 'Select client...' }, ...clients.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ''}` }))]}
          />

          <OrderSuitItemsEditor
            items={suitItems}
            onChange={setSuitItems}
            designs={designs}
            garmentTypes={garmentTypes}
            showDesigns={showDesigns}
            showGarmentTypes={showGarmentTypes}
          />

          <MultiImageUpload files={orderImages} onChange={setOrderImages} label="Order reference photos" />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Total Amount" type="number" step="0.01" placeholder="e.g. 12000" value={form.total_amount} onChange={(e) => { setForm((f) => ({ ...f, total_amount: e.target.value })); orderValidation.clearField('total_amount') }} error={orderValidation.fieldErrors.total_amount} required />
            <Input label="Advance Paid" type="number" step="0.01" placeholder="e.g. 5000" value={form.paid_amount} onChange={(e) => { setForm((f) => ({ ...f, paid_amount: e.target.value })); orderValidation.clearField('paid_amount') }} error={orderValidation.fieldErrors.paid_amount} />
            <Input label="Order Date" type="date" value={form.order_date} onChange={(e) => { setForm((f) => ({ ...f, order_date: e.target.value })); orderValidation.clearField('order_date') }} error={orderValidation.fieldErrors.order_date} required />
          </div>
          <Input label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          <Textarea label="Notes" placeholder="Special instructions for this order" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.record_payment} onChange={(e) => setForm((f) => ({ ...f, record_payment: e.target.checked }))} />
            Record advance payment in accounts
          </label>
          {(error || orderValidation.formError) && <p className="text-sm text-red-600">{error || orderValidation.formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Order'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment">
        <form noValidate onSubmit={recordPayment} className="space-y-4">
          <p className="text-sm text-slate-500">Order: {paymentModal?.order_number} — Balance: {formatCurrency(paymentModal?.balance ?? 0, currency)}</p>
          <Input label="Amount" type="number" step="0.01" placeholder="Enter amount received" value={paymentAmount} onChange={(e) => { setPaymentAmount(e.target.value); paymentValidation.clearField('amount') }} error={paymentValidation.fieldErrors.amount} required />
          {(error || paymentValidation.formError) && <p className="text-sm text-red-600">{error || paymentValidation.formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button>
          </div>
        </form>
      </Modal>

      <OrderDetailModal
        order={viewOrder}
        currency={currency}
        open={!!viewOrder}
        onClose={closeOrderModal}
        startInEditMode={openInEditMode}
        onUpdated={handleOrderUpdated}
        onDeleted={handleOrderDeleted}
        onStatusChange={updateStatus}
        onPaymentStatusChange={updatePaymentStatus}
        onRecordPayment={(order) => {
          setPaymentModal(order)
          setPaymentAmount(String(order.balance ?? 0))
        }}
      />

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
