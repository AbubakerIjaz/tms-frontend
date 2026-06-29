import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { resolveClientOrder } from '../lib/navigation'
import { createOrderReadyWhatsAppPrompt } from '../lib/orderWhatsAppNotifications'
import { isWhatsAppEnabled } from '../lib/whatsappSettings'
import { sanitizePkPhoneNumber } from '../lib/whatsapp'
import { useSetPageBreadcrumbs } from '../context/BreadcrumbContext'
import { useAuth } from '../context/AuthContext'
import { useShopFeatures } from '../hooks/useShopFeatures'
import { useToast } from '../context/ToastContext'
import type { Client, Order } from '../types'
import type { StitchingPresets, StitchingSize } from '../types/stitching'
import {
  SectionsEditor,
  payloadToSections,
  sectionsToPayload,
  type MeasurementSection,
} from '../components/DynamicFieldsEditor'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { formatCurrency, formatDate, LoadingSpinner } from '../components/ui/Badge'
import {
  WhatsAppOrderMessageModal,
  type WhatsAppOrderPrompt,
} from '../components/WhatsAppOrderMessageModal'
import { OrderDetailModal } from '../components/OrderDetailModal'
import { ColumnVisibility } from '../components/ui/ColumnVisibility'
import { DataTable, ListingTableCard } from '../components/ui/DataTable'
import { useTableColumns } from '../hooks/useTableColumns'
import { createOrderTableColumns } from '../components/tables/ordersTable'
import { VoiceMeasurementPanel } from '../components/VoiceMeasurementPanel'
import { useZodForm } from '../hooks/useZodForm'
import {
  clientFormSchema,
  GENDER_OPTIONS_WITH_PLACEHOLDER,
  paymentAmountSchema,
  stitchingFormSchema,
  type ClientFormValues,
} from '../lib/validation'

const emptyForm = () => ({
  label: '',
  standard_size: '',
  measured_at: new Date().toISOString().split('T')[0],
  notes: '',
  sections: [{ name: 'Kameez', rows: [{ key: '', value: '' }] }] as MeasurementSection[],
})

const emptyClientForm = () => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  gender: '',
  notes: '',
})

