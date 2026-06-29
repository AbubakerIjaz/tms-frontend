import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Shirt, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import {
  appendOrderImagesToFormData,
  appendOrderItemsToFormData,
  orderItemsToSuitDrafts,
} from '../lib/orderForm'
import type { Design, GarmentType, Order, OrderSuitDraft, Paginated } from '../types'
import { Badge, formatCurrency, formatDate } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'
import { Select } from './ui/Select'
import { Textarea } from './ui/Textarea'
import { MultiImageUpload } from './orders/MultiImageUpload'
import { OrderSuitItemsEditor } from './orders/OrderSuitItemsEditor'
import { useZodForm } from '../hooks/useZodForm'
import { orderUpdateFormSchema } from '../lib/validation'
import { useShopFeatures } from '../hooks/useShopFeatures'
import { useToast } from '../context/ToastContext'

interface OrderDetailModalProps {
  order: Order | null
  currency: string
  open: boolean
  onClose: () => void
  onUpdated?: (order: Order) => void
  onDeleted?: () => void
  onPaymentStatusChange?: (order: Order, status: 'paid' | 'pending') => void
  onStatusChange?: (order: Order, status: string) => void
  onRecordPayment?: (order: Order) => void
  startInEditMode?: boolean
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 sm:text-right">{children}</dd>
    </div>
  )
}

