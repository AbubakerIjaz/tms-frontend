import { Link } from 'react-router-dom'
import { Badge, formatCurrency, formatDate } from './ui/Badge'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Select } from './ui/Select'
import type { Order } from '../types'

interface OrderDetailModalProps {
  order: Order | null
  currency: string
  open: boolean
  onClose: () => void
  onPaymentStatusChange?: (order: Order, status: 'paid' | 'pending') => void
  onStatusChange?: (order: Order, status: string) => void
  onRecordPayment?: (order: Order) => void
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
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
  onPaymentStatusChange,
  onStatusChange,
  onRecordPayment,
}: OrderDetailModalProps) {
  if (!order) return null

  const balance = order.balance ?? Math.max(0, Number(order.total_amount) - Number(order.paid_amount))

  return (
    <Modal open={open} onClose={onClose} title={`Order ${order.order_number}`} size="lg">
      <div className="space-y-6">
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

        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="space-y-3 p-4">
            <DetailRow label="Client">
              {order.client_id ? (
                <Link
                  to={`/clients/${order.client_id}`}
                  className="text-brand-600 hover:text-brand-800 hover:underline"
                >
                  {order.client?.name || '—'}
                </Link>
              ) : (
                order.client?.name || '—'
              )}
            </DetailRow>
            <DetailRow label="Design">{order.design?.name || '—'}</DetailRow>
            <DetailRow label="Garment">{order.garment_type?.name || '—'}</DetailRow>
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

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          {balance > 0 && onRecordPayment && order.payment_status !== 'paid' && (
            <Button variant="secondary" onClick={() => onRecordPayment(order)}>
              Record payment
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