export function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { isModuleEnabled } = useShopFeatures()
  const { toast, confirm } = useToast()
  const unit = user?.shop?.measurement_unit || 'inch'
  const currency = user?.shop?.currency || 'PKR'
  const shop = user?.shop
  const whatsAppEnabled = isWhatsAppEnabled(shop)
  const [client, setClient] = useState<Client | null>(null)
  const [presets, setPresets] = useState<StitchingPresets | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StitchingSize | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [paymentModal, setPaymentModal] = useState<Order | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [whatsAppPrompt, setWhatsAppPrompt] = useState<WhatsAppOrderPrompt | null>(null)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [openInEditMode, setOpenInEditMode] = useState(false)
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [clientForm, setClientForm] = useState(emptyClientForm())
  const [clientSaving, setClientSaving] = useState(false)
  const [clientDeleting, setClientDeleting] = useState(false)
  const [clientError, setClientError] = useState('')
  const clientValidation = useZodForm(clientFormSchema)
  const stitchingValidation = useZodForm(stitchingFormSchema)
  const paymentValidation = useZodForm(paymentAmountSchema)

  async function load() {
    setLoading(true)
    try {
      const [clientRes, presetsRes] = await Promise.all([
        api.get<Client>(`/clients/${id}`),
        api.get<StitchingPresets>('/stitching-sizes/presets'),
      ])
      setClient(clientRes.data)
      setPresets(presetsRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!client) return

    const orderId = searchParams.get('order')
    if (!orderId) {
      setViewOrder(null)
      return
    }

    const resolved = resolveClientOrder(client.orders, orderId, client)
    if (resolved) {
      setViewOrder(resolved)
      return
    }

    api.get<Order>(`/orders/${orderId}`)
      .then((res) => setViewOrder({ ...res.data, client: res.data.client ?? client }))
      .catch(() => {
        const next = new URLSearchParams(searchParams)
        next.delete('order')
        setSearchParams(next, { replace: true })
      })
  }, [client, searchParams, setSearchParams])

  const sizes = client?.stitching_sizes ?? []

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setError('')
    setModalOpen(true)
  }

  function openEdit(record: StitchingSize) {
    setEditing(record)
    setForm({
      label: record.label || '',
      standard_size: record.standard_size || '',
      measured_at: record.measured_at.split('T')[0],
      notes: record.notes || '',
      sections: payloadToSections(record.sections),
    })
    setError('')
    setModalOpen(true)
  }

  function applyPreset(size: string) {
    if (!presets?.size_presets[size]) return
    setForm((f) => ({
      ...f,
      standard_size: size,
      sections: payloadToSections(presets.size_presets[size]),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validated = stitchingValidation.validate({
      label: form.label,
      standard_size: form.standard_size,
      measured_at: form.measured_at,
      notes: form.notes,
    })
    if (!validated) return

    setSaving(true)
    setError('')

    const sections = sectionsToPayload(form.sections)
    if (sections.length === 0) {
      setError('Add at least one field with a name and value.')
      setSaving(false)
      return
    }

    const payload = {
      client_id: id,
      label: form.label || null,
      standard_size: form.standard_size || null,
      measured_at: validated.measured_at,
      notes: form.notes || null,
      sections,
    }

    try {
      if (editing) {
        await api.put(`/stitching-sizes/${editing.id}`, payload)
      } else {
        await api.post('/stitching-sizes', payload)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function openClientEdit() {
    if (!client) return
    setClientForm({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      gender: client.gender || '',
      notes: client.notes || '',
    })
    clientValidation.clearErrors()
    setClientError('')
    setClientModalOpen(true)
  }

  function updateClientField<K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) {
    setClientForm((f) => ({ ...f, [field]: value }))
    clientValidation.clearField(field)
  }

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!client) return
    const data = clientValidation.validate(clientForm)
    if (!data) return
    setClientSaving(true)
    setClientError('')
    try {
      const res = await api.put<Client>(`/clients/${client.id}`, data)
      setClient(res.data)
      setClientModalOpen(false)
    } catch (err) {
      setClientError(getErrorMessage(err))
    } finally {
      setClientSaving(false)
    }
  }

  async function handleClientDelete() {
    if (!client) return
    const ok = await confirm({
      title: `Delete ${client.name}?`,
      message: 'All measurements and orders for this client will also be removed.',
      confirmLabel: 'Delete client',
      variant: 'danger',
    })
    if (!ok) return
    setClientDeleting(true)
    try {
      await api.delete(`/clients/${client.id}`)
      toast.success('Client deleted')
      navigate('/clients')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setClientDeleting(false)
    }
  }

  function handleOrderUpdated(order: Order) {
    setViewOrder({ ...order, client: order.client ?? client ?? undefined })
    load()
  }

  function handleOrderDeleted() {
    setViewOrder(null)
    if (searchParams.get('order')) {
      const next = new URLSearchParams(searchParams)
      next.delete('order')
      setSearchParams(next, { replace: true })
    }
    load()
  }

  async function handleDelete(recordId: number) {
    const ok = await confirm({
      title: 'Delete measurement?',
      message: 'This measurement record will be permanently removed.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/stitching-sizes/${recordId}`)
      toast.success('Measurement deleted')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  function openOrderModal(order: Order) {
    setOpenInEditMode(false)
    setSearchParams({ order: String(order.id) }, { replace: true })
    api.get<Order>(`/orders/${order.id}`).then((res) => {
      setViewOrder({ ...res.data, client: res.data.client ?? client ?? undefined })
    })
  }

  function editOrderModal(order: Order) {
    setOpenInEditMode(true)
    setSearchParams({ order: String(order.id) }, { replace: true })
    api.get<Order>(`/orders/${order.id}`).then((res) => {
      setViewOrder({ ...res.data, client: res.data.client ?? client ?? undefined })
    })
  }

  function closeOrderModal() {
    setViewOrder(null)
    setOpenInEditMode(false)
    if (searchParams.get('order')) {
      const next = new URLSearchParams(searchParams)
      next.delete('order')
      setSearchParams(next, { replace: true })
    }
  }

  async function updateOrderStatus(order: Order, status: string) {
    await api.put(`/orders/${order.id}`, { status })
    const orderWithClient = { ...order, client: order.client ?? client ?? undefined }
    const prompt = createOrderReadyWhatsAppPrompt(orderWithClient, status, shop)
    if (prompt) setWhatsAppPrompt(prompt)
    if (viewOrder?.id === order.id) {
      setViewOrder({ ...orderWithClient, status: status as Order['status'] })
    }
    load()
  }

  function openWhatsAppPrompt(order: Order) {
    if (!client?.phone || !sanitizePkPhoneNumber(client.phone)) return
    setWhatsAppPrompt({
      kind: 'order_ready',
      order: { ...order, client: order.client ?? client },
      phone: client.phone,
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
    setError('')
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

  function openPaymentModal(order: Order) {
    setPaymentModal(order)
    setPaymentAmount(String(order.balance ?? 0))
    setError('')
  }

  const orderColumns = useMemo(
    () =>
      createOrderTableColumns({
        currency,
        shop,
        whatsAppEnabled,
        canWhatsApp: (order) =>
          order.status === 'ready' && Boolean(client?.phone && sanitizePkPhoneNumber(client.phone)),
        onOpenOrder: openOrderModal,
        onEditOrder: editOrderModal,
        onUpdateStatus: updateOrderStatus,
        onUpdatePaymentStatus: updatePaymentStatus,
        onWhatsApp: openWhatsAppPrompt,
        showClient: false,
        showPaid: true,
        showDesigns: isModuleEnabled('designs'),
        showGarmentTypes: isModuleEnabled('garmentTypes'),
      }),
    [currency, shop, whatsAppEnabled, client, isModuleEnabled],
  )

  const orderTable = useTableColumns(`client-orders-${id}`, orderColumns)

  const pageBreadcrumbs = useMemo(() => {
    if (!client) return null
    return [
      { label: 'Dashboard', labelUr: 'ڈیش بورڈ', to: '/' },
      { label: 'Clients', labelUr: 'گاہک', to: '/clients' },
      { label: client.name },
    ]
  }, [client])

  useSetPageBreadcrumbs(pageBreadcrumbs)

  if (loading) return <LoadingSpinner />
  if (!client) return <p>Client not found</p>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link to="/clients" className="shrink-0 rounded-lg p-2 hover:bg-slate-100" aria-label="Back to clients">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold sm:text-2xl">{client.name}</h2>
          <p className="truncate text-sm text-slate-500 sm:text-base">
            {[client.phone, client.email].filter(Boolean).join(' • ') || 'No contact info'}
          </p>
        </div>
      </div>

      {isModuleEnabled('voiceMeasurements') && client && (
        <VoiceMeasurementPanel
          defaultClientId={client.id}
          defaultClientName={client.name}
          compact
          onSaved={load}
        />
      )}

      <div className={`grid gap-6 ${isModuleEnabled('measurements') ? 'lg:grid-cols-3' : ''}`}>
        <Card className={isModuleEnabled('measurements') ? 'lg:col-span-1' : ''}>
          <CardHeader
            title="Client Info"
            action={
              <div className="flex gap-1">
                <button type="button" onClick={openClientEdit} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit client">
                  <Pencil size={16} />
                </button>
                <button type="button" onClick={handleClientDelete} disabled={clientDeleting} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete client">
                  <Trash2 size={16} />
                </button>
              </div>
            }
          />
          <CardBody className="space-y-2 text-sm">
            <p><span className="text-slate-500">Gender:</span> {client.gender || '—'}</p>
            <p><span className="text-slate-500">Address:</span> {client.address || '—'}</p>
            <p><span className="text-slate-500">Notes:</span> {client.notes || '—'}</p>
          </CardBody>
        </Card>

        {isModuleEnabled('measurements') && (
        <Card className="lg:col-span-2">
          <CardHeader
            title="Stitching Measurements"
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus size={16} /> Add Measurement
              </Button>
            }
          />
          <CardBody className="space-y-4">
            {sizes.length === 0 ? (
              <div className="py-8 text-center">
                <Ruler className="mx-auto mb-2 text-slate-300" size={40} />
                <p className="text-sm text-slate-500">No measurements recorded yet</p>
                <Button size="sm" className="mt-4" onClick={openCreate}>
                  <Plus size={16} /> Add first measurement
                </Button>
              </div>
            ) : (
              sizes.map((record) => (
                <div key={record.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Ruler size={16} className="text-brand-600" />
                        <span className="font-semibold text-slate-900">{record.label || 'Measurement'}</span>
                        {record.standard_size && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                            Size {record.standard_size}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{formatDate(record.measured_at)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(record)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => handleDelete(record.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {record.sections.map((section, i) => (
                      <div key={i} className="rounded-lg bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{section.name}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {Object.entries(section.measurements).map(([key, val]) => (
                            <div key={key} className="rounded bg-white px-2 py-1.5 text-sm">
                              <span className="text-slate-500">{key}:</span>{' '}
                              <span className="font-medium">{val} {unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
        )}
      </div>

      {isModuleEnabled('orders') && client.orders && client.orders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Orders & Payments</h3>
          <ListingTableCard
          columnControls={
            <ColumnVisibility
              columns={orderTable.columnMeta}
              visibility={orderTable.visibility}
              onToggle={orderTable.toggleColumn}
              onReset={orderTable.resetColumns}
              visibleCount={orderTable.visibleCount}
              totalCount={orderTable.totalCount}
            />
          }
        >
          <DataTable
            columns={orderTable.visibleColumns}
            data={client.orders}
            rowKey={(order) => order.id}
            minWidth={Math.max(720, orderTable.visibleCount * 110)}
          />
        </ListingTableCard>
        </div>
      )}

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment">
        <form noValidate onSubmit={recordPayment} className="space-y-4">
          <p className="text-sm text-slate-500">
            Order: {paymentModal?.order_number} — Balance: {formatCurrency(paymentModal?.balance ?? 0, currency)}
          </p>
          <Input label="Amount" type="number" step="0.01" placeholder="Enter amount received" value={paymentAmount} onChange={(e) => { setPaymentAmount(e.target.value); paymentValidation.clearField('amount') }} error={paymentValidation.fieldErrors.amount} required />
          {(error || paymentValidation.formError) && <p className="text-sm text-red-600">{error || paymentValidation.formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button>
          </div>
        </form>
      </Modal>

      {isModuleEnabled('measurements') && (
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Measurement' : 'Add Measurement'} size="xl">
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Label (optional)" placeholder="e.g. Wedding suit" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            <Input label="Measured Date" type="date" value={form.measured_at} onChange={(e) => { setForm((f) => ({ ...f, measured_at: e.target.value })); stitchingValidation.clearField('measured_at') }} error={stitchingValidation.fieldErrors.measured_at} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quick preset (optional)</label>
            <div className="flex gap-2">
              {(['S', 'M', 'L', 'XL'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => applyPreset(size)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    form.standard_size === size ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <SectionsEditor sections={form.sections} onChange={(sections) => setForm((f) => ({ ...f, sections }))} unit={unit} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          {(error || stitchingValidation.formError) && <p className="text-sm text-red-600">{error || stitchingValidation.formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Save Measurement'}</Button>
          </div>
        </form>
      </Modal>
      )}

      <OrderDetailModal
        order={viewOrder}
        currency={currency}
        open={!!viewOrder}
        onClose={closeOrderModal}
        startInEditMode={openInEditMode}
        onUpdated={handleOrderUpdated}
        onDeleted={handleOrderDeleted}
        onStatusChange={updateOrderStatus}
        onPaymentStatusChange={updatePaymentStatus}
        onRecordPayment={openPaymentModal}
      />

      <Modal open={clientModalOpen} onClose={() => setClientModalOpen(false)} title="Edit Client">
        <form noValidate onSubmit={handleClientSubmit} className="space-y-4">
          <Input label="Name" placeholder="e.g. Ahmad Khan" value={clientForm.name} onChange={(e) => updateClientField('name', e.target.value)} error={clientValidation.fieldErrors.name} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" placeholder="e.g. 0300 1234567" value={clientForm.phone} onChange={(e) => updateClientField('phone', e.target.value)} error={clientValidation.fieldErrors.phone} required />
            <Input label="Email" type="email" placeholder="e.g. name@example.com" value={clientForm.email} onChange={(e) => updateClientField('email', e.target.value)} error={clientValidation.fieldErrors.email} />
          </div>
          <Select
            label="Gender"
            value={clientForm.gender}
            onChange={(e) => updateClientField('gender', e.target.value as ClientFormValues['gender'])}
            error={clientValidation.fieldErrors.gender}
            required
            placeholder="Select gender..."
            options={[...GENDER_OPTIONS_WITH_PLACEHOLDER]}
          />
          <Input label="Address" placeholder="Street, area, city" value={clientForm.address} onChange={(e) => updateClientField('address', e.target.value)} />
          <Textarea label="Notes" placeholder="Any extra details about this client" value={clientForm.notes} onChange={(e) => updateClientField('notes', e.target.value)} rows={3} />
          {(clientError || clientValidation.formError) && <p className="text-sm text-red-600">{clientError || clientValidation.formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setClientModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={clientSaving}>{clientSaving ? 'Saving…' : 'Save changes'}</Button>
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
  )
}
