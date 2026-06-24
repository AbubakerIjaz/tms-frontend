import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { resolveClientOrder } from '../lib/navigation'
import { createOrderReadyWhatsAppPrompt } from '../lib/orderWhatsAppNotifications'
import { isWhatsAppEnabled } from '../lib/whatsappSettings'
import { sanitizePkPhoneNumber } from '../lib/whatsapp'
import { useAuth } from '../context/AuthContext'
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
import { OrderRowActions } from '../components/OrderRowActions'
import {
  WhatsAppOrderMessageModal,
  type WhatsAppOrderPrompt,
} from '../components/WhatsAppOrderMessageModal'
import { OrderDetailModal } from '../components/OrderDetailModal'

const emptyForm = () => ({
  label: '',
  standard_size: '',
  measured_at: new Date().toISOString().split('T')[0],
  notes: '',
  sections: [{ name: 'Kameez', rows: [{ key: '', value: '' }] }] as MeasurementSection[],
})

export function ClientDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
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
      measured_at: form.measured_at,
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

  async function handleDelete(recordId: number) {
    if (!confirm('Delete this measurement record?')) return
    await api.delete(`/stitching-sizes/${recordId}`)
    load()
  }

  function openOrderModal(order: Order) {
    setViewOrder({ ...order, client: order.client ?? client ?? undefined })
    setSearchParams({ order: String(order.id) }, { replace: true })
  }

  function closeOrderModal() {
    setViewOrder(null)
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
    setSaving(true)
    setError('')
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

  function openPaymentModal(order: Order) {
    setPaymentModal(order)
    setPaymentAmount(String(order.balance ?? 0))
    setError('')
  }

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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Client Info" />
          <CardBody className="space-y-2 text-sm">
            <p><span className="text-slate-500">Gender:</span> {client.gender || '—'}</p>
            <p><span className="text-slate-500">Address:</span> {client.address || '—'}</p>
            <p><span className="text-slate-500">Notes:</span> {client.notes || '—'}</p>
          </CardBody>
        </Card>

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
      </div>

      {client.orders && client.orders.length > 0 && (
        <Card>
          <CardHeader title="Orders & Payments" />
          <CardBody className="!p-0">
            <div className="table-scroll-hint">
              <table className="table-premium w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Order #</th>
                    <th className="px-5 py-3">Design</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Balance</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {client.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => openOrderModal(order)}
                          className="text-brand-600 hover:text-brand-800 hover:underline"
                        >
                          {order.order_number}
                        </button>
                      </td>
                      <td className="px-5 py-3">{order.design?.name || order.garment_type?.name || '—'}</td>
                      <td className="px-5 py-3">
                        <Select
                          size="sm"
                          className="min-w-[120px]"
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order, e.target.value)}
                          searchable={false}
                          options={['pending', 'in_progress', 'ready', 'delivered', 'cancelled'].map((s) => ({
                            value: s,
                            label: s.replace('_', ' '),
                          }))}
                        />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">{formatCurrency(order.total_amount, currency)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{formatCurrency(order.paid_amount, currency)}</td>
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-amber-700">
                        {formatCurrency(order.balance ?? 0, currency)}
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
                      <td className="px-5 py-3 whitespace-nowrap">{formatDate(order.order_date)}</td>
                      <td className="px-5 py-3 text-right">
                        <OrderRowActions
                          order={order}
                          whatsAppEnabled={whatsAppEnabled}
                          canWhatsApp={
                            order.status === 'ready' &&
                            Boolean(client.phone && sanitizePkPhoneNumber(client.phone))
                          }
                          onWhatsApp={() => openWhatsAppPrompt(order)}
                          onPay={() => openPaymentModal(order)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment">
        <form onSubmit={recordPayment} className="space-y-4">
          <p className="text-sm text-slate-500">
            Order: {paymentModal?.order_number} — Balance: {formatCurrency(paymentModal?.balance ?? 0, currency)}
          </p>
          <Input label="Amount" type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Measurement' : 'Add Measurement'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Label (optional)" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            <Input label="Measured Date" type="date" value={form.measured_at} onChange={(e) => setForm((f) => ({ ...f, measured_at: e.target.value }))} required />
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Save Measurement'}</Button>
          </div>
        </form>
      </Modal>

      <OrderDetailModal
        order={viewOrder}
        currency={currency}
        open={!!viewOrder}
        onClose={closeOrderModal}
        onStatusChange={updateOrderStatus}
        onPaymentStatusChange={updatePaymentStatus}
        onRecordPayment={openPaymentModal}
      />

      <WhatsAppOrderMessageModal
        prompt={whatsAppPrompt}
        shop={shop}
        currency={currency}
        onClose={() => setWhatsAppPrompt(null)}
      />
    </div>
  )
}