export function OrderDetailModal({
  order,
  currency,
  open,
  onClose,
  onUpdated,
  onDeleted,
  onPaymentStatusChange,
  onStatusChange,
  onRecordPayment,
  startInEditMode = false,
}: OrderDetailModalProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [designs, setDesigns] = useState<Design[]>([])
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [form, setForm] = useState({
    total_amount: '',
    paid_amount: '',
    order_date: '',
    due_date: '',
    delivery_date: '',
    notes: '',
    status: 'pending' as Order['status'],
    payment_status: 'pending' as Order['payment_status'],
  })
  const [suitItems, setSuitItems] = useState<OrderSuitDraft[]>([])
  const orderValidation = useZodForm(orderUpdateFormSchema)
  const { isModuleEnabled } = useShopFeatures()
  const showDesigns = isModuleEnabled('designs')
  const showGarmentTypes = isModuleEnabled('garmentTypes')
  const { toast, confirm } = useToast()

  useEffect(() => {
    if (!order || !open) return
    setError('')
    setNewImages([])
    setForm({
      total_amount: String(order.total_amount),
      paid_amount: String(order.paid_amount),
      order_date: order.order_date?.split('T')[0] ?? '',
      due_date: order.due_date?.split('T')[0] ?? '',
      delivery_date: order.delivery_date?.split('T')[0] ?? '',
      notes: order.notes ?? '',
      status: order.status,
      payment_status: order.payment_status || 'pending',
    })
    setSuitItems(orderItemsToSuitDrafts(order.items))

    if (startInEditMode) {
      void startEditing()
    } else {
      setEditing(false)
    }
  }, [order, open, startInEditMode])

  useEffect(() => {
    if (form.status !== 'delivered') return
    setSuitItems((items) =>
      items.map((item) => ({ ...item, design_id: '', design: null })),
    )
  }, [form.status])

  async function startEditing() {
    setEditing(true)
    setError('')
    const requests: Promise<unknown>[] = []
    if (showDesigns) {
      requests.push(api.get<Paginated<Design>>('/designs', { params: { per_page: 200 } }))
    }
    if (showGarmentTypes) {
      requests.push(api.get<GarmentType[]>('/garment-types'))
    }
    if (requests.length === 0) return
    const results = await Promise.all(requests)
    let i = 0
    if (showDesigns) {
      setDesigns((results[i++] as { data: Paginated<Design> }).data.data)
    }
    if (showGarmentTypes) {
      setGarmentTypes((results[i] as { data: GarmentType[] }).data)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    const data = orderValidation.validate(form)
    if (!data) return
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('total_amount', data.total_amount)
      fd.append('paid_amount', data.paid_amount || '0')
      fd.append('order_date', data.order_date)
      if (data.due_date) fd.append('due_date', data.due_date)
      if (data.delivery_date) fd.append('delivery_date', data.delivery_date)
      fd.append('notes', data.notes ?? '')
      fd.append('status', data.status)
      fd.append('payment_status', data.payment_status)
      appendOrderItemsToFormData(fd, suitItems)
      appendOrderImagesToFormData(fd, newImages)

      fd.append('_method', 'PUT')
      await api.post<Order>(`/orders/${order.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const full = await api.get<Order>(`/orders/${order.id}`)
      onUpdated?.(full.data)
      setEditing(false)
      setNewImages([])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!order) return
    const ok = await confirm({
      title: `Delete order ${order.order_number}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete order',
      variant: 'danger',
    })
    if (!ok) return
    setDeleting(true)
    setError('')
    try {
      await api.delete(`/orders/${order.id}`)
      toast.success('Order deleted')
      onDeleted?.()
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  if (!order) return null

  const balance = order.balance ?? Math.max(0, Number(order.total_amount) - Number(order.paid_amount))
  const items = order.items ?? []
  const images = order.images ?? []

  return (
    <Modal open={open} onClose={onClose} title={`Order ${order.order_number}`} size="lg">
      {editing ? (
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <OrderSuitItemsEditor
            items={suitItems}
            onChange={setSuitItems}
            designs={designs}
            garmentTypes={garmentTypes}
            designsLocked={form.status === 'delivered'}
            showDesigns={showDesigns}
            showGarmentTypes={showGarmentTypes}
          />

          <MultiImageUpload files={newImages} onChange={setNewImages} label="Add more photos" />

          {images.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Existing photos</p>
              <div className="grid grid-cols-4 gap-2">
                {images.map((img) => (
                  <a key={img.id} href={img.image_url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border">
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Total amount" type="number" step="0.01" value={form.total_amount} onChange={(e) => { setForm((f) => ({ ...f, total_amount: e.target.value })); orderValidation.clearField('total_amount') }} error={orderValidation.fieldErrors.total_amount} required />
            <Input label="Paid amount" type="number" step="0.01" value={form.paid_amount} onChange={(e) => { setForm((f) => ({ ...f, paid_amount: e.target.value })); orderValidation.clearField('paid_amount') }} error={orderValidation.fieldErrors.paid_amount} />
            <Input label="Order date" type="date" value={form.order_date} onChange={(e) => { setForm((f) => ({ ...f, order_date: e.target.value })); orderValidation.clearField('order_date') }} error={orderValidation.fieldErrors.order_date} required />
            <Input label="Due date" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            <Input label="Delivery date" type="date" value={form.delivery_date} onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))} />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Order['status'] }))}
              options={['pending', 'in_progress', 'ready', 'delivered', 'cancelled'].map((s) => ({
                value: s,
                label: s.replace('_', ' '),
              }))}
            />
            <Select
              label="Payment status"
              value={form.payment_status}
              onChange={(e) => setForm((f) => ({ ...f, payment_status: e.target.value as 'paid' | 'pending' }))}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
              ]}
            />
          </div>

          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />

          {(error || orderValidation.formError) && <p className="text-sm text-red-600">{error || orderValidation.formError}</p>}

          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={16} />
              {deleting ? 'Deleting…' : 'Delete order'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={order.status} />
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  order.payment_status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Payment {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={startEditing}>
              <Pencil size={16} />
              Edit order
            </Button>
          </div>

          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="space-y-3 p-4">
              <DetailRow label="Client">
                {order.client_id ? (
                  <Link to={`/clients/${order.client_id}`} className="text-brand-600 hover:underline">
                    {order.client?.name || '—'}
                  </Link>
                ) : (
                  order.client?.name || '—'
                )}
              </DetailRow>
              {!items.length && (
                <>
                  {showDesigns && (
                    <DetailRow label="Design">{order.design?.name || '—'}</DetailRow>
                  )}
                  {showGarmentTypes && (
                    <DetailRow label="Garment">{order.garment_type?.name || '—'}</DetailRow>
                  )}
                </>
              )}
            </div>
            <div className="space-y-3 p-4">
              <DetailRow label="Total">{formatCurrency(order.total_amount, currency)}</DetailRow>
              <DetailRow label="Paid">{formatCurrency(order.paid_amount, currency)}</DetailRow>
              <DetailRow label="Balance">
                <span className={balance > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {formatCurrency(balance, currency)}
                </span>
              </DetailRow>
            </div>
            <div className="space-y-3 p-4">
              <DetailRow label="Order date">{formatDate(order.order_date)}</DetailRow>
              <DetailRow label="Due date">{formatDate(order.due_date)}</DetailRow>
              <DetailRow label="Delivery date">{formatDate(order.delivery_date)}</DetailRow>
            </div>
          </dl>

          {items.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Suits / pieces</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item, i) => (
                  <div key={item.id ?? i} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {item.label || `Piece ${i + 1}`}
                    </p>
                    {showDesigns && item.design ? (
                      <div className="flex items-center gap-3">
                        <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {item.design.image_url ? (
                            <img src={item.design.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-300">
                              <Shirt size={20} />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link to="/designs" className="font-medium text-brand-600 hover:underline">
                            {item.design.name}
                          </Link>
                          {showGarmentTypes && (
                            <p className="text-xs text-slate-500">{item.garment_type?.name || item.design.garment_type?.name}</p>
                          )}
                        </div>
                      </div>
                    ) : showGarmentTypes ? (
                      <p className="text-sm text-slate-500">{item.garment_type?.name || (showDesigns ? 'No design' : '—')}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Order photos</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img) => (
                  <a key={img.id} href={img.image_url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl border border-slate-200">
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
              <p className="text-sm text-slate-700">{order.notes}</p>
            </div>
          )}

          {(onStatusChange || onPaymentStatusChange) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {onStatusChange && (
                <Select
                  label="Order status"
                  value={order.status}
                  onChange={(e) => onStatusChange(order, e.target.value)}
                  options={['pending', 'in_progress', 'ready', 'delivered', 'cancelled'].map((s) => ({
                    value: s,
                    label: s.replace('_', ' '),
                  }))}
                />
              )}
              {onPaymentStatusChange && (
                <Select
                  label="Payment status"
                  value={order.payment_status || 'pending'}
                  onChange={(e) => onPaymentStatusChange(order, e.target.value as 'paid' | 'pending')}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                />
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={16} />
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
            <div className="flex gap-2">
              {balance > 0 && onRecordPayment && order.payment_status !== 'paid' && (
                <Button variant="secondary" onClick={() => onRecordPayment(order)}>Record payment</Button>
              )}
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
